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

alter publication supabase_realtime add table public.raffles;
alter publication supabase_realtime add table public.tickets;
alter publication supabase_realtime add table public.payment_reports;
alter publication supabase_realtime add table public.draw_results;
alter publication supabase_realtime add table public.support_conversations;
alter publication supabase_realtime add table public.support_messages;

-- -------------------------------------------------------------------------
-- Verificación: esta consulta debe devolver las 6 tablas de arriba.
-- Si falta alguna, algo salió mal al ejecutar las líneas de arriba.
-- -------------------------------------------------------------------------
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;
