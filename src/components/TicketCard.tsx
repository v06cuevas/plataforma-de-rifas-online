import React, { useState } from 'react';
import { ShieldCheck, Clock, Trophy, Lock, Eye, ExternalLink, X, Gift, CalendarDays, FileText } from 'lucide-react';
import { Ticket, TicketStatus } from '../types';

interface TicketCardProps { ticket: Ticket; onViewRaffle?: (raffleId: string) => void; }

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onViewRaffle }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const ticketDisplayId = ticket.id.split('-').pop()?.replace(/\D/g, '') || ticket.id.replace(/\D/g, '');
  const qrPayload = JSON.stringify({ ticket: ticket.ticketNumber, raffle: ticket.raffleId, reference: ticket.referenceNumber });
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=6&data=${encodeURIComponent(qrPayload)}`;
  const status = (value: TicketStatus) => {
    if (value === 'pending_payment') return { label: 'PENDIENTE DE VERIFICACIÓN', icon: <Clock className="h-3.5 w-3.5" />, bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (value === 'confirmed') return { label: 'VERIFICADO Y CONFIRMADO', icon: <ShieldCheck className="h-3.5 w-3.5" />, bar: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    if (value === 'winner') return { label: '¡BOLETO GANADOR!', icon: <Trophy className="h-3.5 w-3.5" />, bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-950 border-yellow-400' };
    return { label: 'CANCELADO / REEMBOLSADO', icon: <Lock className="h-3.5 w-3.5" />, bar: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-300' };
  };
  const currentStatus = status(ticket.status);

  return <>
    <article id={`ticket-${ticket.id}`} className="relative overflow-hidden rounded-2xl border-2 border-slate-400 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 shadow-md">
      <div className={`h-1.5 ${currentStatus.bar}`} />
      <div className="flex items-center justify-between gap-2 border-b border-slate-400/70 bg-gradient-to-r from-slate-300/90 to-slate-100/80 px-3 py-2 sm:px-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black tracking-wide shadow-sm sm:text-[10px] ${currentStatus.badge}`}>{currentStatus.icon}{currentStatus.label}</span>
        {ticket.isBonusTicket && <span className="hidden items-center gap-1 rounded-full bg-amber-300 px-2 py-1 text-[9px] font-black text-amber-950 sm:inline-flex"><Gift className="h-3 w-3" /> GRATIS</span>}
        <span className="ml-auto font-mono text-[9px] font-bold text-slate-600">ID: #{ticketDisplayId}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[180px_1fr_116px] sm:items-center sm:gap-4 sm:p-4">
        <img src={ticket.raffleCover} alt={ticket.raffleTitle} className="h-36 w-full rounded-xl border-2 border-slate-400 object-cover shadow-sm sm:h-[122px] sm:w-[180px]" />
        <div className="min-w-0 self-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800">PARTICIPACIÓN OFICIAL</p>
          <h3 className="mt-1 text-lg font-black leading-tight text-slate-900 sm:text-xl">{ticket.raffleTitle}</h3>
          <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] font-medium text-slate-700 sm:grid-cols-2"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Sorteo: <strong>{ticket.drawDate}</strong></span><span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Ref: <strong className="font-mono">{ticket.referenceNumber}</strong></span><span className="sm:col-span-2">Banco: <strong>{ticket.bankUsed}</strong></span></div>
        </div>
        <div className="flex items-center justify-between gap-3 rounded-xl border-2 border-slate-500 bg-slate-300/80 p-2 sm:flex-col sm:justify-center sm:gap-1"><div className="text-center"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-600">Ticket oficial</span><span className="block font-mono text-2xl font-black text-slate-900 sm:text-3xl">#{ticket.ticketNumber}</span></div><div className="w-16 rounded-md border border-slate-500 bg-white p-0.5 sm:w-20"><img src={qrImageUrl} alt={`Código QR del boleto ${ticket.ticketNumber}`} loading="lazy" className="aspect-square w-full object-contain" /></div></div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-400/80 bg-slate-300/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"><span className="text-xs font-medium text-slate-800">{ticket.isBonusTicket ? 'Boleto de regalo · RD$ 0' : <>Monto pagado: <strong className="font-mono">RD$ {ticket.pricePaid.toLocaleString()}</strong></>}</span><div className="flex gap-2">{onViewRaffle && <button type="button" onClick={() => onViewRaffle(ticket.raffleId)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-700 bg-emerald-100 px-3 py-1.5 text-[11px] font-black text-emerald-900 shadow-sm hover:bg-emerald-200 sm:flex-none"><ExternalLink className="h-3.5 w-3.5" /> Ver Rifa</button>}<button type="button" onClick={() => setShowDetailsModal(true)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-700 bg-blue-100 px-3 py-1.5 text-[11px] font-black text-blue-900 shadow-sm hover:bg-blue-200 sm:flex-none"><Eye className="h-3.5 w-3.5" /> Ver Certificado</button></div></div>
    </article>

    {showDetailsModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setShowDetailsModal(false)}><div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Certificado #{ticket.ticketNumber}</h3><button type="button" onClick={() => setShowDetailsModal(false)} aria-label="Cerrar"><X className="h-4 w-4 text-slate-500" /></button></div><div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs"><div className="flex justify-between gap-3"><span className="text-slate-500">Titular</span><strong>{ticket.userName}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Teléfono</span><strong className="font-mono">{ticket.userPhone}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Banco</span><strong>{ticket.bankUsed}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Estado</span><strong className="text-emerald-700">{currentStatus.label}</strong></div></div><button type="button" onClick={() => setShowDetailsModal(false)} className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Cerrar</button></div></div>}
  </>;
};
