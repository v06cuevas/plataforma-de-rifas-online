-- =========================================================================
-- PLATAFORMA DE RIFAS ONLINE — ESQUEMA COMPLETO PARA SUPABASE (PostgreSQL)
-- =========================================================================
-- Instrucciones:
-- 1. Abre tu proyecto en https://supabase.com -> SQL Editor -> New query.
-- 2. Pega TODO este archivo y ejecútalo (Run) una sola vez sobre una base
--    de datos limpia.
-- 3. No contiene ningún dato de ejemplo (raffles, usuarios, boletos, etc.)
--    quedan vacíos: los datos reales se cargan desde el panel de admin.
-- 4. Usa autenticación de Supabase (auth.users) para login; esta tabla
--    "public.users" es el PERFIL extendido de cada usuario autenticado.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. EXTENSIONES
-- -------------------------------------------------------------------------
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
$$ language plpgsql;

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
  insert into public.users (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    'client'
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Helper usado en TODAS las políticas RLS para saber si quien consulta es admin.
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
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
  v_raffle_status raffle_status;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para reservar un boleto.';
  end if;

  select status into v_raffle_status from public.raffles where id = p_raffle_id;
  if v_raffle_status is distinct from 'active' then
    raise exception 'Esta rifa no está activa.';
  end if;

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

  update public.payment_reports
     set status = case when p_approve then 'verified' else 'rejected' end,
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
create policy "users_select_own_or_admin" on public.users
  for select using (id = auth.uid() or public.is_admin());
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
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_prevent_role_escalation on public.users;
create trigger trg_prevent_role_escalation
  before update on public.users
  for each row execute function public.prevent_role_self_escalation();

-- BANK_ACCOUNTS: público ve solo las activas; admin ve/gestiona todas.
create policy "bank_accounts_public_read" on public.bank_accounts
  for select using (is_active = true or public.is_admin());
create policy "bank_accounts_admin_write" on public.bank_accounts
  for all using (public.is_admin()) with check (public.is_admin());

-- RAFFLES: público ve rifas activas/cerradas/sorteadas; admin ve/gestiona todas
-- (borradores y pausadas no se muestran a los clientes).
create policy "raffles_public_read" on public.raffles
  for select using (status in ('active','closed','drawn') or public.is_admin());
create policy "raffles_admin_write" on public.raffles
  for all using (public.is_admin()) with check (public.is_admin());

-- RAFFLE_MEDIA: sigue la visibilidad de su rifa.
create policy "raffle_media_public_read" on public.raffle_media
  for select using (
    public.is_admin() or exists (
      select 1 from public.raffles r
      where r.id = raffle_media.raffle_id and r.status in ('active','closed','drawn')
    )
  );
create policy "raffle_media_admin_write" on public.raffle_media
  for all using (public.is_admin()) with check (public.is_admin());

-- PAYMENT_REPORTS: el usuario ve/crea los suyos; solo el admin actualiza
-- (la actualización real ocurre a través de review_payment_report()).
create policy "payment_reports_owner_read" on public.payment_reports
  for select using (user_id = auth.uid() or public.is_admin());
create policy "payment_reports_owner_insert" on public.payment_reports
  for insert with check (user_id = auth.uid());
create policy "payment_reports_admin_update" on public.payment_reports
  for update using (public.is_admin());

-- TICKETS: el usuario ve los suyos; la creación se hace vía reserve_ticket().
create policy "tickets_owner_read" on public.tickets
  for select using (user_id = auth.uid() or public.is_admin());
create policy "tickets_admin_write" on public.tickets
  for all using (public.is_admin()) with check (public.is_admin());

-- DRAW_RESULTS: públicos para todos (transparencia); solo admin escribe.
create policy "draw_results_public_read" on public.draw_results
  for select using (true);
create policy "draw_results_admin_write" on public.draw_results
  for all using (public.is_admin()) with check (public.is_admin());

-- SUPPORT: el usuario ve/crea sus propias conversaciones y mensajes; admin ve todo.
create policy "support_conversations_owner" on public.support_conversations
  for select using (user_id = auth.uid() or public.is_admin());
create policy "support_conversations_owner_insert" on public.support_conversations
  for insert with check (user_id = auth.uid());
create policy "support_conversations_admin_update" on public.support_conversations
  for update using (public.is_admin());

create policy "support_messages_participant_read" on public.support_messages
  for select using (
    public.is_admin() or exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id and c.user_id = auth.uid()
    )
  );
create policy "support_messages_participant_insert" on public.support_messages
  for insert with check (
    public.is_admin() or exists (
      select 1 from public.support_conversations c
      where c.id = support_messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- NOTIFICATIONS: el usuario ve las suyas y las 'all'; admin ve/crea todas.
create policy "notifications_owner_read" on public.notifications
  for select using (user_id = auth.uid() or target = 'all' or public.is_admin());
create policy "notifications_owner_update" on public.notifications
  for update using (user_id = auth.uid() or public.is_admin());
create policy "notifications_admin_insert" on public.notifications
  for insert with check (public.is_admin());

-- AUDIT_LOGS: solo el admin puede leerlos; se insertan solo vía funciones
-- SECURITY DEFINER (reserve_ticket, review_payment_report), nunca directo.
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
group by r.id, r.total_tickets;

-- -------------------------------------------------------------------------
-- 17. CÓDIGOS 2FA POR CORREO (usados por la Edge Function)
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

-- =========================================================================
-- REALTIME — necesario para que las suscripciones WebSocket funcionen.
-- Sin esto, `supabase.channel(...).on('postgres_changes', ...)` se
-- "suscribe" sin error pero JAMÁS recibe ningún evento (falla silenciosa).
-- La app seguiría funcionando gracias al polling de respaldo cada 30s, pero
-- las actualizaciones en vivo (< 1 segundo) no ocurrirán hasta ejecutar esto.
-- Es seguro volver a ejecutar: si una tabla ya está en la publicación, no
-- lanza error.
-- =========================================================================
alter publication supabase_realtime add table public.raffles;
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.payment_reports;
alter publication supabase_realtime add table public.draw_results;
alter publication supabase_realtime add table public.support_conversations;
alter publication supabase_realtime add table public.support_messages;

-- =========================================================================
-- FIN DEL ESQUEMA — la base de datos queda vacía, lista para producción.
-- Para crear tu primer administrador (no se puede hacer desde el registro
-- público): registra un usuario normal desde la app y luego, en el SQL
-- Editor de Supabase, ejecuta UNA vez:
--
--   update public.users set role = 'admin' where email = 'tu-correo@dominio.com';
-- =========================================================================
