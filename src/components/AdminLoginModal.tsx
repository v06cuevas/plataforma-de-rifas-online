import React, { useState } from 'react';
import { Shield, Lock, KeyRound, AlertCircle, X, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { logout, startAdminEmailLogin, verifyAdminEmailCode } from '../lib/api';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdminLoginSuccess: (adminData: { name: string; role: string; email: string }) => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onAdminLoginSuccess,
}) => {
  const [adminUser, setAdminUser] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  if (!isOpen) return null;

  const handleClose = async () => {
    await logout();
    setTwoFactorCode('');
    setErrorMsg('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const normalizedAdminUser = adminUser.trim();
    const normalizedCode = twoFactorCode.replace(/\D/g, '');

    if (!normalizedAdminUser) {
      setErrorMsg('Introduce el correo del operador administrativo.');
      return;
    }
    if (!password.trim()) {
      setErrorMsg('Introduce la contraseña de la cuenta.');
      return;
    }
    if (normalizedCode.length !== 8) {
      setErrorMsg('Introduce el código de confirmación de 8 dígitos.');
      return;
    }

    setIsVerifyingCode(true);
    try {
      await startAdminEmailLogin(normalizedAdminUser, password);
      await verifyAdminEmailCode(normalizedCode);
      onAdminLoginSuccess({ name: adminUser.trim(), role: 'admin', email: normalizedAdminUser });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'No se pudo iniciar sesión. Verifica tus credenciales.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0B1727] text-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-700 space-y-5 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Shield className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base tracking-tight text-white">
                  Portal Administrativo
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  2FA SI ESTÁ ACTIVADO
                </span>
              </div>
              <p className="text-xs text-slate-400">Acceso exclusivo para cuentas con rol admin</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Solo cuentas con rol "admin" en la base de datos pueden entrar aquí. El rol nunca se
            asigna desde el registro público.
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-2xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Correo del Operador
            </label>
            <input
              type="email"
              required
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              placeholder="operador@tudominio.com"
              className="w-full pl-3.5 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder:text-slate-500 font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 block">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-white placeholder:text-slate-500 font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              Código de confirmación
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                maxLength={8}
                value={twoFactorCode}
                disabled={isVerifyingCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Escribe el código de 8 dígitos"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700 text-xs text-emerald-400 font-mono tracking-widest placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={twoFactorCode.replace(/\D/g, '').length !== 8 || isVerifyingCode}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            {isVerifyingCode ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Autenticando Operador...
              </span>
            ) : (
              <>
                <Lock className="w-4 h-4 stroke-[2.5]" />
                <span>Confirmar código y entrar</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
