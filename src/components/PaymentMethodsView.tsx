import React, { useState } from 'react';
import { CreditCard, Building2, ShieldCheck, CheckCircle2, Clock, Smartphone, AlertCircle, FileCheck, ArrowRight, HelpCircle } from 'lucide-react';
import { BankAccount } from '../types';
import { BankCopyCard } from './BankCopyCard';

interface PaymentMethodsViewProps {
  bankAccounts?: BankAccount[];
  onExploreRaffles: () => void;
  onNavigateToSupport: () => void;
}

export const PaymentMethodsView: React.FC<PaymentMethodsViewProps> = ({
  bankAccounts = [],
  onExploreRaffles,
  onNavigateToSupport,
}) => {
  const activeBanks = (bankAccounts && bankAccounts.length > 0)
    ? bankAccounts.filter((b) => b.isActive !== false)
    : [];

  const [activeBankGuide, setActiveBankGuide] = useState<string>(activeBanks[0]?.id || 'banreservas');

  return (
    <div className="space-y-8 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Cuentas Corporativas Oficiales</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Cuentas Bancarias y Métodos de Transferencia
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          En nuestra plataforma <strong>no necesitas registrar tarjetas ni depositar saldo previo</strong>. Todas las compras se realizan mediante transferencia directa a nuestras cuentas empresariales en Banreservas, Banco BHD y Banco Popular Dominicano.
        </p>

        {/* Schedule & Verification timing badge */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-3">
            <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-slate-500 text-[11px] block">Horario de Verificación Automática:</span>
              <strong className="text-slate-900">Lunes a Domingo, de 7:00 AM a 11:00 PM</strong>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="text-slate-500 text-[11px] block">Tiempo Promedio de Validación:</span>
              <strong className="text-slate-900">10 a 25 minutos tras subir comprobante</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3 BANK ACCOUNTS WITH 1-TAP COPY */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-slate-700" />
            Cuentas Disponibles para Transferir
          </h2>
          <span className="text-xs text-slate-500">Toca cualquier número para copiarlo</span>
        </div>

        <div className={`grid grid-cols-1 ${activeBanks.length > 2 ? 'md:grid-cols-3' : activeBanks.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-4`}>
          {activeBanks.map((bank) => (
            <BankCopyCard key={bank.id} bank={bank} />
          ))}
        </div>
      </section>

      {/* STEP BY STEP TRANSFER TUTORIAL PER BANK */}
      <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="space-y-1">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-slate-700" />
            Guía Paso a Paso: Cómo transferir desde tu App Móvil
          </h3>
          <p className="text-xs text-slate-500">
            Selecciona tu banco para ver el procedimiento exacto:
          </p>
        </div>

        {/* Bank Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveBankGuide('banreservas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeBankGuide === 'banreservas'
                ? 'bg-[#003882] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            App Banreservas
          </button>
          <button
            type="button"
            onClick={() => setActiveBankGuide('bhd')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeBankGuide === 'bhd'
                ? 'bg-[#008752] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Móvil Banking BHD
          </button>
          <button
            type="button"
            onClick={() => setActiveBankGuide('popular')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeBankGuide === 'popular'
                ? 'bg-[#002F6C] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            App Banco Popular
          </button>
        </div>

        {/* Step details based on active bank */}
        {activeBankGuide === 'banreservas' && (
          <div className="space-y-3 text-xs sm:text-sm text-slate-700">
            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
              <strong className="text-blue-900 block font-bold">Instrucciones App Banreservas:</strong>
              <ol className="list-decimal list-inside space-y-1.5 text-blue-950 text-xs">
                <li>Abre la aplicación <strong>Banreservas</strong> e ingresa con tu usuario o FaceID.</li>
                <li>Dirígete a la sección <strong>Transferencias &gt; Pagos a Terceros Banreservas</strong>.</li>
                <li>Pega el número de cuenta: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-blue-900">960-1234567-8</code>.</li>
                <li>Verifica que el titular corresponda a <strong>RIFAS DEL CARIBE SRL</strong>.</li>
                <li>Coloca el monto exacto de tus boletos y confirma la transacción.</li>
                <li>Guarda la captura del comprobante con su número de referencia y súbela en nuestra web.</li>
              </ol>
            </div>
          </div>
        )}

        {activeBankGuide === 'bhd' && (
          <div className="space-y-3 text-xs sm:text-sm text-slate-700">
            <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <strong className="text-emerald-900 block font-bold">Instrucciones Móvil Banking BHD:</strong>
              <ol className="list-decimal list-inside space-y-1.5 text-emerald-950 text-xs">
                <li>Ingresa a tu app de <strong>Banco BHD</strong>.</li>
                <li>Selecciona <strong>Transferir &gt; Entre Cuentas BHD</strong> (o Pagos al Instante).</li>
                <li>Pega la cuenta de ahorros: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-emerald-900">102-8765432-1</code>.</li>
                <li>Confirma que el beneficiario sea <strong>RIFAS DEL CARIBE SRL (RNC 1-32-48921-9)</strong>.</li>
                <li>Ejecuta la transferencia, toma captura de la pantalla final y súbela al formulario.</li>
              </ol>
            </div>
          </div>
        )}

        {activeBankGuide === 'popular' && (
          <div className="space-y-3 text-xs sm:text-sm text-slate-700">
            <div className="p-3.5 rounded-xl bg-sky-50/60 border border-sky-200 space-y-2">
              <strong className="text-sky-900 block font-bold">Instrucciones App Popular (BPD):</strong>
              <ol className="list-decimal list-inside space-y-1.5 text-sky-950 text-xs">
                <li>Ingresa a la <strong>App Popular</strong> desde tu celular.</li>
                <li>Selecciona el menú <strong>Transferencias &gt; A Terceros en el Popular</strong>.</li>
                <li>Introduce el número de cuenta: <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-sky-900">798-234567-0</code>.</li>
                <li>Confirma los fondos y autoriza con tu Token Popular.</li>
                <li>Copia el número de confirmación / captura de pantalla y adjúntalo a tu pedido de boletos.</li>
              </ol>
            </div>
          </div>
        )}
      </section>

      {/* FREQUENT QUESTIONS & SUPPORT */}
      <section className="p-6 rounded-3xl bg-slate-900 text-white space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-base text-white">¿Tienes preguntas sobre transferencias?</h3>
            <p className="text-xs text-slate-400">Nuestro equipo de tesorería está activo para ayudarte.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onNavigateToSupport}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              Contactar Soporte
            </button>
            <button
              type="button"
              onClick={onExploreRaffles}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-colors"
            >
              Ver Rifas Activas
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
