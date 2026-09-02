import React from 'react';
import { Home, Ticket, CreditCard, Users, HelpCircle } from 'lucide-react';
import { ScreenType } from '../types';

interface MobileNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  ticketCount: number;
  showWinners?: boolean;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentScreen, onNavigate, ticketCount, showWinners = false }) => {
  const items = [
    { label: 'Rifas', screen: 'home' as ScreenType, icon: Home },
    { label: 'Mis Boletos', screen: 'my_tickets' as ScreenType, icon: Ticket, badge: ticketCount > 0 ? ticketCount : null },
    ...(showWinners ? [{ label: 'Ganadores', screen: 'winners' as ScreenType, icon: Users }] : []),
    { label: 'Soporte', screen: 'support' as ScreenType, icon: HelpCircle },
  ];

  return (
    <nav
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 shadow-lg"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.screen;
          return (
            <button
              key={item.screen}
              id={`mobile-nav-${item.screen}`}
              type="button"
              onClick={() => onNavigate(item.screen)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-150 min-w-[58px] ${
                isActive
                  ? 'text-[#0F2137] font-extrabold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600 stroke-[2.5]' : 'stroke-2'}`} />
                {item.badge && (
                  <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-emerald-600 text-white leading-tight">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-emerald-600 rounded-full"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
