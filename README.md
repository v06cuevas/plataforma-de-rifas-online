# Plataforma de Rifas Online

Aplicación React + Vite con Supabase Auth, PostgreSQL, Storage y Realtime.

## Configurar Supabase

1. Abre tu proyecto en el panel de Supabase.
2. En **SQL Editor > New query**, pega TODO el contenido de
   **`SUPABASE_COMPLETO.sql`** y pulsa **Run**. Es el único archivo necesario:
   incluye tablas, perfiles, permisos RLS, funciones de compra, Realtime y los dos buckets.
3. Se puede volver a ejecutar sin borrar los datos existentes. Los otros SQL se
   conservan como fuentes y scripts complementarios; no hace falta ejecutarlos.
   Si se modifican las fuentes, `npm run sql:build` regenera el archivo completo.
4. Completa el archivo **.env** que está en la raíz:

```dotenv
VITE_SUPABASE_URL=https://TU_PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE_PUBLICA
```

Obtén la URL del proyecto en **Project Settings > Data API** y la clave pública en
**Project Settings > API Keys** (también aparecen en el diálogo **Connect**).
Si tu proyecto utiliza la clave pública antigua `anon`, deja publishable vacía
y usa `VITE_SUPABASE_ANON_KEY=tu_clave_anon`.

**Nunca pongas `service_role`, `sb_secret_...` ni la contraseña de PostgreSQL en
variables `VITE_`: se incluyen en el JavaScript del navegador.**
Más información: [claves de Supabase](https://supabase.com/docs/guides/getting-started/api-keys).

El archivo `.env` está excluido de Git. `.env.example` es la plantilla compartible.
Si faltan valores o la configuración es inválida, la web muestra instrucciones de configuración.
Las claves reales no están incluidas en el repositorio.

## Ejecutar

Requiere Node.js 22 o posterior y npm.

```powershell
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).
Después de cambiar `.env`, reinicia Vite.

En Vercel configura las mismas variables de entorno y vuelve a desplegar;
Vite las incorpora al compilar. No subas `.env` al repositorio.

## Registro y primer administrador

1. En **Authentication > URL Configuration** configura la URL de tu sitio
   (en desarrollo: `http://localhost:3000`) y las URL de redirección permitidas.
2. Regístrate desde la web. Si está habilitada la confirmación por correo,
   confirma el enlace antes de iniciar sesión. La cédula se guarda en el perfil
   aunque el registro todavía no haya creado una sesión.
3. Promueve tu cuenta desde el SQL Editor:

```sql
update public.users
set role = 'admin'
where email = 'tu-correo@dominio.com';
```

4. Inicia sesión con tu correo y contraseña. Las cuentas con rol `admin` abren
   automáticamente el panel, también al recargar una sesión existente. El acceso
   **Portal Administrativo**, en el pie de página, permite entrar directamente.
5. Crea al menos una cuenta bancaria activa y una rifa con estado `active`.
   Sin estos datos reales no habrá rifas para comprar.

El registro público siempre crea clientes. El portal utiliza MFA TOTP nativo de Supabase:
si la cuenta tiene un factor verificado inscrito, debes ingresar los seis dígitos de tu
aplicación autenticadora. Si todavía no tiene uno, basta el correo y la contraseña.
El acceso normal también pide completar 2FA antes de abrir el panel.
Los errores al consultar el perfil se muestran en pantalla. Si falla la carga de
una sección, el panel permanece abierto y ofrece **Reintentar carga**.
La inscripción de factores se gestiona con Supabase Auth; esta app no incluye pantalla de inscripción.
La Edge Function heredada `admin-email-2fa` no participa en este acceso;
su implementación actual verifica un código fijo y no envía correos.

## Compras y comprobantes

La función `submit_payment_report` valida el usuario, el estado de la rifa,
los números, el precio actual, las promociones, el banco y el comprobante.
Crea el reporte y todos sus boletos en una transacción; si un número está ocupado,
no deja reservas parciales. Cada boleto queda vinculado a su pago.

La disponibilidad pública expone solo los números ocupados, sin datos de compradores.
Se actualiza al abrir la rifa y cada 15 segundos; la validación definitiva ocurre al enviar.

Los comprobantes se guardan en `payment-receipts/<id-del-usuario>/...`.
El dueño y los administradores pueden verlos mediante enlaces firmados de una hora.
Las portadas de `raffle-media` son públicas. El script de Storage también convierte
un bucket antiguo de comprobantes en privado; el panel firma las URL públicas antiguas
al leer los reportes. Los archivos no se borran.

## Verificación

```powershell
npm run lint
npm test
npm run build
```

Las pruebas ejecutan el SQL completo desde cero, lo repiten y comprueban su
compatibilidad con los cuatro SQL originales sobre PostgreSQL local mediante PGlite, con
roles y tablas mínimas que reproducen Auth y Storage. Verifican reejecución,
compras, rollback, precios, promociones, aprobación/rechazo, permisos y privacidad.
Se utiliza `gen_random_uuid()` nativo de PostgreSQL; el paquete local no carga
la extensión `pgcrypto`. Las pruebas no se conectan a tu proyecto de Supabase.

Para validar la integración real, configura las claves, ejecuta los SQL y prueba
registro, carga de imágenes, compra, revisión del comprobante y actualización en dos sesiones.
No se puede comprobar esa conexión sin credenciales y un proyecto configurado.
