-- Diagnóstico de solo lectura. Ejecutar en Supabase > SQL Editor.
-- Se consideran activos: pendientes, confirmados y ganadores.
-- Los cancelados y reembolsados pueden reutilizar su número.

-- 1. Debe devolver cero filas. 1, 0001 y 00001 representan el mismo número.
with active as (
  select id, raffle_id, ticket_number, status,
    case when ticket_number ~ '^[0-9]{1,10}$' then ticket_number::numeric end as number
  from public.tickets
  where status in ('pending_payment', 'confirmed', 'winner')
)
select number as numero_repetido, count(*) as cantidad,
  array_agg(id order by id) as boletos, array_agg(raffle_id order by id) as rifas
from active where number is not null
group by number having count(*) > 1 order by number;

-- 2. También debe devolver cero filas.
select id, raffle_id, ticket_number, status
from public.tickets
where status in ('pending_payment', 'confirmed', 'winner') and case
  when ticket_number ~ '^[0-9]{1,10}$'
    then ticket_number::numeric < 1 or ticket_number::numeric > 2147483647
  else true end;

-- 3. Debe mostrar el índice UNIQUE global con ticket_number convertido a bigint.
select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'tickets'
  and indexname in ('uq_tickets_number_active_global', 'uq_tickets_raffle_number_active');

-- 4. Debe devolver los dos protocolos de disponibilidad después de migrar.
select routine_name from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('get_taken_ticket_numbers', 'get_ticket_number_availability');
