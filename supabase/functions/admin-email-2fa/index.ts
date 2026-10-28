import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const confirmationCodeHash = Deno.env.get('ADMIN_CONFIRMATION_CODE_HASH');

const userClient = createClient(supabaseUrl, supabaseAnonKey);
const adminClient = createClient(supabaseUrl, serviceRoleKey);

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getBearerToken(request: Request) {
  const header = request.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

async function hashCode(code: string) {
  const bytes = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405);

  try {
    const token = getBearerToken(request);
    if (!token) return jsonResponse({ error: 'Sesión requerida.' }, 401);

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData.user) return jsonResponse({ error: 'Sesión inválida.' }, 401);

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('id, email, role')
      .eq('id', authData.user.id)
      .single();
    if (profileError || profile?.role !== 'admin') return jsonResponse({ error: 'Acceso solo para administradores.' }, 403);

    const payload = await request.json();
    const action = payload?.action;

    if (action === 'verify') {
      const code = String(payload?.code || '').replace(/\D/g, '');
      if (code.length !== 8) return jsonResponse({ error: 'El código debe tener 8 dígitos.' }, 400);
      if (!confirmationCodeHash) throw new Error('Falta ADMIN_CONFIRMATION_CODE_HASH en los secretos de Supabase.');
      if ((await hashCode(code)) !== confirmationCodeHash) return jsonResponse({ error: 'Código incorrecto.' }, 401);
      return jsonResponse({ verified: true });
    }

    return jsonResponse({ error: 'La acción debe ser send o verify.' }, 400);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Error desconocido en la Edge Function.';
    return jsonResponse({ error: message }, 500);
  }
});
