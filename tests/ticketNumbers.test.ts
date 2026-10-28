import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAvailableTicketNumbers } from '../src/lib/ticketNumbers';

const options = {
  count: 3, takenNumbers: [] as string[], poolSize: 100, minimumDigits: 5,
  canExpand: true, remainingTickets: null,
};
afterEach(() => vi.restoreAllMocks());

describe('Selección de números globales', () => {
  it('genera un lote grande sin duplicados ni colisiones con números ocupados', () => {
    const taken = Array.from({ length: 1000 }, (_, index) => String(index + 1).padStart(4, '0'));
    const numbers = generateAvailableTicketNumbers({ ...options, count: 10000, poolSize: 10000, takenNumbers: taken });
    expect(numbers).toHaveLength(10000);
    expect(new Set(numbers.map(Number)).size).toBe(10000);
    expect(numbers.every((number) => Number(number) > 1000 && number.length >= 5)).toBe(true);
  });
  it('compara por valor numérico e impide repetir un número pagado en los regalos', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const numbers = generateAvailableTicketNumbers({
      ...options, count: 2, takenNumbers: ['1', '00001'], currentSelected: ['000002'],
    });
    expect(numbers).toEqual(['00003', '00004']);
  });
  it('permite números superiores al cupo de la rifa sin sobrepasar su cantidad disponible', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const numbers = generateAvailableTicketNumbers({
      ...options, count: 10, poolSize: 2, takenNumbers: ['00001', '00002'], remainingTickets: 1,
    });
    expect(numbers).toEqual(['00003']);
  });
  it('cuenta los números ya seleccionados al calcular el espacio para regalos', () => {
    const numbers = generateAvailableTicketNumbers({ ...options, currentSelected: ['1', '00001'], remainingTickets: 2 });
    expect(numbers).toHaveLength(1);
    expect(Number(numbers[0])).not.toBe(1);
  });
  it('devuelve una lista vacía cuando no quedan cupos', () => {
    expect(generateAvailableTicketNumbers({ ...options, remainingTickets: 0 })).toEqual([]);
  });
  it('conserva el rango y el formato anteriores mientras no se haya migrado Supabase', () => {
    expect(generateAvailableTicketNumbers({
      ...options, count: 1, canExpand: false, minimumDigits: 4,
      poolSize: 2, takenNumbers: ['0001', '0002'],
    })).toEqual([]);
  });
});
