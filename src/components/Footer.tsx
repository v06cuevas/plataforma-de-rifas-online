import React from 'react';
import { Shield } from 'lucide-react';
import { ScreenType } from '../types';

interface FooterProps {
  onNavigate?: (screen: ScreenType) => void;
  onOpenAdminLogin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAdminLogin }) => {
  return (
    <footer className="bg-slate-900 text-slate-400 text-xs border-t border-slate-800 pb-20 md:pb-6 pt-6">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <p>© {new Date().getFullYear()} RifasCaribe SRL. Todos los derechos reservados. Sorteos validados por Notario Público.</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <span>Términos y Condiciones</span>
            <span>Política de Privacidad</span>
            <span>Reglamento Notarial</span>
            {onOpenAdminLogin && (
              <button
                type="button"
                id="admin-login-trigger"
                onClick={onOpenAdminLogin}
                aria-label="Seguridad Notarial"
                className="inline-flex items-center justify-center p-1 rounded-md text-slate-600 hover:text-slate-500 transition-colors cursor-pointer opacity-70 hover:opacity-100"
              >
                <Shield className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
