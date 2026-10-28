const url = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  || import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

function validateConfig(): string | null {
  if (!url || !key) {
    return 'Completa VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY (o VITE_SUPABASE_ANON_KEY) en el archivo .env de la raíz del proyecto.';
  }

  try {
    const parsedUrl = new URL(url);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) throw new Error();
  } catch {
    return 'VITE_SUPABASE_URL debe ser la URL http o https de tu proyecto Supabase.';
  }

  if (key.startsWith('sb_secret_')) {
    return 'Usa la clave pública publishable o anon. Una clave secreta no puede utilizarse en el navegador.';
  }

  if (!key.startsWith('sb_publishable_')) {
    try {
      const payload = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      if (JSON.parse(atob(payload)).role !== 'anon') throw new Error();
    } catch {
      return 'La clave debe ser una publishable (sb_publishable_...) o la clave pública anon de Supabase.';
    }
  }

  return null;
}

export const supabaseConfig = { url, key, error: validateConfig() };
