import React, { useState } from 'react';
import { User, Phone, Mail, LogIn, UserPlus, ShieldCheck, X, CheckCircle2, FileText, CreditCard, Lock } from 'lucide-react';
import { UserProfile } from '../types';
import { registerClient, loginClient } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cedulaOrId, setCedulaOrId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const normalizedPhone = phone.trim();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedCedula = cedulaOrId.trim();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setErrorMsg('Introduce un correo electrónico válido.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (mode === 'register' && (!normalizedPhone || normalizedPhone.replace(/\D/g, '').length < 8)) {
      setErrorMsg('El teléfono debe contener al menos 8 dígitos válidos.');
      return;
    }

    if (mode === 'register' && !normalizedName) {
      setErrorMsg('Por favor introduce tu nombre completo para emitir tus boletos.');
      return;
    }

    setIsLoading(true);
    try {
      const profile =
        mode === 'register'
          ? await registerClient({
              fullName: normalizedName,
              email: normalizedEmail,
              phone: normalizedPhone,
              password,
              cedulaOrId: normalizedCedula || undefined,
            })
          : await loginClient(normalizedEmail, password);

      onLoginSuccess(profile);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Ocurrió un error. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#0F2137] text-white flex items-center justify-center font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {mode === 'register' ? 'Registro Rápido de Comprador' : 'Acceso a tus Boletos'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {mode === 'register'
                  ? 'Sin contraseñas difíciles • Vinculado a tu WhatsApp y Cédula'
                  : 'Ingresa con tu correo y contraseña'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Nuevo Comprador
          </button>
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Ya Compré Boletos
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Nombre y Apellidos *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Manuel Pérez"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Debe coincidir con tu cédula para validar entrega de premios
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Cédula o Documento de Identidad
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ej. 001-1234567-8 o Cédula / Pasaporte"
                    value={cedulaOrId}
                    onChange={(e) => setCedulaOrId(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Garantiza la titularidad y entrega formal de tus premios en sorteos
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Número de Teléfono / WhatsApp *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="Ej. 829-555-0192 o 809-123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block">
                  Te enviamos las alertas de tus boletos y notificaciones en vivo
                </span>
              </div>
            </>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
            {mode === 'register' && (
              <span className="text-[10px] text-slate-400 block">
                Te pedirá confirmar tu correo si tu proyecto de Supabase tiene esa opción activada.
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer mt-2 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Procesando...
              </span>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Continuar y Crear Perfil</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Consultar Mis Boletos</span>
              </>
            )}
          </button>
        </form>

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          Los administradores no se crean desde el registro público. El rol administrativo solo puede asignarlo un administrador existente o un seed directo en backend.
        </p>
      </div>
    </div>
  );
};
