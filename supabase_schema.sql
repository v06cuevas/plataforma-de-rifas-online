-- Fuente del esquema y permisos; instalación completa: SUPABASE_COMPLETO.sql

begin;
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. TIPOS (ENUMS)
-- -------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('client', 'admin', 'moderator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type user_status as enum ('active', 'blocked', 'vip');
exception when duplicate_object then null; end $$;

do $$ begin
  create type raffle_status as enum ('draft', 'active', 'paused', 'closed', 'drawn', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type ticket_status as enum ('pending_payment', 'confirmed', 'winner', 'cancelled', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type support_status as enum ('open', 'answered', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type media_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_target as enum ('client', 'admin', 'all');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('payment_confirmed', 'payment_rejected', 'draw_executed', 'support_reply', 'raffle_closing');
exception when duplicate_object then null; end $$;

do $$ begin
  create type audit_category as enum ('raffle', 'payment', 'draw', 'bank', 'user', 'support', 'auth');
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- 2. FUNCIÓN GENÉRICA PARA updated_at
-- -------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

-- -------------------------------------------------------------------------
-- 3. TABLA: users (perfil extendido — 1 a 1 con auth.users)
-- -------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text not null,
  cedula_or_id text,
  status user_status not null default 'active',
  role user_role not null default 'client',
  notes text,
  city text,
  joined_date timestamptz not null default now(),
  last_active timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
  before update on public.users
  for each row execute function set_updated_at();

-- Crea automáticamente el perfil cuando alguien se registra vía Supabase Auth.
-- El rol SIEMPRE se fuerza a 'client' aquí: nunca se puede crear un admin
-- desde el registro público. Los admins solo se promueven manualmente
-- (ver sección 12) o desde el panel por otro admin ya existente.
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, email, phone, cedula_or_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.raw_user_meta_data->>'cedula_or_id',
    'client'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Recupera perfiles faltantes de cuentas reales que existían antes del esquema.
insert into public.users (id, full_name, email, phone, cedula_or_id, role)
select id, coalesce(raw_user_meta_data->>'full_name', ''), email,
  coalesce(raw_user_meta_data->>'phone', ''), raw_user_meta_data->>'cedula_or_id', 'client'
from auth.users
where email is not null
on conflict (id) do nothing;

-- Helper usado en TODAS las políticas RLS para saber si quien consulta es admin.
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin' and status <> 'blocked'
  );
$$ language sql stable security definer set search_path = public;

-- -------------------------------------------------------------------------
-- 4. TABLA: bank_accounts
-- -------------------------------------------------------------------------
create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  bank_code text,
  account_number text not null,
  account_type text,
  beneficiary_name text,
  rnc_or_id text,
  logo_color text,
  bg_light text,
  badge_border text,
  short_instructions text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_bank_accounts_updated_at on public.bank_accounts;
create trigger trg_bank_accounts_updated_at
  before update on public.bank_accounts
  for each row execute function set_updated_at();

-- -------------------------------------------------------------------------
-- 5. TABLA: raffles
-- -------------------------------------------------------------------------
create table if not exists public.raffles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  category text,
  ticket_price numeric(12,2) not null check (ticket_price > 0),
  total_tickets integer not null check (total_tickets > 0),
  draw_date timestamptz,
  status raffle_status not null default 'draft',
  banner_url text,
  description text,
  prize_details text,
  rules text[] not null default '{}',
  legal_terms text,
  hide_remaining_tickets boolean not null default false,
  has_bonus_promotion boolean not null default false,
  bonus_buy_threshold integer,
  bonus_free_tickets integer,
  bonus_promotion_badge text,
  allow_sales_beyond_limit boolean not null default false,
  enable_draw_date boolean not null default true,
  custom_draw_date_text text,
  drawn_at timestamptz,
  winning_ticket_number text,
  winner_name text,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_raffles_updated_at on public.raffles;
-- También actualiza instalaciones creadas antes de incluir prize_details.
alter table public.raffles add column if not exists prize_details text;

create trigger trg_raffles_updated_at
  before update on public.raffles
  for each row execute function set_updated_at();

create index if not exists idx_raffles_status on public.raffles(status);

-- -------------------------------------------------------------------------
-- 6. TABLA: raffle_media (fotos y videos de cada rifa)
-- -------------------------------------------------------------------------
create table if not exists public.raffle_media (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  type media_type not null,
  url text not null,
  title text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_raffle_media_raffle on public.raffle_media(raffle_id);

-- -------------------------------------------------------------------------
-- 7. TABLA: payment_reports (comprobantes de transferencia reportados)
-- -------------------------------------------------------------------------
create table if not exists public.payment_reports (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id),
  user_id uuid not null references public.users(id),
  sender_name text not null,
  sender_phone text not null,
  sender_email text,
  sender_cedula text,
  destination_bank text not null,
  reference_number text not null,
  amount numeric(12,2) not null check (amount > 0),
  receipt_url text,
  status payment_status not null default 'pending',
  admin_notes text,
  reviewed_by uuid references public.users(id),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists idx_payment_reports_status on public.payment_reports(status);
create index if not exists idx_payment_reports_user on public.payment_reports(user_id);

-- Evita que el MISMO número de referencia se use en más de un pago ya
-- VERIFICADO (una referencia real de transferencia solo puede confirmar un pedido).
create unique index if not exists uq_payment_reports_verified_reference
  on public.payment_reports (destination_bank, reference_number)
  where (status = 'verified');

-- -------------------------------------------------------------------------
-- 8. TABLA: tickets
-- -------------------------------------------------------------------------
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id),
  user_id uuid not null references public.users(id),
  ticket_number text not null,
  status ticket_status not null default 'pending_payment',
  price_paid numeric(12,2) not null,
  bank_used text,
  reference_number text,
  payment_report_id uuid references public.payment_reports(id),
  is_bonus_ticket boolean not null default false,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists idx_tickets_raffle on public.tickets(raffle_id);
create index if not exists idx_tickets_user on public.tickets(user_id);
create index if not exists idx_tickets_payment_report on public.tickets(payment_report_id);

-- *** REGLA ANTI-DUPLICADOS (la más importante) ***
-- Un mismo número de boleto de una rifa NO puede existir dos veces mientras
-- esté reservado, pendiente de pago, confirmado o marcado ganador.
-- Si un boleto se cancela/rechaza, el número queda libre automáticamente
-- porque deja de contar para este índice único parcial.
create unique index if not exists uq_tickets_raffle_number_active
  on public.tickets (raffle_id, ticket_number)
  where (status in ('pending_payment', 'confirmed', 'winner'));

-- -------------------------------------------------------------------------
-- 9. TABLA: draw_results (resultados de sorteos, públicos y verificables)
-- -------------------------------------------------------------------------
create table if not exists public.draw_results (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id),
  winning_ticket_number text not null,
  winner_user_id uuid references public.users(id),
  winner_name text,
  winner_city text,
  drawn_at timestamptz not null default now(),
  public_seed text not null,
  draw_hash text not null,
  total_eligible_tickets integer not null,
  lottery_reference text,
  notary_certificate_url text,
  prize_delivered boolean not null default false,
  delivery_photo_url text,
  testimonial text
);

create index if not exists idx_draw_results_raffle on public.draw_results(raffle_id);

-- -------------------------------------------------------------------------
-- 10. TABLAS: support_conversations + support_messages
-- -------------------------------------------------------------------------
create table if not exists public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  subject text not null,
  related_ticket_id uuid references public.tickets(id),
  status support_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_support_conversations_updated_at on public.support_conversations;
create trigger trg_support_conversations_updated_at
  before update on public.support_conversations
  for each row execute function set_updated_at();

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender text not null check (sender in ('user','admin')),
  sender_id uuid references public.users(id),
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_messages_conversation on public.support_messages(conversation_id);

-- -------------------------------------------------------------------------
-- 11. TABLA: notifications
-- -------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  target notification_target not null default 'client',
  user_id uuid references public.users(id),
  title text not null,
  message text not null,
  type notification_type not null,
  read boolean not null default false,
  link_screen text,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);

-- -------------------------------------------------------------------------
-- 12. TABLA: audit_logs (auditoría de acciones administrativas)
-- -------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.users(id),
  admin_name text,
  action text not null,
  category audit_category not null,
  details text,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_category on public.audit_logs(category);

-- -------------------------------------------------------------------------
-- 13. FUNCIÓN: reservar un boleto de forma atómica (evita condiciones de carrera)
-- -------------------------------------------------------------------------
-- Se llama desde el backend/frontend en vez de hacer un INSERT directo.
-- Si el número ya está tomado, el índice único de la sección 8 hace fallar
-- el INSERT y esta función devuelve un error controlado en vez de duplicar.
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
  if not v_raffle.allow_sales_beyond_limit and p_ticket_number::numeric > v_raffle.total_tickets then
    raise exception 'El número de boleto supera el límite de la rifa.';
  end if;
  if p_price_paid is distinct from v_raffle.ticket_price then
    raise exception 'El precio del boleto no coincide con el de la rifa.';
  end if;
  p_ticket_number := lpad(p_ticket_number::integer::text,
    greatest(4, length(v_raffle.total_tickets::text), length(p_ticket_number::integer::text)), '0');

  insert into public.tickets (raffle_id, user_id, ticket_number, status, price_paid)
  values (p_raffle_id, auth.uid(), p_ticket_number, 'pending_payment', p_price_paid)
  returning * into v_ticket;

  return v_ticket;
exception
  when unique_violation then
    raise exception 'El boleto % ya fue reservado por otro usuario. Elige otro número.', p_ticket_number;
end;
$$ language plpgsql security definer set search_path = public;

-- -------------------------------------------------------------------------
-- 14. FUNCIÓN: confirmar o rechazar un pago (SOLO admin) — atómica y auditada
-- -------------------------------------------------------------------------
create or replace function public.review_payment_report(
  p_payment_id uuid,
  p_approve boolean,
  p_admin_notes text default null
)
returns public.payment_reports as $$
declare
  v_payment public.payment_reports;
  v_admin_name text;
begin
  if not public.is_admin() then
    raise exception 'Solo un administrador puede revisar pagos.';
  end if;

  select full_name into v_admin_name from public.users where id = auth.uid();

  select * into v_payment from public.payment_reports where id = p_payment_id for update;
  if not found then
    raise exception 'No se encontró el reporte de pago.';
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'Este pago ya fue revisado.';
  end if;
  if p_approve is null then
    raise exception 'Indica si el pago se aprueba o se rechaza.';
  end if;
  if not exists (select 1 from public.tickets where payment_report_id = p_payment_id and status = 'pending_payment') then
    raise exception 'El reporte no tiene boletos pendientes asociados.';
  end if;

  update public.payment_reports
     set status = (case when p_approve then 'verified' else 'rejected' end)::public.payment_status,
         admin_notes = p_admin_notes,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_payment_id
   returning * into v_payment;

  if p_approve then
    update public.tickets
       set status = 'confirmed', confirmed_at = now()
     where payment_report_id = p_payment_id;
  else
    update public.tickets
       set status = 'cancelled'
     where payment_report_id = p_payment_id;
  end if;

  insert into public.audit_logs (admin_id, admin_name, action, category, details)
  values (
    auth.uid(),
    v_admin_name,
    case when p_approve then 'payment_verified' else 'payment_rejected' end,
    'payment',
    'Pago ' || p_payment_id || ' revisado.'
  );

  return v_payment;
end;
$$ language plpgsql security definer set search_path = public;

-- -------------------------------------------------------------------------
-- 14b. PEDIDO COMPLETO: reserva + reporte + asociación en una sola transacción
-- El navegador nunca decide el precio ni puede confirmar sus propios boletos.
-- Un error revierte TODOS los boletos del pedido y su comprobante.
-- -------------------------------------------------------------------------
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
      or (not v_raffle.allow_sales_beyond_limit and n::numeric > v_raffle.total_tickets)
  ) then
    raise exception 'Hay números fuera del límite de la rifa.';
  end if;
  select array_agg(lpad(n::integer::text,
    greatest(4, length(v_raffle.total_tickets::text), length(n::integer::text)), '0'))
    into v_numbers from unnest(p_ticket_numbers) n;
  select coalesce(array_agg(lpad(n::integer::text,
    greatest(4, length(v_raffle.total_tickets::text), length(n::integer::text)), '0')), '{}'::text[])
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
    raise exception 'Uno de los boletos ya fue reservado. Actualiza la rifa y elige otro número.';
end;
$$;

-- -------------------------------------------------------------------------
-- 15. ROW LEVEL SECURITY (RLS) — activar en todas las tablas
-- -------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.raffles enable row level security;
alter table public.raffle_media enable row level security;
alter table public.payment_reports enable row level security;
alter table public.tickets enable row level security;
alter table public.draw_results enable row level security;
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- USERS: cada quien ve/edita su propio perfil; el admin ve/edita todos.
-- Nadie puede cambiar su propia columna "role" (se controla por trigger abajo).
drop policy if exists "users_select_own_or_admin" on public.users;
create policy "users_select_own_or_admin" on public.users
  for select using (id = auth.uid() or public.is_admin());
drop policy if exists "users_update_own_or_admin" on public.users;
create policy "users_update_own_or_admin" on public.users
  for update using (id = auth.uid() or public.is_admin());

-- Evita que un usuario normal se auto-asigne el rol admin editando su perfil.
create or replace function public.prevent_role_self_escalation()
returns trigger as $$
begin
  if auth.uid() is not null
     and new.role is distinct from old.role
     and not public.is_admin() then
    raise exception 'No tienes permiso para cambiar el rol.';
  end if;
  if auth.uid() is not null and not public.is_admin()
     and (new.status is distinct from old.status or new.notes is distinct from old.notes) then
    raise exception 'Solo un administrador puede cambiar el estado o las notas internas.';
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_prevent_role_escalation on public.users;
create trigger trg_prevent_role_escalation
  before update on public.users
  for each row execute function public.prevent_role_self_escalation();

-- BANK_ACCOUNTS: público ve solo las activas; admin ve/gestiona todas.
drop policy if exists "bank_accounts_public_read" on public.bank_accounts;
create policy "bank_accounts_public_read" on public.bank_accounts
  for select using (is_active = true or public.is_admin());
drop policy if exists "bank_accounts_admin_write" on public.bank_accounts;
create policy "bank_accounts_admin_write" on public.bank_accounts
  for all using (public.is_admin()) with check (public.is_admin());

-- RAFFLES: público ve rifas activas/cerradas/sorteadas; admin ve/gestiona todas
-- (borradores y pausadas no se muestran a los clientes).
drop policy if exists "raffles_public_read" on public.raffles;
create policy "raffles_public_read" on public.raffles
  for select using (status in ('active','closed','drawn') or public.is_admin());
drop policy if exists "raffles_admin_write" on public.raffles;
create policy "raffles_admin_write" on public.raffles
  for all using (public.is_admin()) with check (public.is_admin());

-- RAFFLE_MEDIA: sigue la visibilidad de su rifa.
drop policy if exists "raffle_media_public_read" on public.raffle_media;
create policy "raffle_media_public_read" on public.raffle_media
  for select using (
    public.is_admin() or exists (
      select 1 from public.raffles r
      where r.id = raffle_media.raffle_id and r.status in ('active','closed','drawn')
    )
  );
drop policy if exists "raffle_media_admin_write" on public.raffle_media;
create policy "raffle_media_admin_write" on public.raffle_media
  for all using (public.is_admin()) with check (public.is_admin());

-- PAYMENT_REPORTS: el usuario ve/crea los suyos; solo el admin actualiza
-- (la actualización real ocurre a través de review_payment_report()).
drop policy if exists "payment_reports_owner_read" on public.payment_reports;
create policy "payment_reports_owner_read" on public.payment_reports
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "payment_reports_owner_insert" on public.payment_reports;
create policy "payment_reports_owner_insert" on public.payment_reports
  for insert with check (false); -- Los pedidos se crean mediante submit_payment_report().
drop policy if exists "payment_reports_admin_update" on public.payment_reports;
create policy "payment_reports_admin_update" on public.payment_reports
  for update using (public.is_admin());

-- TICKETS: el usuario ve los suyos; la creación se hace vía reserve_ticket().
drop policy if exists "tickets_owner_read" on public.tickets;
create policy "tickets_owner_read" on public.tickets
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "tickets_admin_write" on public.tickets;
create policy "tickets_admin_write" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

-- DRAW_RESULTS: públicos para todos (transparencia); solo admin escribe.
drop policy if exists "draw_results_public_read" on public.draw_results;
create policy "draw_results_public_read" on public.draw_results
  for select using (true);
drop policy if exists "draw_results_admin_write" on public.draw_results;
create policy "draw_results_admin_write" on public.draw_results
  for all using (public.is_admin()) with check (public.is_admin());

-- SUPPORT: el usuario ve/crea sus propias conversaciones y mensajes; admin ve todo.
drop policy if exists "support_conversations_owner" on public.support_conversations;
create policy "support_conversations_owner" on public.support_conversations
  for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists "support_conversations_owner_insert" on public.support_conversations;
create policy "support_conversations_owner_insert" on public.support_conversations
  for insert with check (user_id = auth.uid());
drop policy if exists "support_conversations_admin_update" on public.support_conversations;
create policy "support_conversations_admin_update" on public.support_conversations
  for update using (public.is_admin());

drop policy if exists "support_messages_participant_read" on public.support_messages;
create policy "support_messages_participant_read" on public.support_messages
  for select using (
    public.is_admin() or exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id and c.user_id = auth.uid()
    )
  );
drop policy if exists "support_messages_participant_insert" on public.support_messages;
create policy "support_messages_participant_insert" on public.support_messages
  for insert with check (
    sender_id = auth.uid() and (
      (public.is_admin() and sender = 'admin') or
      (sender = 'user' and exists (
        select 1 from public.support_conversations c
        where c.id = support_messages.conversation_id and c.user_id = auth.uid()
      ))
    )
  );

-- NOTIFICATIONS: el usuario ve las suyas y las 'all'; admin ve/crea todas.
drop policy if exists "notifications_owner_read" on public.notifications;
create policy "notifications_owner_read" on public.notifications
  for select using (user_id = auth.uid() or target = 'all' or public.is_admin());
drop policy if exists "notifications_owner_update" on public.notifications;
create policy "notifications_owner_update" on public.notifications
  for update using (user_id = auth.uid() or public.is_admin());
drop policy if exists "notifications_admin_insert" on public.notifications;
create policy "notifications_admin_insert" on public.notifications
  for insert with check (public.is_admin());

-- AUDIT_LOGS: solo el admin puede leerlos; se insertan solo vía funciones
-- SECURITY DEFINER (reserve_ticket, review_payment_report), nunca directo.
drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs
  for select using (public.is_admin());

-- -------------------------------------------------------------------------
-- 16. VISTA: estadísticas de boletos por rifa (en vez de columnas duplicadas)
-- -------------------------------------------------------------------------
create or replace view public.raffle_stats as
select
  r.id as raffle_id,
  r.total_tickets,
  count(t.id) filter (where t.status in ('confirmed','winner')) as sold_tickets_count,
  count(t.id) filter (where t.status = 'pending_payment') as reserved_tickets_count
from public.raffles r
left join public.tickets t on t.raffle_id = r.id
where r.status in ('active', 'closed', 'drawn') or public.is_admin()
group by r.id, r.total_tickets;

-- -------------------------------------------------------------------------
-- 17. CÓDIGOS 2FA POR CORREO (usados por la Edge Function)
-- Tabla heredada: el portal actual usa TOTP nativo de Supabase Auth.
-- -------------------------------------------------------------------------
create table if not exists public.admin_email_2fa_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  code_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_email_2fa_codes_user_created
  on public.admin_email_2fa_codes(user_id, created_at desc);

alter table public.admin_email_2fa_codes enable row level security;

-- Disponibilidad pública sin exponer nombres, documentos ni datos de compradores.
create or replace function public.get_taken_ticket_numbers(p_raffle_id uuid)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(t.ticket_number order by t.ticket_number), '{}'::text[])
  from public.tickets t
  where t.raffle_id = p_raffle_id and t.status in ('pending_payment', 'confirmed', 'winner')
    and exists (
      select 1 from public.raffles r where r.id = p_raffle_id
        and (r.status in ('active', 'closed', 'drawn') or public.is_admin())
    );
$$;

-- =========================================================================
-- REALTIME — necesario para que las suscripciones WebSocket funcionen.
-- Sin esto, `supabase.channel(...).on('postgres_changes', ...)` se
-- "suscribe" sin error pero JAMÁS recibe ningún evento (falla silenciosa).
-- La app seguiría funcionando gracias al polling de respaldo cada 30s, pero
-- las actualizaciones en vivo (< 1 segundo) no ocurrirán hasta ejecutar esto.
-- Es seguro volver a ejecutar: si una tabla ya está en la publicación, no
-- lanza error.
-- =========================================================================
do $$
declare
  v_table text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime' and puballtables) then
    foreach v_table in array array['raffles', 'tickets', 'payment_reports', 'draw_results', 'support_conversations', 'support_messages']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end;
$$;

-- =========================================================================
-- Permisos explícitos: no dependemos de los privilegios predeterminados del proyecto.
grant usage on schema public to anon, authenticated;
grant select on public.raffles, public.raffle_media, public.bank_accounts,
  public.draw_results, public.raffle_stats to anon, authenticated;
grant select, insert, update, delete on public.users, public.raffles, public.raffle_media,
  public.bank_accounts, public.payment_reports, public.tickets, public.draw_results,
  public.support_conversations, public.support_messages, public.notifications to authenticated;
grant select on public.audit_logs to authenticated;
revoke all on public.admin_email_2fa_codes from anon, authenticated;
revoke all on function public.reserve_ticket(uuid, text, numeric) from public, anon, authenticated;
revoke all on function public.submit_payment_report(uuid, text[], text[], numeric, text, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_payment_report(uuid, text[], text[], numeric, text, text, text, text, text, text, text) to authenticated;
revoke all on function public.review_payment_report(uuid, boolean, text) from public, anon;
grant execute on function public.review_payment_report(uuid, boolean, text) to authenticated;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
revoke all on function public.get_taken_ticket_numbers(uuid) from public;
grant execute on function public.get_taken_ticket_numbers(uuid) to anon, authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Actualiza la caché de la API
notify pgrst, 'reload schema';
commit;
