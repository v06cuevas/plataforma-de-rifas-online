export const MAX_TICKET_NUMBER = 2147483647;

interface TicketNumberOptions {
  count: number;
  takenNumbers: Iterable<string>;
  currentSelected?: string[];
  poolSize: number;
  minimumDigits: number;
  canExpand: boolean;
  remainingTickets?: number | null;
}

// La selección en pantalla es provisional. El índice único de PostgreSQL
// decide la asignación definitiva, incluso si dos compradores eligen a la vez.
export function generateAvailableTicketNumbers({
  count, takenNumbers, currentSelected = [], poolSize, minimumDigits,
  canExpand, remainingTickets,
}: TicketNumberOptions): string[] {
  if (!Number.isSafeInteger(count) || count <= 0 || !Number.isSafeInteger(poolSize) || poolSize < 1) return [];
  const chosen = new Set(currentSelected.map(Number));
  const taken = new Set<number>();
  let largestTaken = 0;
  for (const value of takenNumbers) {
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > MAX_TICKET_NUMBER) continue;
    taken.add(number);
    largestTaken = Math.max(largestTaken, number);
  }
  const targetCount = remainingTickets == null ? count
    : Math.min(count, Math.max(0, remainingTickets - chosen.size));
  if (targetCount <= 0) return [];
  const maximum = Math.min(MAX_TICKET_NUMBER, canExpand
    ? Math.max(poolSize, largestTaken + targetCount + 200) : poolSize);
  const result: string[] = [];
  const add = (number: number) => {
    if (taken.has(number) || chosen.has(number)) return;
    chosen.add(number);
    result.push(String(number).padStart(minimumDigits, '0'));
  };
  const maxAttempts = Math.max(targetCount * 50, 1000);
  for (let attempts = 0; result.length < targetCount && attempts < maxAttempts; attempts++) {
    add(Math.floor(Math.random() * maximum) + 1);
  }
  for (let number = 1; result.length < targetCount && number <= maximum; number++) add(number);
  return result;
}
