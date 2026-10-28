-- Números de boleto únicos en toda la plataforma mientras estén activos.
-- Ejecuta primero VERIFICAR_BOLETOS.sql. Si detecta conflictos, se detiene sin borrar ni renumerar boletos.
-- Ejecutar completo en Supabase > SQL Editor. No es necesario reinstalar todo el esquema.
begin;

-- BEGIN GLOBAL TICKET UNIQUENESS
-- Un número identifica un solo boleto activo en TODA la plataforma.
-- Los ceros iniciales no cambian la identidad: 1, 0001 y 00001 son iguales.
-- Cancelados y reembolsados liberan el número. No se renumeran datos existentes.
lock table public.tickets in share row exclusive mode;

do $$ begin
  if exists (
    select 1 from public.tickets
    where status in ('pending_payment', 'confirmed', 'winner')
      and ticket_number !~ '^[0-9]{1,10}$'
  ) then
    raise exception 'Hay boletos activos con números inválidos. Ejecuta VERIFICAR_BOLETOS.sql antes de aplicar la protección global.';
  end if;
  if exists (
    select 1 from public.tickets
    where case when status in ('pending_payment', 'confirmed', 'winner')
      then ticket_number::numeric < 1 or ticket_number::numeric > 2147483647 else false end
  ) then
    raise exception 'Hay boletos activos fuera del rango numérico permitido. Ejecuta VERIFICAR_BOLETOS.sql.';
  end if;
  if exists (
    select 1 from public.tickets
    where status in ('pending_payment', 'confirmed', 'winner')
    group by ticket_number::bigint having count(*) > 1
  ) then
    raise exception 'Ya existen números de boleto repetidos en la plataforma. Ejecuta VERIFICAR_BOLETOS.sql y resuelve los casos antes de aplicar la protección global.';
  end if;
end $$;

create or replace function public.normalize_ticket_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.ticket_number is null or new.ticket_number !~ '^[0-9]{1,10}$' then
    raise exception 'Número de boleto inválido.';
  end if;
  if new.ticket_number::numeric < 1 or new.ticket_number::numeric > 2147483647 then
    raise exception 'Número de boleto inválido.';
  end if;
  new.ticket_number := lpad(new.ticket_number::bigint::text,
    greatest(5, length(new.ticket_number::bigint::text)), '0');
  return new;
end;
$$;

drop trigger if exists trg_normalize_ticket_number on public.tickets;
create trigger trg_normalize_ticket_number
  before insert or update of ticket_number on public.tickets
  for each row execute function public.normalize_ticket_number();

create unique index if not exists uq_tickets_number_active_global
  on public.tickets ((ticket_number::bigint))
  where (status in ('pending_payment', 'confirmed', 'winner'));
drop index if exists public.uq_tickets_raffle_number_active;
-- END GLOBAL TICKET UNIQUENESS

create or replace function public.reserve_ticket(
  p_raffle_id uuid,
  p_ticket_number text,
  p_price_paid numeric
)
returns public.tickets as $$
declare
  v_ticket public.tickets;
  v_raffle public.raffles;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para reservar un boleto.';
  end if;

  if not exists (select 1 from public.users where id = auth.uid() and status <> 'blocked') then
    raise exception 'Tu cuenta no está habilitada para comprar.';
  end if;

  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if v_raffle.status is distinct from 'active' then
    raise exception 'Esta rifa no está activa.';
  end if;

  if p_ticket_number is null or p_ticket_number !~ '^[0-9]{1,10}$'
     or p_ticket_number::numeric < 1 or p_ticket_number::numeric > 2147483647 then
    raise exception 'Número de boleto inválido.';
  end if;
  if not v_raffle.allow_sales_beyond_limit and (
    select count(*) from public.tickets
    where raffle_id = p_raffle_id and status in ('pending_payment', 'confirmed', 'winner')
  ) >= v_raffle.total_tickets then
    raise exception 'No quedan suficientes boletos disponibles en esta rifa.';
  end if;
  if p_price_paid is distinct from v_raffle.ticket_price then
    raise exception 'El precio del boleto no coincide con el de la rifa.';
  end if;
  p_ticket_number := lpad(p_ticket_number::integer::text,
    greatest(5, length(p_ticket_number::integer::text)), '0');

  insert into public.tickets (raffle_id, user_id, ticket_number, status, price_paid)
  values (p_raffle_id, auth.uid(), p_ticket_number, 'pending_payment', p_price_paid)
  returning * into v_ticket;

  return v_ticket;
exception
  when unique_violation then
    raise exception 'El boleto % ya fue reservado por otro usuario. Elige otro número.', p_ticket_number;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.submit_payment_report(
  p_raffle_id uuid,
  p_ticket_numbers text[],
  p_bonus_numbers text[],
  p_total_amount numeric,
  p_destination_bank text,
  p_reference_number text,
  p_sender_name text,
  p_sender_phone text,
  p_sender_email text,
  p_sender_cedula text,
  p_receipt_url text
)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_raffle public.raffles;
  v_report public.payment_reports;
  v_numbers text[];
  v_bonus text[];
  v_number text;
  v_paid_count integer;
  v_bonus_count integer;
  v_expected_bonus integer := 0;
  v_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para comprar boletos.';
  end if;
  if not exists (select 1 from public.users where id = auth.uid() and status <> 'blocked') then
    raise exception 'Tu cuenta no está habilitada para comprar.';
  end if;
  -- Serializa las compras de la misma rifa y conserva su precio durante el pedido.
  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if v_raffle.status is distinct from 'active' then
    raise exception 'Esta rifa no está activa.';
  end if;
  if coalesce(cardinality(p_ticket_numbers), 0) = 0 then
    raise exception 'Selecciona al menos un boleto.';
  end if;
  if exists (
    select 1 from unnest(p_ticket_numbers || coalesce(p_bonus_numbers, '{}'::text[])) n
    where n is null or n !~ '^[0-9]{1,10}$'
  ) then
    raise exception 'Hay números de boleto inválidos.';
  end if;
  if exists (
    select 1 from unnest(p_ticket_numbers || coalesce(p_bonus_numbers, '{}'::text[])) n
    where n::numeric < 1 or n::numeric > 2147483647
  ) then
    raise exception 'Hay números fuera del límite de la rifa.';
  end if;
  select array_agg(lpad(n::integer::text,
    greatest(5, length(n::integer::text)), '0') order by n::integer)
    into v_numbers from unnest(p_ticket_numbers) n;
  select coalesce(array_agg(lpad(n::integer::text,
    greatest(5, length(n::integer::text)), '0') order by n::integer), '{}'::text[])
    into v_bonus from unnest(coalesce(p_bonus_numbers, '{}'::text[])) n;

  if (select count(distinct n) from unnest(v_numbers) n) <> cardinality(v_numbers)
     or (select count(distinct n) from unnest(v_bonus) n) <> cardinality(v_bonus) then
    raise exception 'No puedes enviar números repetidos.';
  end if;
  if not (v_bonus <@ v_numbers) then
    raise exception 'Los boletos de promoción deben formar parte del pedido.';
  end if;
  v_bonus_count := cardinality(v_bonus);
  v_paid_count := cardinality(v_numbers) - v_bonus_count;
  if v_paid_count < 1 then
    raise exception 'El pedido debe incluir al menos un boleto de pago.';
  end if;
  if v_raffle.has_bonus_promotion and v_raffle.bonus_buy_threshold > 0 and v_raffle.bonus_free_tickets > 0 then
    v_expected_bonus := (v_paid_count / v_raffle.bonus_buy_threshold) * v_raffle.bonus_free_tickets;
  end if;
  if v_bonus_count > v_expected_bonus then
    raise exception 'La cantidad de boletos gratis supera la promoción de esta rifa.';
  end if;
  -- El límite de una rifa es su cantidad de boletos, no el valor del número global.
  if not v_raffle.allow_sales_beyond_limit and (
    select count(*) from public.tickets
    where raffle_id = p_raffle_id and status in ('pending_payment', 'confirmed', 'winner')
  ) + cardinality(v_numbers) > v_raffle.total_tickets then
    raise exception 'No quedan suficientes boletos disponibles en esta rifa.';
  end if;
  v_amount := v_paid_count * v_raffle.ticket_price;
  if p_total_amount is distinct from v_amount then
    raise exception 'El importe no coincide con el precio actual de los boletos.';
  end if;
  if nullif(trim(p_sender_name), '') is null or nullif(trim(p_sender_phone), '') is null
     or nullif(trim(p_reference_number), '') is null or nullif(trim(p_receipt_url), '') is null then
    raise exception 'Completa los datos del comprador, la referencia y el comprobante.';
  end if;
  if not exists (select 1 from public.bank_accounts where bank_name = p_destination_bank and is_active) then
    raise exception 'La cuenta bancaria seleccionada no está disponible.';
  end if;
  if split_part(p_receipt_url, '/', 1) <> auth.uid()::text or not exists (
    select 1 from storage.objects where bucket_id = 'payment-receipts' and name = p_receipt_url
  ) then
    raise exception 'El comprobante debe estar subido en tu carpeta de Storage.';
  end if;

  insert into public.payment_reports (
    raffle_id, user_id, sender_name, sender_phone, sender_email, sender_cedula,
    destination_bank, reference_number, amount, receipt_url
  ) values (
    p_raffle_id, auth.uid(), trim(p_sender_name), trim(p_sender_phone), p_sender_email, p_sender_cedula,
    p_destination_bank, trim(p_reference_number), v_amount, p_receipt_url
  ) returning * into v_report;

  foreach v_number in array v_numbers loop
    insert into public.tickets (
      raffle_id, user_id, ticket_number, price_paid, payment_report_id,
      is_bonus_ticket, bank_used, reference_number
    ) values (
      p_raffle_id, auth.uid(), v_number,
      case when v_number = any(v_bonus) then 0 else v_raffle.ticket_price end,
      v_report.id, v_number = any(v_bonus), p_destination_bank, trim(p_reference_number)
    );
  end loop;
  return to_jsonb(v_report) || jsonb_build_object(
    'raffles', jsonb_build_object('title', v_raffle.title),
    'tickets', (select jsonb_agg(jsonb_build_object('ticket_number', n)) from unnest(v_numbers) n)
  );
exception
  when unique_violation then
    raise exception 'Uno de los números ya está reservado o vendido en la plataforma. Actualiza la rifa y elige otro número.';
end;
$$;

create or replace function public.get_taken_ticket_numbers(p_raffle_id uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(t.ticket_number order by t.ticket_number::bigint), '{}'::text[])
  from public.tickets t
  where t.status in ('pending_payment', 'confirmed', 'winner')
    and exists (
      select 1 from public.raffles r where r.id = p_raffle_id
        and (r.status in ('active', 'closed', 'drawn') or public.is_admin())
    );
$$;

create or replace function public.get_ticket_number_availability(p_raffle_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'scope', 'platform',
    'minimumDigits', 5,
    'numbers', public.get_taken_ticket_numbers(p_raffle_id),
    'remainingTickets', case when r.allow_sales_beyond_limit then null else greatest(0,
      r.total_tickets - (select count(*) from public.tickets t
        where t.raffle_id = r.id and t.status in ('pending_payment', 'confirmed', 'winner')))
      end
  )
  from public.raffles r where r.id = p_raffle_id
    and (r.status in ('active', 'closed', 'drawn') or public.is_admin());
$$;

revoke all on function public.reserve_ticket(uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.submit_payment_report(uuid, text[], text[], numeric, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_payment_report(uuid, text[], text[], numeric, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.get_taken_ticket_numbers(uuid) from public;
grant execute on function public.get_taken_ticket_numbers(uuid) to anon, authenticated;
revoke all on function public.get_ticket_number_availability(uuid) from public;
grant execute on function public.get_ticket_number_availability(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
