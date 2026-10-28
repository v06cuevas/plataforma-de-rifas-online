-- =========================================================================
-- Ejecuta esto UNA VEZ en el SQL Editor de tu proyecto de Supabase para que
-- las suscripciones en tiempo real (WebSocket) funcionen de verdad.
--
-- Sin este paso, `subscribeToRealtimeUpdates()` en el código se "suscribe"
-- sin ningún error, pero nunca recibe eventos — el fallo es completamente
-- silencioso. La app sigue funcionando por el polling de respaldo cada 30s,
-- pero pierdes las actualizaciones instantáneas.
--
-- Es seguro volver a ejecutarlo: si una tabla ya está agregada, no falla.
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

-- -------------------------------------------------------------------------
-- Verificación: esta consulta debe devolver las 6 tablas de arriba.
-- Si falta alguna, algo salió mal al ejecutar las líneas de arriba.
-- -------------------------------------------------------------------------
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
