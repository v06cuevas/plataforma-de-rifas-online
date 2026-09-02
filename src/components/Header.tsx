import React, { useState } from 'react';
import { Shield, Ticket, CreditCard, Users, HelpCircle, User, LogIn, Menu, X, CheckCircle, Sparkles, UserCheck, Edit3 } from 'lucide-react';
import { ScreenType, UserProfile, Ticket as TicketType } from '../types';

interface HeaderProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  user: UserProfile;
  userTickets: TicketType[];
  onOpenAuth: () => void;
  onOpenEditProfile?: () => void;
  onOpenAdminLogin?: () => void;
  showWinners?: boolean;
  onLogout: () => void;
  adminProfile?: { name: string; role: string; email: string } | null;
  onOpenAdminDashboard?: () => void;
  onAdminLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  onNavigate,
  user,
  userTickets = [],
  onOpenAuth,
  onOpenEditProfile,
  onOpenAdminLogin,
  showWinners = false,
  onLogout,
  adminProfile,
  onOpenAdminDashboard,
  onAdminLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const safeTickets = userTickets || [];
  const pendingCount = safeTickets.filter((t) => t.status === 'pending_payment').length;
  const confirmedCount = safeTickets.filter((t) => t.status === 'confirmed').length;

  const navItems: { label: string; screen: ScreenType; icon: React.ReactNode; badge?: string }[] = [
    { label: 'Rifas Activas', screen: 'home', icon: <Sparkles className="w-4 h-4" /> },
    {
      label: 'Mis Boletos',
      screen: 'my_tickets',
      icon: <Ticket className="w-4 h-4" />,
      badge: safeTickets.length > 0 ? `${safeTickets.length}` : undefined,
    },
    ...(showWinners ? [{ label: 'Ganadores', screen: 'winners' as ScreenType, icon: <Users className="w-4 h-4" /> }] : []),
    { label: 'Soporte', screen: 'support', icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div
            id="site-logo"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div>
              <div className="flex items-center gap-1">
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">Rifas</span>
                <span className="font-extrabold text-emerald-600 text-lg tracking-tight">Caribe</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">RD</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium block -mt-1">
                Plataforma de Sorteos Verificados
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = currentScreen === item.screen;
              return (
                <button
                  key={item.screen}
                  id={`nav-link-${item.screen}`}
                  onClick={() => onNavigate(item.screen)}
                  className={`relative px-3.5 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-slate-100 text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white leading-none">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile / Admin Profile / Auth Area */}
          <div className="hidden sm:flex items-center gap-3">
            {adminProfile ? (
              <div className="flex items-center gap-2 bg-[#0B1727] text-white p-1.5 pl-2.5 pr-2.5 rounded-2xl border border-emerald-500/40 shadow-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-xs">
                  <Shield className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-white leading-none truncate max-w-[140px]">
                      {adminProfile.name}
                    </p>
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                      Admin
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenAdminDashboard}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline mt-0.5 block cursor-pointer"
                  >
                    Abrir Panel Admin →
                  </button>
                </div>
                {onAdminLogout && adminProfile?.role === 'admin' && (
                  <button
                    id="btn-admin-logout"
                    onClick={onAdminLogout}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 font-medium ml-1 cursor-pointer transition-colors"
                    title="Cerrar Sesión Admin"
                  >
                    <LogIn className="w-3.5 h-3.5 rotate-180" />
                  </button>
                )}
              </div>
            ) : user.isLoggedIn ? (
              <div className="flex items-center gap-2 bg-slate-50 p-1.5 pl-2 pr-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  {user.fullName.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.phone}</p>
                </div>
                {onOpenEditProfile && (
                  <button
                    type="button"
                    onClick={onOpenEditProfile}
                    className="p-1.5 rounded-lg bg-white hover:bg-slate-200 text-slate-600 hover:text-emerald-700 font-bold ml-1 cursor-pointer transition-colors border border-slate-200"
                    title="Editar mis datos personales"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  id="btn-logout"
                  onClick={onLogout}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-medium ml-1 cursor-pointer"
                  title="Cerrar Sesión"
                >
                  Salir
                </button>
              </div>
            ) : (
              <button
                id="btn-login-open"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#0F2137] text-white hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar / Registro</span>
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {adminProfile && adminProfile.role === 'admin' ? (
            <div className="p-3 mb-2 rounded-2xl bg-[#0B1727] text-white flex items-center justify-between border border-emerald-500/30">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-xs font-bold block leading-none">{adminProfile.name}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">Administrador</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onOpenAdminDashboard) onOpenAdminDashboard();
                  setMobileMenuOpen(false);
                }}
                className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 text-[11px] font-black"
              >
                Panel →
              </button>
            </div>
          ) : user.isLoggedIn ? (
            <div className="p-3 mb-2 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-none">{user.fullName}</span>
                <span className="text-[11px] font-mono text-slate-500">{user.phone}</span>
                {user.cedulaOrId && (
                  <span className="text-[10px] text-slate-500 block font-mono">Céd: {user.cedulaOrId}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {onOpenEditProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenEditProfile();
                      setMobileMenuOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 shadow-2xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 text-xs font-bold"
                >
                  Salir
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="w-full mb-2 py-2.5 rounded-xl bg-[#0F2137] text-white text-xs font-bold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Ingresar o Registrarse</span>
            </button>
          )}

          {navItems.map((item) => (
            <button
              key={item.screen}
              onClick={() => {
                onNavigate(item.screen);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {item.icon}
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};
