import React, { useState } from 'react';
import { 
  DollarSign, TrendingUp, Download, Calendar, Building2, Ticket, 
  FileSpreadsheet, FileText, CheckCircle2, ArrowUpRight, Filter, Search,
  PieChart, BarChart3, CreditCard, Sparkles
} from 'lucide-react';
import { Raffle, Ticket as TicketType, PaymentReport, BankAccount } from '../../types';

interface AdminSalesTabProps {
  raffles?: Raffle[];
  tickets?: TicketType[];
  paymentReports?: PaymentReport[];
  bankAccounts?: BankAccount[];
}

export const AdminSalesTab: React.FC<AdminSalesTabProps> = ({
  raffles = [],
  tickets = [],
  paymentReports = [],
  bankAccounts = [],
}) => {
  const [selectedRange, setSelectedRange] = useState<'all' | 'today' | 'month'>('all');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const safeTickets = tickets || [];
  const safeReports = paymentReports || [];
  const safeRaffles = raffles || [];
  const safeBanks = bankAccounts || [];

  const confirmedTickets = safeTickets.filter((t) => t.status === 'confirmed');
  const verifiedPayments = safeReports.filter((p) => p.status === 'verified');

  const totalRevenue = confirmedTickets.reduce((acc, t) => acc + (t.pricePaid || 0), 0);

  // Bank splits
  const banreservasAmount = confirmedTickets
    .filter((t) => t.bankUsed?.toLowerCase().includes('banreservas'))
    .reduce((acc, t) => acc + (t.pricePaid || 0), 0);

  const bhdAmount = confirmedTickets
    .filter((t) => t.bankUsed?.toLowerCase().includes('bhd'))
    .reduce((acc, t) => acc + (t.pricePaid || 0), 0);

  const popularAmount = confirmedTickets
    .filter((t) => t.bankUsed?.toLowerCase().includes('popular'))
    .reduce((acc, t) => acc + (t.pricePaid || 0), 0);

  // Filtered transactions for the ledger
  const transactions = confirmedTickets.filter((t) => {
    const matchesBank = selectedBankFilter === 'all' || (t.bankUsed || '').toLowerCase().includes(selectedBankFilter.toLowerCase());
    const matchesSearch =
      (t.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.ticketNumber || '').includes(searchQuery) ||
      (t.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.raffleTitle || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesBank && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = 'ID,Boleto,Rifa,Comprador,Telefono,Banco,Referencia,Monto,FechaConfirmacion\n';
    const rows = confirmedTickets
      .map(
        (t) =>
          `"${t.id}","${t.ticketNumber}","${t.raffleTitle}","${t.userName}","${t.userPhone}","${t.bankUsed}","${t.referenceNumber}",${t.pricePaid},"${t.confirmedAt || t.createdAt}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Ventas_RifasCaribe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Reportes de Ventas & Tesorería</span>
            <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
              RD$ {totalRevenue.toLocaleString()} Brutos
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Conciliación de depósitos bancarios, distribución por rifas y libro mayor de transacciones para auditoría.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exportar a Excel / CSV</span>
        </button>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Banreservas Box */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-950 p-6 rounded-3xl text-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-200">Banreservas (Cuenta Corriente)</span>
            <Building2 className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <span className="text-3xl font-black font-mono tracking-tight">
              RD$ {banreservasAmount.toLocaleString()}
            </span>
            <div className="text-[11px] text-blue-300 mt-1 font-medium">
              {totalRevenue > 0 ? Math.round((banreservasAmount / totalRevenue) * 100) : 0}% de recaudación total
            </div>
          </div>
          <div className="text-[10px] text-blue-300/80 font-mono">
            {confirmedTickets.filter((t) => t.bankUsed?.toLowerCase().includes('banreservas')).length} boletos cobrados
          </div>
        </div>

        {/* BHD Box */}
        <div className="bg-gradient-to-br from-emerald-900 to-teal-950 p-6 rounded-3xl text-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-200">Banco BHD (Cuenta Ahorros)</span>
            <Building2 className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <span className="text-3xl font-black font-mono tracking-tight">
              RD$ {bhdAmount.toLocaleString()}
            </span>
            <div className="text-[11px] text-emerald-300 mt-1 font-medium">
              {totalRevenue > 0 ? Math.round((bhdAmount / totalRevenue) * 100) : 0}% de recaudación total
            </div>
          </div>
          <div className="text-[10px] text-emerald-300/80 font-mono">
            {confirmedTickets.filter((t) => t.bankUsed?.toLowerCase().includes('bhd')).length} boletos cobrados
          </div>
        </div>

        {/* Popular Box */}
        <div className="bg-gradient-to-br from-sky-900 to-slate-900 p-6 rounded-3xl text-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-200">Banco Popular (Cuenta Corriente)</span>
            <Building2 className="w-5 h-5 text-sky-300" />
          </div>
          <div>
            <span className="text-3xl font-black font-mono tracking-tight">
              RD$ {popularAmount.toLocaleString()}
            </span>
            <div className="text-[11px] text-sky-300 mt-1 font-medium">
              {totalRevenue > 0 ? Math.round((popularAmount / totalRevenue) * 100) : 0}% de recaudación total
            </div>
          </div>
          <div className="text-[10px] text-sky-300/80 font-mono">
            {confirmedTickets.filter((t) => t.bankUsed?.toLowerCase().includes('popular')).length} boletos cobrados
          </div>
        </div>
      </div>

      {/* Revenue Breakdown by Raffle */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <span>Rendimiento por Rifa Activa</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {raffles.map((raffle) => {
            const raffleTickets = confirmedTickets.filter((t) => t.raffleId === raffle.id);
            const raffleRevenue = raffleTickets.reduce((acc, t) => acc + t.pricePaid, 0);
            const totalTarget = raffle.totalTickets * raffle.ticketPrice;
            const progress = Math.min(100, Math.round((raffleRevenue / (totalTarget || 1)) * 100));

            return (
              <div
                key={raffle.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{raffle.title}</h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {raffleTickets.length} / {raffle.totalTickets} boletos confirmados
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-extrabold text-sm text-slate-900 block">
                      RD$ {raffleRevenue.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Meta: RD$ {totalTarget.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>Recaudado: {progress}%</span>
                    <span>Restante: {100 - progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-700" />
              <span>Libro Diario de Transacciones Bancarias</span>
            </h3>
            <p className="text-xs text-slate-500">
              Registro inmutable de boletos emitidos y conciliados con comprobantes de depósito.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedBankFilter}
              onChange={(e) => setSelectedBankFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">Todos los bancos</option>
              <option value="banreservas">Banreservas</option>
              <option value="bhd">Banco BHD</option>
              <option value="popular">Banco Popular</option>
            </select>

            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar..."
                className="w-full pl-7 pr-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
              <tr>
                <th className="p-3">Boleto #</th>
                <th className="p-3">Rifa</th>
                <th className="p-3">Comprador</th>
                <th className="p-3">Banco & Referencia</th>
                <th className="p-3 text-right">Monto</th>
                <th className="p-3 text-right">Fecha Confirmado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono font-black text-slate-900">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                      #{tx.ticketNumber}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-slate-700 truncate max-w-[180px]">
                    {tx.raffleTitle}
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-slate-900 block">{tx.userName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{tx.userPhone}</span>
                  </td>
                  <td className="p-3">
                    <span className="text-slate-800 font-medium block">{tx.bankUsed}</span>
                    <span className="font-mono text-[10px] text-slate-500 font-bold">Ref: {tx.referenceNumber}</span>
                  </td>
                  <td className="p-3 text-right font-mono font-extrabold text-emerald-700">
                    RD$ {tx.pricePaid.toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-slate-500 font-mono text-[11px]">
                    {tx.confirmedAt ? new Date(tx.confirmedAt).toLocaleDateString('es-DO') : new Date(tx.createdAt).toLocaleDateString('es-DO')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
