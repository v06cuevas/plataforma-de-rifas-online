import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const [schema, storage] = await Promise.all(
  ['supabase_schema.sql', 'STORAGE_SETUP.sql'].map(async (file) =>
    (await readFile(new URL(file, root), 'utf8')).replace(/\r\n/g, '\n')
  )
);

function transactionBody(sql) {
  const start = sql.indexOf('\nbegin;\n');
  const end = sql.lastIndexOf('\ncommit;');
  if (start < 0 || end <= start) throw new Error('Faltan los límites de transacción del SQL original.');
  return sql.slice(start + '\nbegin;\n'.length, end).trim();
}

const schemaBody = transactionBody(schema).replace(
  /\n-- Actualiza la caché de la API[^\n]*\nnotify pgrst, 'reload schema';$/,
  ''
).trim();

const output = `-- =========================================================================
-- SUPABASE_COMPLETO.sql — PLATAFORMA DE RIFAS ONLINE
-- =========================================================================
-- 1. Abre Supabase > SQL Editor > New query.
-- 2. Copia TODO este archivo y pulsa Run.
-- Incluye tablas, columnas, perfiles, funciones de compra, permisos RLS,
-- Realtime y los buckets de Storage. No necesitas ejecutar los otros SQL.
-- Se puede volver a ejecutar sin borrar los datos existentes.
-- Toda la instalación se aplica en una sola transacción.
-- Generado desde supabase_schema.sql y STORAGE_SETUP.sql con npm run sql:build.
-- =========================================================================

begin;

${schemaBody}

-- -------------------------------------------------------------------------
-- 18. STORAGE: portadas públicas y comprobantes privados
-- -------------------------------------------------------------------------
${transactionBody(storage)}

-- Recarga la API cuando todas las tablas, funciones y políticas estén listas.
notify pgrst, 'reload schema';
commit;

select 'Configuración de la plataforma completada.' as resultado;

-- Primer administrador: regístrate desde la web y luego ejecuta por separado,
-- sustituyendo el correo por el de tu cuenta:
-- update public.users set role = 'admin' where email = 'tu-correo@dominio.com';
`;

await writeFile(new URL('SUPABASE_COMPLETO.sql', root), output, 'utf8');
console.log('SUPABASE_COMPLETO.sql generado: esquema, Realtime y Storage en una transacción.');
