import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminSession, fetchMyProfile } from '../src/lib/api';
import type { UserProfile } from '../src/types';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  assurance: vi.fn(),
  profile: vi.fn(),
}));
vi.mock('../src/lib/supabaseClient', () => ({
  supabase: {
    auth: { getSession: mocks.getSession, mfa: { getAuthenticatorAssuranceLevel: mocks.assurance } },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
  },
}));

const profile: UserProfile = {
  id: 'admin', fullName: 'Admin', email: 'admin@example.com', phone: '12345678',
  role: 'admin', isLoggedIn: true,
};

beforeEach(() => {
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'admin' } } }, error: null });
  mocks.assurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal1' }, error: null });
  mocks.profile.mockResolvedValue({ data: {
    id: profile.id, full_name: profile.fullName, email: profile.email,
    phone: profile.phone, role: 'admin', status: 'active',
  }, error: null });
});

describe('Perfil y permisos de Supabase', () => {
  it('usa el rol guardado en public.users', async () => {
    expect(await fetchMyProfile()).toEqual(profile);
  });
  it('muestra los errores de consulta del perfil', async () => {
    mocks.profile.mockResolvedValue({ data: null, error: new Error('Permiso denegado') });
    await expect(fetchMyProfile()).rejects.toThrow('Permiso denegado');
  });
  it('rechaza cuentas bloqueadas', async () => {
    mocks.profile.mockResolvedValue({ data: { ...profile, status: 'blocked' }, error: null });
    await expect(fetchMyProfile()).rejects.toThrow('bloqueada');
  });
  it('no abre una sesión administrativa para clientes', async () => {
    expect(await fetchAdminSession({ ...profile, role: 'client' })).toBeNull();
    expect(mocks.assurance).not.toHaveBeenCalled();
  });
  it('admite administradores sin MFA inscrito', async () => {
    expect(await fetchAdminSession(profile)).toEqual({ name: 'Admin', role: 'admin', email: profile.email });
  });
  it('impide abrir el panel si falta el segundo factor', async () => {
    mocks.assurance.mockResolvedValue({ data: { currentLevel: 'aal1', nextLevel: 'aal2' }, error: null });
    expect(await fetchAdminSession(profile)).toBeNull();
  });
  it('restaura el acceso cuando el segundo factor ya fue verificado', async () => {
    mocks.assurance.mockResolvedValue({ data: { currentLevel: 'aal2', nextLevel: 'aal2' }, error: null });
    expect((await fetchAdminSession(profile))?.role).toBe('admin');
  });
});
