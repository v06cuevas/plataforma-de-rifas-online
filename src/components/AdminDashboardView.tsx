import React, { useState } from 'react';
import { 
  LayoutDashboard, Layers, ShieldCheck, Users, DollarSign, MessageSquare, 
  Trophy, Building2, LogOut, Search, Bell, Clock, ChevronRight, Menu, X,
  ExternalLink, Sparkles, CheckCircle2, Shield
} from 'lucide-react';
import { 
  Raffle, Ticket, PaymentReport, DrawResult, SupportConversation, 
  AdminTabType, ManagedUser, BankAccount, AdminAuditLog, RaffleStatus 
} from '../types';

import { AdminDashboardTab } from './admin/AdminDashboardTab';
import { AdminRafflesTab } from './admin/AdminRafflesTab';
import { AdminPaymentsTab } from './admin/AdminPaymentsTab';
import { AdminUsersTab } from './admin/AdminUsersTab';
import { AdminSalesTab } from './admin/AdminSalesTab';
import { AdminSupportTab } from './admin/AdminSupportTab';
import { AdminBankAccountsTab } from './admin/AdminBankAccountsTab';

interface AdminDashboardViewProps {
  raffles: Raffle[];
  tickets: Ticket[];
  paymentReports: PaymentReport[];
  drawResults?: DrawResult[];
  supportConversations: SupportConversation[];
  users?: ManagedUser[];
  bankAccounts?: BankAccount[];
  auditLogs?: AdminAuditLog[];
  adminProfile?: { name: string; role: string; email: string } | null;
  onExitAdmin: () => void;
  onCreateOrUpdateRaffle: (raffle: Partial<Raffle> & { id?: string }) => void;
  onUpdateRaffleStatus: (raffleId: string, newStatus: RaffleStatus) => void;
  onVerifyPayment: (reportId: string, approved: boolean, notes?: string) => void;
  onExecuteDraw?: (raffleId: string, publicSeed: string) => void;
  onReplySupport: (conversationId: string, replyText: string) => void;
  onUpdateBankAccounts?: (accounts: BankAccount[]) => void;
  onUpdateUserStatus?: (userId: string, newStatus: 'active' | 'blocked' | 'vip', notes?: string) => void;
  showWinners?: boolean;
  onToggleWinners?: (visible: boolean) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  raffles = [],
  tickets = [],
  paymentReports = [],
  drawResults = [],
  supportConversations = [],
  users = [],
  bankAccounts = [],
  auditLogs = [],
  adminProfile = { name: 'Lic. Andrés Peralta', role: 'Super Administrador', email: 'admin@rifascariberd.com' },
  onExitAdmin,
  onCreateOrUpdateRaffle,
  onUpdateRaffleStatus,
  onVerifyPayment,
  onExecuteDraw,
  onReplySupport,
  onUpdateBankAccounts,
  onUpdateUserStatus,
  showWinners = false,
  onToggleWinners,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [inspectingReport, setInspectingReport] = useState<PaymentReport | null>(null);

  const safeRaffles = raffles || [];
  const safeTickets = tickets || [];
  const safePaymentReports = paymentReports || [];
  const safeSupportConversations = supportConversations || [];
  const safeDrawResults = drawResults || [];

  // Local state for bank accounts and users if not passed from root
  const [localAccounts, setLocalAccounts] = useState<BankAccount[]>(bankAccounts || []);
  const [localUsers, setLocalUsers] = useState<ManagedUser[]>(users || []);

  const pendingPaymentsCount = safePaymentReports.filter((p) => p.status === 'pending').length;
  const openSupportCount = safeSupportConversations.filter((c) => c.status === 'open').length;

  const handleUpdateBankAccountsInternal = (updated: BankAccount[]) => {
    setLocalAccounts(updated);
    if (onUpdateBankAccounts) {
      onUpdateBankAccounts(updated);
    }
  };

  const handleUpdateUserStatusInternal = (
    userId: string,
    newStatus: 'active' | 'blocked' | 'vip',
    notes?: string
  ) => {
    const updated = localUsers.map((u) =>
      u.id === userId ? { ...u, status: newStatus, notes: notes || u.notes } : u
    );
    setLocalUsers(updated);
    if (onUpdateUserStatus) {
      onUpdateUserStatus(userId, newStatus, notes);
    }
  };

  const NAV_ITEMS: { id: AdminTabType; label: string; icon: any; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'raffles', label: 'Gestión de Rifas', icon: Layers, badge: safeRaffles.filter(r => r.status === 'active').length },
    { id: 'payments', label: 'Verificación de Pagos', icon: ShieldCheck, badge: pendingPaymentsCount },
    { id: 'users', label: 'Gestión de Usuarios', icon: Users, badge: localUsers.length },
    { id: 'sales', label: 'Ventas & Tesorería', icon: DollarSign },
    { id: 'support', label: 'Soporte & Mensajes', icon: MessageSquare, badge: openSupportCount },
    { id: 'bank_accounts', label: 'Cuentas Bancarias', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row antialiased font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-[#0B1727] text-white p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-black text-sm tracking-tight">Rifas Caribe Admin</h1>
            <span className="text-[10px] text-emerald-400 font-bold block">{adminProfile?.name}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed left-0 top-0 h-screen z-40 w-72 bg-[#0B1727] text-slate-300 flex flex-col justify-between p-5 border-r border-slate-800 transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Brand Header */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-black text-white tracking-tight block">Rifas del Caribe</span>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">Panel Administrativo RD</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5 pt-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
                      : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-slate-950 text-emerald-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer with Admin Profile & Return to Client */}
        <div className="space-y-3 pt-4 border-t border-slate-800/80">
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-emerald-400 font-black flex items-center justify-center text-xs">
              {adminProfile?.name ? adminProfile.name.charAt(0) : 'A'}
            </div>
            <div className="text-left truncate flex-1">
              <span className="text-xs font-bold text-white block truncate">{adminProfile?.name || 'Administrador'}</span>
              <span className="text-[10px] text-slate-400 block truncate">{adminProfile?.role || 'Super Admin'}</span>
            </div>
          </div>

          <button type="button" onClick={() => onToggleWinners?.(!showWinners)} className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl border text-xs font-bold transition-colors ${showWinners ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-slate-800/70 border-slate-700 text-slate-300'}`}>
            <span>Mostrar página Ganadores</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${showWinners ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'}`}>{showWinners ? 'Visible' : 'Oculta'}</span>
          </button>

          <button
            type="button"
            onClick={onExitAdmin}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-rose-950/70 text-slate-300 hover:text-rose-300 text-xs font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Volver a Vista Cliente</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-72">
        {/* Top Navbar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400">Admin</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-sm font-black text-slate-900 capitalize">
              {NAV_ITEMS.find((n) => n.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Status Pill */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Conexión Notarial Activa</span>
            </div>

            {/* View Client Site */}
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver Web Cliente</span>
            </button>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {activeTab === 'dashboard' && (
            <AdminDashboardTab
              raffles={safeRaffles}
              tickets={safeTickets}
              paymentReports={safePaymentReports}
              drawResults={safeDrawResults}
              users={localUsers}
              bankAccounts={localAccounts}
              onNavigateTab={(t) => setActiveTab(t)}
              onInspectPayment={(rep) => {
                setInspectingReport(rep);
                setActiveTab('payments');
              }}
              onQuickVerify={onVerifyPayment}
            />
          )}

          {activeTab === 'raffles' && (
            <AdminRafflesTab
              raffles={safeRaffles}
              tickets={safeTickets}
              onCreateOrUpdateRaffle={onCreateOrUpdateRaffle}
              onUpdateRaffleStatus={onUpdateRaffleStatus}
            />
          )}

          {activeTab === 'payments' && (
            <AdminPaymentsTab
              paymentReports={safePaymentReports}
              bankAccounts={localAccounts}
              onVerifyPayment={onVerifyPayment}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersTab
              users={localUsers}
              tickets={safeTickets}
              onUpdateUserStatus={handleUpdateUserStatusInternal}
            />
          )}

          {activeTab === 'sales' && (
            <AdminSalesTab
              raffles={safeRaffles}
              tickets={safeTickets}
              paymentReports={safePaymentReports}
              bankAccounts={localAccounts}
            />
          )}

          {activeTab === 'support' && (
            <AdminSupportTab
              conversations={safeSupportConversations}
              tickets={safeTickets}
              onReplySupport={onReplySupport}
            />
          )}

          {activeTab === 'bank_accounts' && (
            <AdminBankAccountsTab
              bankAccounts={localAccounts}
              onUpdateBankAccounts={handleUpdateBankAccountsInternal}
            />
          )}
        </main>
      </div>
    </div>
  );
};
