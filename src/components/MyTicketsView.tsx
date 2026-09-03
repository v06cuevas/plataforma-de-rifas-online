import React, { useState, useEffect } from 'react';
import { Clock, Trophy, ArrowRight } from 'lucide-react';
import { Ticket, TicketStatus, UserProfile } from '../types';
import { TicketCard } from './TicketCard';

interface MyTicketsViewProps {
  tickets?: Ticket[];
  user?: UserProfile;
  onExploreRaffles: () => void;
  onViewRaffle: (raffleId: string) => void;
  onNavigateToSupport: () => void;
  /** ID del boleto al que se llegó escaneando su código QR */
  focusTicketId?: string | null;
  /** se llama en cuanto ya se ubicó/atendió el boleto del QR */
  onFocusHandled?: () => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({ tickets = [], onExploreRaffles, onViewRaffle, focusTicketId, onFocusHandled }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const safeTickets = tickets || [];
  const pendingCount = safeTickets.filter((ticket) => ticket.status === 'pending_payment').length;
  const confirmedCount = safeTickets.filter((ticket) => ticket.status === 'confirmed').length;
  const winnerCount = safeTickets.filter((ticket) => ticket.status === 'winner').length;

  // Si venimos de escanear el QR de un boleto que quedó fuera del filtro
  // actual (ej. filtro "Confirmados" pero el boleto está "Pendiente"),
  // mostramos "Todos" para asegurar que sea visible.
  useEffect(() => {
    if (focusTicketId) setStatusFilter('all');
  }, [focusTicketId]);

  const filteredTickets = safeTickets.filter((ticket) => statusFilter === 'all' || ticket.status === statusFilter);
  const focusedTicket = focusTicketId ? safeTickets.find((ticket) => ticket.id === focusTicketId) : undefined;

  // Hace scroll hasta el boleto escaneado en cuanto está disponible en la lista.
  useEffect(() => {
    if (!focusedTicket) return;
    const el = document.getElementById(`ticket-${focusedTicket.id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedTicket]);

  return <div className="mx-auto w-full max-w-5xl space-y-4 pb-24 md:pb-12">
    <div className="flex items-center gap-2 overflow-x-auto pb-1">
      <button type="button" onClick={() => setStatusFilter('all')} className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold ${statusFilter === 'all' ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>Todos ({safeTickets.length})</button>
      <button type="button" onClick={() => setStatusFilter('pending_payment')} className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold ${statusFilter === 'pending_payment' ? 'bg-amber-600 text-white' : 'border border-amber-200 bg-white text-amber-800'}`}><Clock className="h-3 w-3" /> Pendientes ({pendingCount})</button>
      <button type="button" onClick={() => setStatusFilter('confirmed')} className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold ${statusFilter === 'confirmed' ? 'bg-emerald-600 text-white' : 'border border-emerald-200 bg-white text-emerald-800'}`}>Confirmados ({confirmedCount})</button>
      {winnerCount > 0 && <button type="button" onClick={() => setStatusFilter('winner')} className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-bold ${statusFilter === 'winner' ? 'bg-yellow-500 text-slate-950' : 'border border-yellow-300 bg-white text-yellow-800'}`}><Trophy className="h-3 w-3" /> Ganadores ({winnerCount})</button>}
    </div>

    {filteredTickets.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><h3 className="font-extrabold text-slate-800">No se encontraron boletos</h3><p className="mt-1 text-xs text-slate-500">Participa en una rifa activa para obtener tu boleto.</p><button type="button" onClick={onExploreRaffles} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white"><span>Explorar rifas</span><ArrowRight className="h-3.5 w-3.5" /></button></div> : <div className="space-y-3">{filteredTickets.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} onViewRaffle={onViewRaffle} autoDownload={ticket.id === focusTicketId} onAutoDownloadHandled={onFocusHandled} />)}</div>}
  </div>;
};
