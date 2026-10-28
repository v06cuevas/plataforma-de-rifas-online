import React from 'react';
import { act, cleanup, configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';
import type { UserProfile } from '../src/types';

configure({ asyncUtilTimeout: 5000 });

const mocks = vi.hoisted(() => ({
  authCallback: null as null | ((event: string) => void),
  api: Object.fromEntries([
    'fetchMyProfile', 'fetchAdminSession', 'fetchActiveRaffles', 'fetchBankAccounts',
    'fetchDrawResults', 'fetchMyTickets', 'fetchMySupportConversations',
    'fetchAllRafflesForAdmin', 'fetchAllTicketsForAdmin', 'fetchAllPaymentReportsForAdmin',
    'fetchAllSupportConversationsForAdmin', 'fetchManagedUsers', 'fetchAuditLogs',
    'loginClient', 'loginAdmin', 'logout', 'fetchTicketNumberAvailability',
  ].map((name) => [name, vi.fn()])) as Record<string, ReturnType<typeof vi.fn>>,
}));

vi.mock('../src/lib/api', () => mocks.api);
vi.mock('../src/lib/supabaseClient', () => ({
  supabase: { auth: { onAuthStateChange: vi.fn((callback) => {
    mocks.authCallback = callback;
    const timer = setTimeout(() => callback('INITIAL_SESSION'), 0);
    return { data: { subscription: { unsubscribe: () => clearTimeout(timer) } } };
  }) } },
}));
vi.mock('../src/lib/realtimeSubscriptions', () => ({
  subscribeToRealtimeUpdates: () => () => {},
  startPollingFallback: () => () => {},
}));
vi.mock('../src/components/HomeView', () => ({ HomeView: () => <h1>Rifas disponibles</h1> }));

const admin: UserProfile = {
  id: 'admin-id', fullName: 'Administradora de prueba', email: 'admin@example.com',
  phone: '12345678', role: 'admin', isLoggedIn: true,
};
const client: UserProfile = { ...admin, id: 'client-id', role: 'client', fullName: 'Cliente de prueba' };

beforeEach(() => {
  for (const fn of Object.values(mocks.api)) fn.mockReset().mockResolvedValue([]);
  mocks.api.fetchMyProfile.mockResolvedValue(null);
  mocks.api.fetchAdminSession.mockImplementation(async (profile) => profile?.role === 'admin'
    ? { name: profile.fullName, role: 'admin', email: profile.email } : null);
  mocks.api.loginClient.mockResolvedValue(admin);
  mocks.api.loginAdmin.mockResolvedValue({ name: admin.fullName, role: 'admin', email: admin.email });
  mocks.api.logout.mockImplementation(async () => { mocks.authCallback?.('SIGNED_OUT'); });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(cleanup);

async function expectDashboard() {
  await screen.findByText('Panel Administrativo RD');
}

async function loginNormally(profile = admin) {
  await screen.findByText('Rifas disponibles');
  fireEvent.click(screen.getByRole('button', { name: /Ingresar \/ Registro/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Ya Compré Boletos' }));
  const form = screen.getByRole('button', { name: 'Consultar Mis Boletos' }).closest('form')!;
  fireEvent.change(form.querySelector('input[type="email"]')!, { target: { value: profile.email } });
  fireEvent.change(form.querySelector('input[type="password"]')!, { target: { value: 'test-password' } });
  mocks.api.loginClient.mockResolvedValue(profile);
  mocks.api.fetchMyProfile.mockResolvedValue(profile);
  fireEvent.submit(form);
}

describe('Acceso administrativo', () => {
  it('abre el panel al entrar como administrador desde el acceso normal', async () => {
    render(<App />);
    await loginNormally();
    await expectDashboard();
    expect(mocks.api.fetchAllRafflesForAdmin).toHaveBeenCalled();
    expect(mocks.api.fetchBankAccounts).toHaveBeenCalledWith(false);
  });

  it('restaura la sesión administrativa al recargar la página', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    render(<App />);
    await expectDashboard();
  });

  it('abre el panel desde el portal administrativo', async () => {
    render(<App />);
    await screen.findByText('Rifas disponibles');
    fireEvent.click(screen.getByRole('button', { name: 'Seguridad Notarial' }));
    const form = (await screen.findByRole('button', { name: 'Entrar al panel' })).closest('form')!;
    fireEvent.change(form.querySelector('input[type="email"]')!, { target: { value: admin.email } });
    fireEvent.change(form.querySelector('input[type="password"]')!, { target: { value: 'test-password' } });
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    fireEvent.submit(form);
    await expectDashboard();
  });

  it('mantiene a los clientes en la vista pública', async () => {
    render(<App />);
    await loginNormally(client);
    await screen.findByText('Cliente de prueba');
    expect(screen.queryByText('Panel Administrativo RD')).toBeNull();
    expect(mocks.api.fetchAllRafflesForAdmin).not.toHaveBeenCalled();
  });

  it('pide completar MFA antes de mostrar el panel', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    mocks.api.fetchAdminSession.mockResolvedValue(null);
    render(<App />);
    await screen.findByRole('button', { name: 'Entrar al panel' });
    expect(screen.queryByText('Panel Administrativo RD')).toBeNull();
    expect(mocks.api.fetchAllRafflesForAdmin).not.toHaveBeenCalled();
  });

  it('abre el panel aunque falle una sección y permite reintentar', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    mocks.api.fetchAuditLogs.mockRejectedValueOnce(new Error('Consulta no disponible'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<App />);
    await expectDashboard();
    expect((await screen.findByRole('alert')).textContent).toContain('auditoría');
    await waitFor(() => expect(screen.queryByText('Cargando datos del panel…')).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar carga' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(mocks.api.fetchAuditLogs).toHaveBeenCalledTimes(2);
  });

  it('abre el panel antes de que terminen las consultas lentas', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    mocks.api.fetchAllTicketsForAdmin.mockReturnValue(new Promise(() => {}));
    render(<App />);
    await expectDashboard();
    expect((await screen.findByRole('status')).textContent).toContain('Cargando datos');
  });

  it('actualiza la lista de usuarios que llega después de abrir el panel', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    let finishUsers!: (users: unknown[]) => void;
    mocks.api.fetchManagedUsers.mockReturnValue(new Promise((resolve) => { finishUsers = resolve; }));
    render(<App />);
    await expectDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Gestión de Usuarios' }));
    await act(async () => { finishUsers([{
      id: 'new-user', fullName: 'Usuario cargado', email: 'user@example.com', phone: '12345678',
      role: 'client', status: 'active', totalTicketsBought: 0, totalSpent: 0,
      joinedDate: '2026-01-01T00:00:00Z', lastActive: '2026-01-01T00:00:00Z',
    }]); });
    await screen.findByText('Usuario cargado');
  });

  it('retira el acceso si Supabase cambia el rol a cliente', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    render(<App />);
    await expectDashboard();
    mocks.api.fetchMyProfile.mockResolvedValue({ ...admin, role: 'client' });
    act(() => { mocks.authCallback?.('USER_UPDATED'); });
    await screen.findByText('Rifas disponibles');
    expect(screen.queryByRole('button', { name: /Abrir Panel Admin/ })).toBeNull();
  });

  it('limpia el panel al cerrar sesión e ignora respuestas administrativas pendientes', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    let finishUsers!: (users: unknown[]) => void;
    mocks.api.fetchManagedUsers.mockReturnValue(new Promise((resolve) => { finishUsers = resolve; }));
    render(<App />);
    await expectDashboard();
    act(() => { mocks.authCallback?.('SIGNED_OUT'); });
    await screen.findByText('Rifas disponibles');
    await act(async () => { finishUsers([{ id: 'private-user', fullName: 'Dato privado' }]); });
    expect(screen.queryByText('Panel Administrativo RD')).toBeNull();
    expect(screen.queryByText('Dato privado')).toBeNull();
  });

  it('mantiene la navegación elegida al renovar una sesión administrativa', async () => {
    mocks.api.fetchMyProfile.mockResolvedValue(admin);
    render(<App />);
    await expectDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Web Cliente' }));
    await screen.findByText('Rifas disponibles');
    act(() => { mocks.authCallback?.('TOKEN_REFRESHED'); });
    await waitFor(() => expect(mocks.api.fetchMyProfile).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Panel Administrativo RD')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Abrir Panel Admin/ }));
    await expectDashboard();
  });
});
