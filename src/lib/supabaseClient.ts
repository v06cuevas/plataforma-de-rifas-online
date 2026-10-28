import { createClient } from '@supabase/supabase-js';
import { supabaseConfig } from './supabaseConfig';

// Estas variables deben definirse en un archivo .env en la raíz del proyecto
// (o en el panel de Secrets de AI Studio) con el prefijo VITE_ para que Vite
// las exponga al navegador:
//
//   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
//   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_tu-clave
//   (también se admite VITE_SUPABASE_ANON_KEY para la clave anon antigua)
//
// La "anon key" es segura de exponer en el frontend: el acceso real a los
// datos está controlado por las políticas de Row Level Security (RLS)
// definidas en supabase_schema.sql, no por esta llave.
if (supabaseConfig.error) throw new Error(supabaseConfig.error);

// Adapter personalizado para usar localStorage de forma confiable en Vercel y navegadores
const customAuthAdapter = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

export const supabase = createClient(supabaseConfig.url, supabaseConfig.key, {
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
