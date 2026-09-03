import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Clock, Trophy, Lock, Eye, ExternalLink, X, Gift, CalendarDays, FileText, Download } from 'lucide-react';
import { Ticket, TicketStatus } from '../types';
import { generateTicketImage } from '../lib/ticketPdfGenerator';
import { BrandedQRCode } from './BrandedQRCode';

interface TicketCardProps {
  ticket: Ticket;
  onViewRaffle?: (raffleId: string) => void;
  /** true cuando este boleto fue abierto vía QR y debe pedir descarga automáticamente */
  autoDownload?: boolean;
  /** se llama en cuanto se atiende el autoDownload, para que el padre limpie el estado */
  onAutoDownloadHandled?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onViewRaffle, autoDownload, onAutoDownloadHandled }) => {
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const ticketDisplayId = ticket.id.split('-').pop()?.replace(/\D/g, '') || ticket.id.replace(/\D/g, '');

  // Cuando se llega a este boleto escaneando su código QR, preguntamos
  // automáticamente si se desea descargar (una sola vez).
  useEffect(() => {
    if (!autoDownload) return;
    setShowDownloadModal(true);
    onAutoDownloadHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload]);

  const handleDownloadClick = () => {
    setShowDownloadModal(true);
  };

  const handleConfirmDownload = async () => {
    setShowDownloadModal(false);
    setIsDownloadingImage(true);
    try {
      if (!cardRef.current) throw new Error('No se encontró el boleto en pantalla');
      // Captura el boleto tal cual se ve (mismo diseño), no una plantilla aparte.
      await generateTicketImage(ticket, cardRef.current);
    } catch (error) {
      console.error('Error descargando boleto:', error);
    } finally {
      setIsDownloadingImage(false);
    }
  };
  const status = (value: TicketStatus) => {
    if (value === 'pending_payment') return { label: 'PENDIENTE DE VERIFICACIÓN', icon: <Clock className="h-3.5 w-3.5" />, bar: 'bg-amber-500', badge: 'bg-amber-100 text-amber-900 border-amber-300' };
    if (value === 'confirmed') return { label: 'VERIFICADO Y CONFIRMADO', icon: <ShieldCheck className="h-3.5 w-3.5" />, bar: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-900 border-emerald-300' };
    if (value === 'winner') return { label: '¡BOLETO GANADOR!', icon: <Trophy className="h-3.5 w-3.5" />, bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-950 border-yellow-400' };
    return { label: 'CANCELADO / REEMBOLSADO', icon: <Lock className="h-3.5 w-3.5" />, bar: 'bg-slate-500', badge: 'bg-slate-100 text-slate-700 border-slate-300' };
  };
  const currentStatus = status(ticket.status);

  return <>
    <article ref={cardRef} id={`ticket-${ticket.id}`} className="relative overflow-hidden rounded-2xl border-2 border-slate-400 bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 shadow-md">
      <div className={`h-1.5 ${currentStatus.bar}`} />
      <div className="flex items-center justify-between gap-2 border-b border-slate-400/70 bg-gradient-to-r from-slate-300/90 to-slate-100/80 px-3 py-2 sm:px-4">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-black tracking-wide shadow-sm sm:text-[10px] ${currentStatus.badge}`}>{currentStatus.icon}{currentStatus.label}</span>
        {ticket.isBonusTicket && <span className="hidden items-center gap-1 rounded-full bg-amber-300 px-2 py-1 text-[9px] font-black text-amber-950 sm:inline-flex"><Gift className="h-3 w-3" /> GRATIS</span>}
        <span className="ml-auto inline-flex items-center gap-4 font-mono font-black text-slate-900"><span className="text-[16px]">Ticket oficial #{ticket.ticketNumber}</span><span className="text-[12px] text-slate-600">ID: #{ticketDisplayId}</span></span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[240px_1fr_155px] sm:items-center sm:gap-4 sm:p-4">
        <img src={ticket.raffleCover} alt={ticket.raffleTitle} className="h-36 w-full rounded-xl border-2 border-slate-400 object-cover shadow-sm sm:h-[155px] sm:w-[240px]" />
        <div className="min-w-0 self-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-800">PARTICIPACIÓN OFICIAL</p>
          <h3 className="mt-1 text-base font-black leading-tight text-slate-900 sm:text-lg">{ticket.raffleTitle}</h3>
          <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] font-medium text-slate-700 sm:grid-cols-2"><span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Sorteo: <strong>{ticket.drawDate}</strong></span><span className="inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" /> Ref: <strong className="font-mono">{ticket.referenceNumber}</strong></span><span className="sm:col-span-2">Banco: <strong>{ticket.bankUsed}</strong></span></div>
        </div>
        <div className="flex flex-col items-center justify-center gap-3"><div className="flex justify-center w-full"><BrandedQRCode ticket={ticket} size={155} logoSize={51} /></div></div>
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-400/80 bg-slate-300/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"><span className="text-xs font-medium text-slate-800">{ticket.isBonusTicket ? 'Boleto de regalo · RD$ 0' : <>Monto pagado: <strong className="font-mono">RD$ {ticket.pricePaid.toLocaleString()}</strong></>}</span><div data-html2canvas-ignore="true" className="flex flex-col gap-2 w-full sm:flex-row sm:w-auto">{onViewRaffle && <button type="button" onClick={() => onViewRaffle(ticket.raffleId)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-emerald-700 bg-emerald-100 px-3 py-1.5 text-[11px] font-black text-emerald-900 shadow-sm hover:bg-emerald-200 sm:flex-none"><ExternalLink className="h-3.5 w-3.5" /> Ver Rifa</button>}<button type="button" onClick={() => setShowDetailsModal(true)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-blue-700 bg-blue-100 px-3 py-1.5 text-[11px] font-black text-blue-900 shadow-sm hover:bg-blue-200 sm:flex-none"><Eye className="h-3.5 w-3.5" /> Ver Certificado</button><button type="button" onClick={handleDownloadClick} disabled={isDownloadingImage} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-purple-700 bg-purple-100 px-3 py-1.5 text-[11px] font-black text-purple-900 shadow-sm hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed sm:flex-none"><Download className="h-3.5 w-3.5" /> {isDownloadingImage ? 'Descargando...' : 'Descargar Boleto'}</button></div></div>
    </article>

    {showDetailsModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setShowDetailsModal(false)}><div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="flex items-center gap-2 text-sm font-extrabold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Certificado #{ticket.ticketNumber}</h3><button type="button" onClick={() => setShowDetailsModal(false)} aria-label="Cerrar"><X className="h-4 w-4 text-slate-500" /></button></div><div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs"><div className="flex justify-between gap-3"><span className="text-slate-500">Titular</span><strong>{ticket.userName}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Teléfono</span><strong className="font-mono">{ticket.userPhone}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Banco</span><strong>{ticket.bankUsed}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Estado</span><strong className="text-emerald-700">{currentStatus.label}</strong></div></div><button type="button" onClick={() => setShowDetailsModal(false)} className="w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800">Cerrar</button></div></div>}

    {showDownloadModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setShowDownloadModal(false)}><div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 pb-4"><h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Download className="h-5 w-5 text-purple-600" /> Descargar Boleto</h3><button type="button" onClick={() => setShowDownloadModal(false)} aria-label="Cerrar"><X className="h-5 w-5 text-slate-500" /></button></div><div className="space-y-3"><p className="text-sm text-slate-700">¿Deseas descargar la imagen de tu boleto en alta calidad?</p><p className="text-xs text-slate-500">Se descargará como una imagen PNG para que puedas guardarla en tu dispositivo (iPhone, Android o PC).</p><div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowDownloadModal(false)} className="flex-1 rounded-lg border border-slate-300 bg-slate-100 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-200">No, cancelar</button><button type="button" onClick={handleConfirmDownload} disabled={isDownloadingImage} className="flex-1 rounded-lg bg-purple-600 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">{isDownloadingImage ? 'Descargando...' : 'Sí, descargar'}</button></div></div></div></div>}
  </>;
};
