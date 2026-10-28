import React, { useState } from 'react';
import { 
  CheckCircle2, XCircle, Clock, Eye, Search, Filter, ShieldCheck, 
  AlertTriangle, DollarSign, Building2, User, Phone, Hash, ArrowUpRight,
  ExternalLink, ZoomIn, FileText, Check, Plus, MessageSquare
} from 'lucide-react';
import { PaymentReport, Ticket, BankAccount } from '../../types';

interface AdminPaymentsTabProps {
  paymentReports?: PaymentReport[];
  bankAccounts?: BankAccount[];
  onVerifyPayment: (reportId: string, approved: boolean, notes?: string) => void;
  onInspectReport?: (report: PaymentReport) => void;
}

export const AdminPaymentsTab: React.FC<AdminPaymentsTabProps> = ({
  paymentReports = [],
  bankAccounts = [],
  onVerifyPayment,
}) => {
  const isReceiptPdf = (url?: string) => !!url && /\.pdf(\?|$)/i.test(url);

  const [selectedStatus, setSelectedStatus] = useState<string>('pending');
  const [selectedBank, setSelectedBank] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const safeReports = paymentReports || [];
  const safeBanks = bankAccounts || [];

  // Active inspect modal
  const [activeReport, setActiveReport] = useState<PaymentReport | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Referencia no encontrada en extracto bancario');
  const [customRejectNote, setCustomRejectNote] = useState<string>('');
  const [isRejecting, setIsRejecting] = useState<boolean>(false);

  // Manual payment modal
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualBank, setManualBank] = useState('Banreservas');
  const [manualRef, setManualRef] = useState('');
  const [manualAmount, setManualAmount] = useState(1500);
  const [manualTickets, setManualTickets] = useState('');

  // Filtered reports
  const filteredReports = safeReports.filter((rep) => {
    const matchesStatus = selectedStatus === 'all' || rep.status === selectedStatus;
    const matchesBank = selectedBank === 'all' || (rep.destinationBank || '').toLowerCase().includes(selectedBank.toLowerCase());
    const matchesSearch =
      (rep.senderName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rep.senderPhone || '').includes(searchQuery) ||
      (rep.ticketNumbers || []).some((n) => n.includes(searchQuery));
    return matchesStatus && matchesBank && matchesSearch;
  });

  const handleApprove = (reportId: string) => {
    onVerifyPayment(reportId, true, 'Verificado conforme en cuenta bancaria.');
    setActiveReport(null);
    setIsRejecting(false);
  };

  const handleRejectConfirm = (reportId: string) => {
    const note = customRejectNote.trim() ? `${rejectReason} - ${customRejectNote}` : rejectReason;
    onVerifyPayment(reportId, false, note);
    setActiveReport(null);
    setIsRejecting(false);
    setCustomRejectNote('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Verificación & Auditoría de Pagos</span>
            <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {safeReports.filter((p) => p.status === 'pending').length} Pendientes
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Cotejo estricto de transferencias bancarias de Banreservas, BHD y Popular antes de confirmar boletos oficiales.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-2 rounded-2xl">
            Total Histórico: RD$ {safeReports.filter(p => p.status === 'verified').reduce((a, b) => a + (b.amount || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        {/* Status tabs */}
        <div className="sm:col-span-6 flex flex-wrap items-center gap-1.5">
          {[
            { id: 'pending', label: 'Pendientes' },
            { id: 'verified', label: 'Verificados' },
            { id: 'rejected', label: 'Rechazados' },
            { id: 'all', label: 'Todos' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bank select */}
        <div className="sm:col-span-3">
          <select
            value={selectedBank}
            onChange={(e) => setSelectedBank(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos los Bancos RD</option>
            <option value="Banreservas">Banreservas</option>
            <option value="BHD">Banco BHD</option>
            <option value="Popular">Banco Popular</option>
          </select>
        </div>

        {/* Search */}
        <div className="sm:col-span-3 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por Ref, Cliente o Boleto..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-600">No se encontraron reportes de pago</p>
            <p className="text-xs text-slate-400">Todos los comprobantes de este filtro han sido procesados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-4">Recibo / Fecha</th>
                  <th className="p-4">Comprador</th>
                  <th className="p-4">Banco Destino & Ref</th>
                  <th className="p-4">Rifa & Boletos</th>
                  <th className="p-4 text-right">Monto</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Voucher thumbnail & timestamp */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {report.receiptUrl && isReceiptPdf(report.receiptUrl) ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReport(report);
                              setIsRejecting(false);
                            }}
                            className="w-12 h-12 rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:scale-110 transition-transform shrink-0 flex items-center justify-center bg-red-50"
                          >
                            <FileText className="w-5 h-5 text-red-500" />
                          </button>
                        ) : report.receiptUrl ? (
                          <img
                            src={report.receiptUrl}
                            alt="Recibo"
                            onClick={() => {
                              setActiveReport(report);
                              setIsRejecting(false);
                            }}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer hover:scale-110 transition-transform shrink-0"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveReport(report);
                              setIsRejecting(false);
                            }}
                            title="Este reporte no tiene comprobante adjunto"
                            className="w-12 h-12 rounded-xl border border-amber-300 bg-amber-50 shadow-2xs cursor-pointer hover:scale-110 transition-transform shrink-0 flex items-center justify-center"
                          >
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                          </button>
                        )}
                        <div>
                          <span className="font-bold text-slate-900 block font-mono text-[11px]">
                            {new Date(report.submittedAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(report.submittedAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Sender Info */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-extrabold text-slate-900 block">{report.senderName}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{report.senderPhone}</span>
                        {report.senderEmail && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                            {report.senderEmail}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Bank & Reference */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{report.destinationBank}</span>
                        </span>
                        <div className="bg-slate-100 px-2 py-0.5 rounded-md font-mono text-[11px] font-extrabold text-slate-800 inline-block">
                          Ref: {report.referenceNumber}
                        </div>
                      </div>
                    </td>

                    {/* Raffle & Tickets */}
                    <td className="p-4 max-w-[200px]">
                      <div className="space-y-1">
                        <span className="font-medium text-slate-700 block truncate">{report.raffleTitle}</span>
                        <div className="flex flex-wrap gap-1">
                          {report.ticketNumbers.map((num) => (
                            <span
                              key={num}
                              className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono font-bold text-[10px]"
                            >
                              #{num}
                            </span>
                          ))}
                        </div>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="p-4 text-right">
                      <span className="font-black text-slate-900 font-mono text-sm block">
                        RD$ {report.amount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({report.ticketNumbers.length} x RD${Math.floor(report.amount / report.ticketNumbers.length)})
                      </span>
                    </td>

                    {/* Status Pill */}
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          report.status === 'verified'
                            ? 'bg-emerald-100 text-emerald-800'
                            : report.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 animate-pulse'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {report.status === 'verified' && <CheckCircle2 className="w-3 h-3" />}
                        {report.status === 'pending' && <Clock className="w-3 h-3" />}
                        {report.status === 'rejected' && <XCircle className="w-3 h-3" />}
                        <span>{report.status === 'verified' ? 'Verificado' : report.status === 'pending' ? 'Por Auditar' : 'Rechazado'}</span>
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReport(report);
                            setIsRejecting(false);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver</span>
                        </button>

                        {report.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(report.id)}
                            className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
                            title="Aprobar Inmediatamente"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Aprobar</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DETAILED INSPECTION & VERIFICATION MODAL */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>Auditoría de Comprobante #{activeReport.referenceNumber}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      activeReport.status === 'verified'
                        ? 'bg-emerald-100 text-emerald-800'
                        : activeReport.status === 'pending'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {activeReport.status.toUpperCase()}
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Valida que los fondos hayan ingresado en el extracto bancario oficial antes de liberar boletos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Content: Voucher preview on left, transaction details on right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Voucher Image */}
              <div className="md:col-span-5 space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Comprobante Bancario Subido</label>
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 group">
                  {!activeReport.receiptUrl ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center gap-2 text-amber-400 bg-slate-900">
                      <AlertTriangle className="w-8 h-8" />
                      <span className="text-xs font-bold text-center px-4">
                        Este reporte no tiene comprobante adjunto. No apruebes el pago sin verificarlo por otra vía.
                      </span>
                    </div>
                  ) : isReceiptPdf(activeReport.receiptUrl) ? (
                    <div className="w-full h-64 flex flex-col items-center justify-center gap-2 text-white bg-slate-900">
                      <FileText className="w-10 h-10 text-red-400" />
                      <span className="text-xs font-bold">Comprobante en PDF</span>
                    </div>
                  ) : (
                    <img
                      src={activeReport.receiptUrl}
                      alt="Comprobante"
                      className="w-full h-64 object-contain"
                    />
                  )}
                  {activeReport.receiptUrl && (
                    <a
                      href={activeReport.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold flex items-center gap-1 hover:bg-black"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>Ver en alta resolución</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Data checklist */}
              <div className="md:col-span-7 space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-medium">Monto Reportado:</span>
                    <span className="font-mono font-black text-base text-emerald-700">
                      RD$ {activeReport.amount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-medium">Banco Destino:</span>
                    <span className="font-bold text-slate-900">{activeReport.destinationBank}</span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-medium">Número de Referencia:</span>
                    <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {activeReport.referenceNumber}
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-slate-200/60 pb-1.5">
                    <span className="text-slate-500 font-medium">Titular / Pagador:</span>
                    <span className="font-bold text-slate-900">{activeReport.senderName} ({activeReport.senderPhone})</span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <span className="text-slate-500 font-medium block">Boletos a Asignar:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeReport.ticketNumbers.map((num) => (
                        <span
                          key={num}
                          className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-mono font-extrabold text-xs text-slate-900"
                        >
                          #{num}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Reject Section (if toggled) */}
                {isRejecting ? (
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-3">
                    <h4 className="text-xs font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Motivo del Rechazo (Se enviará al comprador)</span>
                    </h4>

                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs text-slate-900 font-medium"
                    >
                      <option value="Referencia no encontrada en extracto bancario">Referencia no encontrada en extracto bancario</option>
                      <option value="Monto transferido no coincide con el total de boletos">Monto transferido no coincide con el total de boletos</option>
                      <option value="Comprobante ilegible o borroso">Comprobante ilegible o borroso</option>
                      <option value="Transferencia realizada a cuenta incorrecta">Transferencia realizada a cuenta incorrecta</option>
                      <option value="Comprobante duplicado ya utilizado">Comprobante duplicado ya utilizado</option>
                    </select>

                    <input
                      type="text"
                      value={customRejectNote}
                      onChange={(e) => setCustomRejectNote(e.target.value)}
                      placeholder="Nota adicional (opcional)..."
                      className="w-full px-3 py-2 rounded-xl bg-white border border-rose-300 text-xs text-slate-900"
                    />

                    <div className="flex items-center justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsRejecting(false)}
                        className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRejectConfirm(activeReport.id)}
                        className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                      >
                        Confirmar Rechazo
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons */
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(true)}
                      className="px-4 py-2.5 rounded-2xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Rechazar Pago</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleApprove(activeReport.id)}
                      className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aprobar y Confirmar Boletos</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
