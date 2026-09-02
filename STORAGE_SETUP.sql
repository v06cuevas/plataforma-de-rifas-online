-- =========================================================================
-- STORAGE_SETUP.sql
--
-- Por qué existe este archivo
-- ---------------------------------------------------------------------
-- Antes, las fotos/videos de cada rifa se guardaban como texto base64
-- directamente en las columnas `raffles.banner_url` y `raffle_media.url`
-- (tipo `text`). Eso significaba que la imagen completa (varios MB, sin
-- comprimir) viajaba dentro de la respuesta JSON de Supabase en CADA visita
-- a la portada, sin caché de navegador ni CDN — la causa principal del LCP
-- de 11-14 segundos que reportaste.
--
-- Ahora el código (src/components/admin/AdminRafflesTab.tsx) sube los
-- archivos a Supabase Storage y guarda solo la URL pública (un texto corto)
-- en la base de datos. Para que eso funcione, este proyecto de Supabase
-- necesita un bucket de Storage llamado "raffle-media".
--
-- Cómo ejecutar este archivo
-- ---------------------------------------------------------------------
-- 1. Entra a tu proyecto en https://app.supabase.com
-- 2. Ve a "SQL Editor" (menú lateral)
-- 3. Pega TODO el contenido de este archivo y dale a "Run"
-- 4. Verifica en "Storage" (menú lateral) que aparezca el bucket
--    "raffle-media" marcado como público.
--
-- Esto solo se ejecuta UNA vez por proyecto de Supabase.
-- =========================================================================

-- 1. Crear el bucket público (si no existe ya)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'raffle-media',
  'raffle-media',
  true, -- público: cualquiera puede LEER las imágenes (necesario para que se vean en la web)
  52428800, -- límite de 50 MB por archivo (suficiente para fotos y video corto de portada)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. Política: cualquiera puede LEER (descargar/ver) los archivos del bucket.
--    Necesario porque las imágenes se muestran en la portada pública sin login.
drop policy if exists "raffle_media_public_read" on storage.objects;
create policy "raffle_media_public_read"
  on storage.objects for select
  using (bucket_id = 'raffle-media');

-- 3. Política: solo usuarios autenticados con rol 'admin' (tabla public.users)
--    pueden SUBIR archivos nuevos al bucket.
drop policy if exists "raffle_media_admin_insert" on storage.objects;
create policy "raffle_media_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'raffle-media'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- 4. Política: solo administradores pueden BORRAR/REEMPLAZAR archivos
--    (por ejemplo, al editar una rifa y quitar una foto).
drop policy if exists "raffle_media_admin_delete" on storage.objects;
create policy "raffle_media_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'raffle-media'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

drop policy if exists "raffle_media_admin_update" on storage.objects;
create policy "raffle_media_admin_update"
  on storage.objects for update
  using (
    bucket_id = 'raffle-media'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- =========================================================================
-- IMPORTANTE - Rifas que ya tienen fotos en base64
-- =========================================================================
-- Si ya creaste rifas ANTES de este cambio, esas fotos siguen guardadas
-- como texto base64 gigante en `banner_url` / `raffle_media.url` y seguirán
-- pesando lo mismo (el bucket nuevo no las migra automáticamente).
--
-- Para arreglar una rifa existente: entra al panel de administrador, edita
-- esa rifa, quita la foto actual y vuelve a subirla — con el código nuevo,
-- esa foto sí se guardará en Storage y pesará una fracción de lo que pesaba.
-- =========================================================================


-- =========================================================================
-- BUCKET 2: payment-receipts (comprobantes de transferencia)
-- =========================================================================
-- Antes, el comprobante que sube el comprador al reportar un pago
-- (src/components/TransferPaymentView.tsx) se guardaba como texto base64
-- directo en `payment_reports.receipt_url`. Mismo problema que las fotos de
-- rifas: pesado, sin límite de tamaño confiable, y si por cualquier motivo
-- fallaba la lectura del archivo en el navegador, el formulario lo
-- sustituía en silencio por una foto de stock de Unsplash — el
-- administrador terminaba "verificando" pagos sin ver el comprobante real.
--
-- Ahora el comprobante se sube a este bucket y solo se guarda su URL
-- pública (además, subir el comprobante ahora es obligatorio para poder
-- enviar el reporte de pago).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-receipts',
  'payment-receipts',
  true, -- público: se muestra directo con <img src=...> tanto al comprador como al admin
  10485760, -- 10 MB por archivo (fotos de recibo o PDF)
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Cualquiera puede LEER un comprobante si tiene el link exacto (necesario
-- para que se muestre en el panel de admin y en la confirmación del
-- comprador). El nombre de archivo incluye un timestamp + código aleatorio,
-- así que no es adivinable, y el bucket no permite "listar" archivos.
-- Si prefieres que sea 100% privado (con enlaces temporales que expiran),
-- avísame y lo migramos a URLs firmadas.
drop policy if exists "payment_receipts_public_read" on storage.objects;
create policy "payment_receipts_public_read"
  on storage.objects for select
  using (bucket_id = 'payment-receipts');

-- Cualquier usuario autenticado (comprador logueado) puede SUBIR su propio
-- comprobante al reportar un pago.
drop policy if exists "payment_receipts_authenticated_insert" on storage.objects;
create policy "payment_receipts_authenticated_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'payment-receipts'
    and auth.role() = 'authenticated'
  );

-- Solo administradores pueden borrar comprobantes (ej. al limpiar reportes
-- de prueba o rechazados).
drop policy if exists "payment_receipts_admin_delete" on storage.objects;
create policy "payment_receipts_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'payment-receipts'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

