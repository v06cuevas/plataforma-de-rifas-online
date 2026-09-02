import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, CreditCard, ShieldCheck, X, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { UserProfile } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  user: UserProfile;
  onClose: () => void;
  onSave: (updatedProfile: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
}) => {
  const [fullName, setFullName] = useState(user.fullName || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [cedulaOrId, setCedulaOrId] = useState(user.cedulaOrId || '');
  const [email, setEmail] = useState(user.email || '');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      setCedulaOrId(user.cedulaOrId || '');
      setEmail(user.email || '');
      setErrorMsg('');
      setSuccessMsg(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Por favor ingresa tu nombre completo.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Por favor ingresa tu número de WhatsApp / teléfono.');
      return;
    }

    const updated: UserProfile = {
      ...user,
      fullName: fullName.trim(),
      phone: phone.trim(),
      cedulaOrId: cedulaOrId.trim() || undefined,
      email: email.trim() || 'comprador@rifascariberd.com',
      isLoggedIn: true,
    };

    setSuccessMsg(true);
    setTimeout(() => {
      onSave(updated);
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Editar Datos de Comprador
              </h3>
              <p className="text-[11px] text-slate-500">
                Corrige o actualiza tu nombre, cédula o teléfono
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

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>¡Datos actualizados correctamente!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
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
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              Nombre oficial para entrega y verificación legal del premio
            </span>
          </div>

          {/* Cedula / ID */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Cédula o Documento de Identidad (Opcional)
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
              Garantiza la titularidad directa en el acta notarial
            </span>
          </div>

          {/* WhatsApp / Phone */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Teléfono / WhatsApp *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                placeholder="Ej. (809) 555-0144"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
            <span className="text-[10px] text-slate-400 block">
              Para notificarte de inmediato si tu boleto resulta ganador
            </span>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Correo Electrónico (Opcional)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Guardar Cambios</span>
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tus datos son privados y se usan exclusivamente para sorteos</span>
        </div>
      </div>
    </div>
  );
};
