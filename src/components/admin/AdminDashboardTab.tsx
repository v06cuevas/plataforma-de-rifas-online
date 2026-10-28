import React from 'react';
import { 
  TrendingUp, ShieldCheck, Clock, Trophy, Users, DollarSign, ArrowUpRight, 
  CheckCircle2, AlertCircle, Building2, Ticket, ArrowRight, Eye, Calendar,
  Sparkles, Layers, RefreshCw, FileText, AlertTriangle
} from 'lucide-react';
import { Raffle, Ticket as TicketType, PaymentReport, DrawResult, ManagedUser, BankAccount, AdminTabType } from '../../types';

interface AdminDashboardTabProps {
  raffles?: Raffle[];
  tickets?: TicketType[];
  paymentReports?: PaymentReport[];
  drawResults?: DrawResult[];
  users?: ManagedUser[];
  bankAccounts?: BankAccount[];
  onNavigateTab: (tab: AdminTabType) => void;
  onInspectPayment: (report: PaymentReport) => void;
  onQuickVerify: (reportId: string, approved: boolean) => void;
}

export const AdminDashboardTab: React.FC<AdminDashboardTabProps> = ({
  raffles = [],
  tickets = [],
  paymentReports = [],
  drawResults = [],
  users = [],
  bankAccounts = [],
  onNavigateTab,
  onInspectPayment,
  onQuickVerify,
}) => {
  const safeTickets = tickets || [];
  const safePaymentReports = paymentReports || [];
  const safeRaffles = raffles || [];
  const safeUsers = users || [];
  const safeDrawResults = drawResults || [];
  const safeBankAccounts = bankAccounts || [];

  const confirmedTickets = safeTickets.filter((t) => t.status === 'confirmed');
  const pendingPayments = safePaymentReports.filter((p) => p.status === 'pending');
  const totalRevenue = confirmedTickets.reduce((acc, t) => acc + t.pricePaid, 0);

  // Bank breakdown calculations
  const banreservasRev = confirmedTickets
    .filter((t) => t.bankUsed?.toLowerCase().includes('banreservas'))
    .reduce((acc, t) => acc + t.pricePaid, 0);

  const bhdRev = confirmedTickets
    .filter((t) => t.bankUsed?.toLowerCase().includes('bhd'))
    .reduce((acc, t) => acc + t.pricePaid, 0);

  const popularRev = confirmedTickets
    .filter((t) => t.bankUsed?.toLowerCase().includes('popular'))
    .reduce((acc, t) => acc + t.pricePaid, 0);

  const activeRaffles = safeRaffles.filter((r) => r.status === 'active');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner Alert for Pending Verifications */}
      {pendingPayments.length > 0 && (
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">
                {pendingPayments.length} Comprobante(s) Bancario(s) por Validar
              </h4>
              <p className="text-xs text-slate-600">
                Compradores en espera de verificación para apartar sus boletos oficiales ante notario.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Ir a Validar Pagos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Recaudación Bruta</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              RD$ {totalRevenue.toLocaleString()}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>100% Conciliado con Bancos</span>
            </div>
          </div>
        </div>

        {/* Confirmed Tickets */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Boletos Confirmados</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Ticket className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {confirmedTickets.length}
            </span>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              De {raffles.reduce((acc, r) => acc + r.totalTickets, 0)} boletos disponibles
            </div>
          </div>
        </div>

        {/* Active Buyers */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Usuarios Registrados</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {safeUsers.length}
            </span>
            <div className="text-[11px] text-indigo-600 font-bold mt-1">
              {safeUsers.filter((u) => u.status === 'vip').length} Clientes VIP identificados
            </div>
          </div>
        </div>

        {/* Active Raffles */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Rifas Activas</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
              {activeRaffles.length}
            </span>
            <div className="text-[11px] text-purple-600 font-bold mt-1">
              De {safeRaffles.length} rifas en catálogo
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Payments Audit & Active Raffles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 cols: Urgent Payment Verification Stream */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="font-extrabold text-base text-slate-900">
                Auditoría Inmediata de Comprobantes
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('payments')}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <span>Ver Todos ({paymentReports.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {paymentReports.slice(0, 4).map((report) => (
            <div
              key={report.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                {report.receiptUrl && /\.pdf(\?|$)/i.test(report.receiptUrl) ? (
                  <button
                    type="button"
                    onClick={() => onInspectPayment(report)}
                    className="w-14 h-14 rounded-xl border border-slate-200 shadow-2xs shrink-0 flex items-center justify-center bg-red-50 hover:scale-105 transition-transform cursor-pointer"
                  >
                    <FileText className="w-5 h-5 text-red-500" />
                  </button>
                ) : report.receiptUrl ? (
                  <img
                    src={report.receiptUrl}
                    alt="Recibo"
                    onClick={() => onInspectPayment(report)}
                    className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer shrink-0 hover:scale-105 transition-transform"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onInspectPayment(report)}
                    title="Sin comprobante adjunto"
                    className="w-14 h-14 rounded-xl border border-amber-300 bg-amber-50 shadow-2xs shrink-0 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </button>
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{report.senderName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                        report.status === 'verified'
                          ? 'bg-emerald-100 text-emerald-800'
                          : report.status === 'pending'
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {report.status === 'verified' ? 'Verificado' : report.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {report.destinationBank} • Ref: <strong className="font-mono text-slate-800">{report.referenceNumber}</strong>
                  </p>
                  <p className="text-xs font-mono font-bold text-slate-900">
                    RD$ {report.amount.toLocaleString()} ({report.ticketNumbers.length} boleto{report.ticketNumbers.length > 1 ? 's' : ''})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onInspectPayment(report)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspeccionar</span>
                </button>

                {report.status === 'pending' && (
                  <button
                    type="button"
                    onClick={() => onQuickVerify(report.id, true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprobar</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right 5 cols: Bank Revenue Split & Active Raffles Quotas */}
        <div className="lg:col-span-5 space-y-6">
          {/* Bank Revenue Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Distribución Bancaria RD
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('bank_accounts')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Cuentas
              </button>
            </div>

            <div className="space-y-3">
              {/* Banreservas */}
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-blue-900 block">Banreservas</span>
                  <span className="text-[11px] text-blue-700">Cuenta Corriente #960-1234567-8</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-extrabold text-sm text-blue-950 block">
                    RD$ {banreservasRev.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-blue-600">
                    {totalRevenue > 0 ? Math.round((banreservasRev / totalRevenue) * 100) : 0}% del total
                  </span>
                </div>
              </div>

              {/* BHD */}
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-emerald-900 block">Banco BHD</span>
                  <span className="text-[11px] text-emerald-700">Cuenta de Ahorros #102-8765432-1</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-extrabold text-sm text-emerald-950 block">
                    RD$ {bhdRev.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-emerald-600">
                    {totalRevenue > 0 ? Math.round((bhdRev / totalRevenue) * 100) : 0}% del total
                  </span>
                </div>
              </div>

              {/* Banco Popular */}
              <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-200 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-sky-900 block">Banco Popular</span>
                  <span className="text-[11px] text-sky-700">Cuenta Corriente #798-234567-0</span>
                </div>
                <div className="text-right font-mono">
                  <span className="font-extrabold text-sm text-sky-950 block">
                    RD$ {popularRev.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-sky-600">
                    {totalRevenue > 0 ? Math.round((popularRev / totalRevenue) * 100) : 0}% del total
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Active Raffles Mini Status */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Progreso de Rifas Activas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('raffles')}
                className="text-xs font-bold text-slate-500 hover:text-slate-900"
              >
                Gestionar
              </button>
            </div>

            <div className="space-y-4">
              {activeRaffles.map((r) => {
                const confirmedCount = safeTickets.filter(
                  (t) => t.raffleId === r.id && t.status === 'confirmed'
                ).length;
                const percent = Math.min(100, Math.round((confirmedCount / r.totalTickets) * 100));

                return (
                  <div key={r.id} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900 truncate max-w-[200px]">{r.title}</span>
                      <span className="font-mono font-bold text-slate-700">{percent}% ({confirmedCount}/{r.totalTickets})</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
