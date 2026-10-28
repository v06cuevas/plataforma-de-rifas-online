import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchTicketNumberAvailability } from '../src/lib/api';

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../src/lib/supabaseClient', () => ({ supabase: { rpc: mocks.rpc } }));
beforeEach(() => mocks.rpc.mockReset());

describe('Protocolo de disponibilidad de boletos', () => {
  it('activa la numeración global cuando Supabase confirma la migración', async () => {
    const availability = { numbers: ['00001'], scope: 'platform', minimumDigits: 5, remainingTickets: 3 };
    mocks.rpc.mockResolvedValue({ data: availability, error: null });
    expect(await fetchTicketNumberAvailability('raffle')).toEqual(availability);
    expect(mocks.rpc).toHaveBeenCalledWith('get_ticket_number_availability', { p_raffle_id: 'raffle' });
  });
  it('conserva la compra anterior si todavía no se ejecutó la migración', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202' } })
      .mockResolvedValueOnce({ data: ['0001'], error: null });
    expect(await fetchTicketNumberAvailability('raffle')).toEqual({ numbers: ['0001'], scope: 'raffle', minimumDigits: 4 });
    expect(mocks.rpc).toHaveBeenLastCalledWith('get_taken_ticket_numbers', { p_raffle_id: 'raffle' });
  });
  it('muestra errores de permisos en lugar de tratarlos como disponibilidad vacía', async () => {
    const error = { code: '42501', message: 'Permiso denegado' };
    mocks.rpc.mockResolvedValue({ data: null, error });
    await expect(fetchTicketNumberAvailability('raffle')).rejects.toEqual(error);
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('rechaza una respuesta vacía o una rifa que no está disponible', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: null });
    await expect(fetchTicketNumberAvailability('raffle')).rejects.toThrow('disponibilidad');
  });
});
