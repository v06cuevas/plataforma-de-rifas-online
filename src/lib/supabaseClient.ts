import { createClient } from '@supabase/supabase-js';

// Estas variables deben definirse en un archivo .env en la raíz del proyecto
// (o en el panel de Secrets de AI Studio) con el prefijo VITE_ para que Vite
// las exponga al navegador:
//
//   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
//   VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
//
// La "anon key" es segura de exponer en el frontend: el acceso real a los
// datos está controlado por las políticas de Row Level Security (RLS)
// definidas en supabase_schema.sql, no por esta llave.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // No lanzamos un error duro para no romper el build, pero avisamos en consola:
  // sin estas variables ninguna llamada a Supabase funcionará.
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
      'Configúralas en tu archivo .env (ver .env.example).'
  );
}

// Adapter personalizado para usar localStorage de forma confiable en Vercel y navegadores
const customAuthAdapter = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: 'raffle_auth_session',
    storage: customAuthAdapter,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
