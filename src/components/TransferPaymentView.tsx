import React, { useState } from 'react';
import { ArrowLeft, Building2, Upload, CheckCircle2, ShieldCheck, Clock, AlertTriangle, FileImage, Copy, Check, Eye, HelpCircle, Gift, FileText } from 'lucide-react';
import { Raffle, UserProfile, BankAccount } from '../types';
import { BankCopyCard } from './BankCopyCard';
import { supabase } from '../lib/supabaseClient';

// Bucket de Storage donde se guardan los comprobantes de pago subidos por
// los compradores. Es público (igual que "raffle-media") para que el link
// se pueda mostrar directo con <img src=...> tanto al comprador como al
// administrador sin pasos extra. El nombre de archivo es aleatorio e
// impredecible y el bucket no permite "listar" archivos, así que nadie
// puede adivinar ni navegar los comprobantes de otras personas — pero si
// más adelante quieres que sea 100% privado (con enlaces temporales que
// expiran), se puede migrar a URLs firmadas.
const RECEIPTS_BUCKET = 'payment-receipts';

interface TransferPaymentViewProps {
  raffle: Raffle;
  selectedNumbers: string[];
  bonusNumbers?: string[];
  totalAmount: number;
  user: UserProfile;
  bankAccounts?: BankAccount[];
  onBack: () => void;
  onSubmitPaymentReport: (reportData: {
    raffleId: string;
    selectedNumbers: string[];
    bonusNumbers?: string[];
    totalAmount: number;
    destinationBank: string;
    referenceNumber: string;
    senderName: string;
    senderPhone: string;
    senderEmail: string;
    senderCedula?: string;
    receiptUrl: string;
  }) => void;
  onNavigateToSupport: () => void;
}

export const TransferPaymentView: React.FC<TransferPaymentViewProps> = ({
  raffle,
  selectedNumbers,
  bonusNumbers = [],
  totalAmount,
  user,
  bankAccounts = [],
  onBack,
  onSubmitPaymentReport,
  onNavigateToSupport,
}) => {
  const activeBanks = (bankAccounts && bankAccounts.length > 0)
    ? bankAccounts.filter((b) => b.isActive !== false)
    : [];

  const [selectedBankId, setSelectedBankId] = useState<string>(
    activeBanks[0]?.id || 'banreservas'
  );
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptIsPdf, setReceiptIsPdf] = useState<boolean>(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState<boolean>(false);
  const [receiptUploadError, setReceiptUploadError] = useState<string>('');
  const [buyerName, setBuyerName] = useState<string>(user.fullName || '');
  const [buyerPhone, setBuyerPhone] = useState<string>(user.phone || '');
  const [buyerCedula, setBuyerCedula] = useState<string>(user.cedulaOrId || '');
  const [buyerEmail, setBuyerEmail] = useState<string>(user.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);

  const currentSelectedBank = activeBanks.find((b) => b.id === selectedBankId) || activeBanks[0] || null;

  const uploadReceiptFile = async (file: File) => {
    setReceiptUploadError('');
    setIsUploadingReceipt(true);
    setReceiptFileName(file.name);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    setReceiptIsPdf(isPdf);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').toLowerCase();
      const path = `receipts/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, file, {
        contentType: file.type || (isPdf ? 'application/pdf' : 'image/jpeg'),
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) throw error;

      const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
      setReceiptUrl(data.publicUrl);
    } catch (err: any) {
      // Antes, si esto fallaba, el formulario simplemente dejaba el
      // comprobante "vacío" y al enviar se sustituía en silencio por una
      // foto de stock de Unsplash: el administrador nunca veía el
      // comprobante real. Ahora, si la subida falla, se avisa explícitamente
      // y NO se deja enviar el reporte (ver validación en handleSubmit).
      console.error('Error subiendo comprobante:', err);
      setReceiptUploadError(
        `No se pudo subir el comprobante (${err?.message || 'error de red'}). Verifica tu conexión e inténtalo de nuevo.`
      );
      setReceiptUrl('');
      setReceiptFileName('');
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadReceiptFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadReceiptFile(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!currentSelectedBank) {
      setErrorMsg('No hay cuentas bancarias disponibles en este momento. Intenta más tarde.');
      return;
    }

    if (!referenceNumber.trim()) {
      setErrorMsg('Por favor introduce el número de referencia o confirmación bancaria.');
      return;
    }

    if (!buyerName.trim() || !buyerPhone.trim()) {
      setErrorMsg('Por favor completa tu nombre y número de teléfono (WhatsApp).');
      return;
    }

    if (isUploadingReceipt) {
      setErrorMsg('Espera a que termine de subirse el comprobante antes de enviar.');
      return;
    }

    // El comprobante ahora es OBLIGATORIO: sin esto, el administrador no
    // tiene forma de verificar que la transferencia realmente se hizo.
    if (!receiptUrl) {
      setErrorMsg('Debes adjuntar el comprobante de pago (captura o PDF) antes de enviar el reporte.');
      return;
    }

    // Preparar datos y mostrar modal de confirmación
    const cleanSelected = Array.from(new Set(selectedNumbers));
    const cleanBonus = Array.from(new Set((bonusNumbers || []).filter((b) => !cleanSelected.includes(b))));
    const allAssignedNumbers = Array.from(new Set([...cleanSelected, ...cleanBonus]));

    const submitData = {
      raffleId: raffle.id,
      selectedNumbers: allAssignedNumbers,
      bonusNumbers: cleanBonus,
      totalAmount,
      destinationBank: currentSelectedBank.bankName,
      referenceNumber: referenceNumber.trim().toUpperCase(),
      senderName: buyerName.trim(),
      senderPhone: buyerPhone.trim(),
      senderEmail: buyerEmail.trim(),
      senderCedula: buyerCedula.trim() || undefined,
      receiptUrl,
    };

    setPendingSubmitData(submitData);
    setShowConfirmationModal(true);
  };

  const handleConfirmSubmit = () => {
    if (!pendingSubmitData) return;

    setShowConfirmationModal(false);
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      onSubmitPaymentReport(pendingSubmitData);
      setPendingSubmitData(null);
    }, 600);
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Header back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a la Rifa</span>
        </button>

        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Transferencia Segura Sin Billetera</span>
        </div>
      </div>

      {/* Main Title & Clear Custody Banner */}
      <div className="space-y-3">
        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Reportar Pago por Transferencia Bancaria
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          Transfiere el monto exacto a una de nuestras cuentas oficiales y sube el comprobante. Tus boletos quedarán apartados de inmediato.
        </p>
      </div>

      {/* 2-Column Form Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Bank Selection & Copy Card (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Order Summary Strip */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Resumen de tu Orden
            </span>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{raffle.title}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {selectedNumbers.length} Boletos: {selectedNumbers.map(n => `#${n}`).join(', ')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total a pagar</span>
                  <span className="text-lg font-extrabold text-emerald-600 font-mono">
                    RD$ {totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {bonusNumbers.length > 0 && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs bg-amber-50 p-2 rounded-xl border border-amber-200">
                  <span className="font-bold text-amber-950 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-amber-600" />
                    <span>+{bonusNumbers.length} Boleto(s) GRATIS:</span>
                  </span>
                  <span className="font-mono font-black text-amber-900">
                    {bonusNumbers.map(n => `#${n}`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bank Selector Tabs */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Selecciona la cuenta de destino:</span>
              <span className="text-[11px] text-slate-500 font-normal">Cuentas Oficiales RD</span>
            </label>

            <div className={`grid ${activeBanks.length > 2 ? 'grid-cols-3' : activeBanks.length === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
              {activeBanks.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBankId(b.id)}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedBankId === b.id
                      ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-extrabold ring-2 ring-emerald-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Building2 className="w-5 h-5 text-slate-700" />
                  <span className="text-xs">{b.bankName}</span>
                </button>
              ))}
            </div>

            {/* Selected Bank Details with Copy buttons */}
            {currentSelectedBank ? (
              <BankCopyCard bank={currentSelectedBank} />
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                No hay cuentas bancarias disponibles en este momento.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Submission Form (7 cols) */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-6"
          >
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-slate-900">
                Formulario de Comprobante
              </h2>
              <p className="text-xs text-slate-500">
                Ingresa los datos exactos del recibo o captura de pantalla
              </p>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Buyer Contact Info */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Datos del Titular / Comprador
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Teléfono WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. (809) 555-0199"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Cédula o Documento de Identidad
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 001-1234567-8 o Cédula"
                    value={buyerCedula}
                    onChange={(e) => setBuyerCedula(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bank Transfer Details */}
            <div className="space-y-4 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Datos de la Transferencia
              </span>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Número de Referencia / Comprobante Bancario *</span>
                  <span className="text-[11px] text-slate-400 font-normal">Aparece en tu recibo</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. REF-98321048 o # de autorización"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none font-mono uppercase"
                />
              </div>

              {/* Upload receipt */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 block">
                  Adjuntar Comprobante de Pago (Captura o PDF) *
                </label>

                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                    receiptUrl
                      ? 'border-emerald-500 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                  }`}
                >
                  {isUploadingReceipt ? (
                    <div className="space-y-2 py-2">
                      <span className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto block" />
                      <p className="text-xs font-bold text-slate-700">Subiendo comprobante...</p>
                    </div>
                  ) : receiptUrl ? (
                    <div className="space-y-2">
                      <div className="w-16 h-16 rounded-xl overflow-hidden mx-auto border border-emerald-300 shadow-2xs flex items-center justify-center bg-white">
                        {receiptIsPdf ? (
                          <FileText className="w-8 h-8 text-red-500" />
                        ) : (
                          <img
                            src={receiptUrl}
                            alt="Recibo"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Comprobante listo: {receiptFileName || 'recibo.jpg'}</span>
                      </p>
                      <label className="text-[11px] text-slate-500 underline cursor-pointer hover:text-slate-800">
                        Cambiar archivo
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2 py-2">
                      <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">
                          Arrastra aquí tu comprobante o haz clic para buscar
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Formatos aceptados: JPG, PNG, WebP, PDF (Máx 5MB)
                        </p>
                      </div>
                      <label className="inline-block px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                        Seleccionar Archivo
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                {receiptUploadError && (
                  <p className="text-[11px] text-red-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{receiptUploadError}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <button
                type="submit"
                id="btn-submit-transfer-report"
                disabled={isSubmitting || isUploadingReceipt || showConfirmationModal}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Enviando comprobante...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Enviar Reporte y Reservar Boletos</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-500">
                Al enviar este reporte declaras que la transferencia fue realizada legítimamente a la cuenta oficial indicada.
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="pt-6 px-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-amber-700" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-black text-slate-900">
                    Custodia Notarial y Tiempo de Confirmación
                  </h3>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div className="px-6 space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                <p className="text-sm leading-relaxed">
                  Tus boletos quedan en estado <strong className="underline">Pendiente de Verificación</strong> en cuanto envías este reporte.
                </p>
                <p className="text-sm leading-relaxed">
                  Un oficial de cumplimiento confirmará el depósito con el banco <strong className="font-bold">(tiempo promedio: 15 a 45 minutos)</strong> y tus boletos pasarán a estado <strong>Confirmado</strong>.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 pb-6 space-y-3">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Enviando...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar y Reservar Boletos</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowConfirmationModal(false)}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
