import React, { useState } from 'react';
import { Copy, Check, Building2, User, FileText, ArrowRight } from 'lucide-react';
import { BankAccount } from '../types';

interface BankCopyCardProps {
  bank?: BankAccount | null;
  selected?: boolean;
  onSelect?: () => void;
  showSelectButton?: boolean;
}

export const BankCopyCard: React.FC<BankCopyCardProps> = ({
  bank,
  selected = false,
  onSelect,
  showSelectButton = false,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!bank) return null;

  const copyToClipboard = (text: string, fieldName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const getBankBadge = () => {
    switch (bank.id) {
      case 'banreservas':
        return (
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-[#003882] inline-block shadow-xs"></span>
            <span className="font-bold text-[#003882] text-sm tracking-wide">BANRESERVAS</span>
            <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Oficial</span>
          </div>
        );
      case 'bhd':
        return (
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-[#008752] inline-block shadow-xs"></span>
            <span className="font-bold text-[#008752] text-sm tracking-wide">BANCO BHD</span>
            <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Oficial</span>
          </div>
        );
      case 'popular':
        return (
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-[#002F6C] inline-block shadow-xs"></span>
            <span className="font-bold text-[#002F6C] text-sm tracking-wide">BANCO POPULAR</span>
            <span className="text-[11px] font-semibold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">Oficial</span>
          </div>
        );
      default:
        return <span className="font-bold text-slate-800">{bank.bankName}</span>;
    }
  };

  const hasBeneficiary = Boolean(bank.beneficiaryName && bank.beneficiaryName.trim() !== '');
  const hasRncOrId = Boolean(bank.rncOrId && bank.rncOrId.trim() !== '');
  const hasAccountType = Boolean(bank.accountType && bank.accountType.trim() !== '');
  const hasShortInstructions = Boolean(bank.shortInstructions && bank.shortInstructions.trim() !== '');

  return (
    <div
      id={`bank-card-${bank.id}`}
      onClick={onSelect}
      className={`relative rounded-2xl border transition-all duration-200 overflow-hidden bg-white ${
        selected
          ? 'border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
          : 'border-slate-200 hover:border-slate-300 shadow-xs'
      } ${onSelect ? 'cursor-pointer' : ''}`}
    >
      {/* Header of bank card */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
        {getBankBadge()}
        {hasAccountType && (
          <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200">
            {bank.accountType}
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Account Number with 1-Tap Copy */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Número de Cuenta
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Toque para copiar</span>
          </div>
          <button
            id={`copy-acc-${bank.id}`}
            type="button"
            onClick={(e) => copyToClipboard(bank.accountNumber, 'acc', e)}
            className="w-full flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors text-left group"
          >
            <span className="font-mono text-base font-bold text-slate-900 tracking-wider">
              {bank.accountNumber}
            </span>
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-xs group-hover:border-slate-300 text-slate-700">
              {copiedField === 'acc' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar</span>
                </>
              )}
            </span>
          </button>
        </div>

        {/* Beneficiary Name & RNC/Cedula (Only displayed if they have information) */}
        {(hasBeneficiary || hasRncOrId) && (
          <div className={`grid ${hasBeneficiary && hasRncOrId ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-2 text-xs`}>
            {hasBeneficiary && (
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" /> Titular
                  </span>
                  <button
                    type="button"
                    onClick={(e) => copyToClipboard(bank.beneficiaryName || '', 'holder', e)}
                    className="text-[10px] text-slate-500 hover:text-slate-900 font-medium underline"
                  >
                    {copiedField === 'holder' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="font-bold text-slate-800 text-[13px] truncate">{bank.beneficiaryName}</p>
              </div>
            )}

            {hasRncOrId && (
              <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-slate-500 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-slate-400" /> Documento (RNC / Cédula)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => copyToClipboard(bank.rncOrId || '', 'rnc', e)}
                    className="text-[10px] text-slate-500 hover:text-slate-900 font-medium underline"
                  >
                    {copiedField === 'rnc' ? '¡Copiado!' : 'Copiar'}
                  </button>
                </div>
                <p className="font-mono font-bold text-slate-800 text-[13px] truncate">{bank.rncOrId}</p>
              </div>
            )}
          </div>
        )}

        {hasShortInstructions && (
          <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-100 pt-2">
            {bank.shortInstructions}
          </p>
        )}

        {showSelectButton && onSelect && (
          <button
            type="button"
            onClick={onSelect}
            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              selected
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
            }`}
          >
            {selected ? (
              <>
                <Check className="w-4 h-4" /> Cuenta Seleccionada para Transferir
              </>
            ) : (
              <>
                Transferir a esta Cuenta <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
