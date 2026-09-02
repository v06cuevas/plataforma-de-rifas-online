import React, { useState } from 'react';
import { 
  Building2, Plus, Edit, Trash2, CheckCircle2, AlertCircle, 
  Copy, ShieldCheck, CreditCard, ToggleLeft, ToggleRight, XCircle, Info
} from 'lucide-react';
import { BankAccount } from '../../types';

interface AdminBankAccountsTabProps {
  bankAccounts: BankAccount[];
  onUpdateBankAccounts: (accounts: BankAccount[]) => void;
}

export const AdminBankAccountsTab: React.FC<AdminBankAccountsTabProps> = ({
  bankAccounts,
  onUpdateBankAccounts,
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Form Fields
  const [bankName, setBankName] = useState<string>('Banreservas');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [accountType, setAccountType] = useState<string>('Cuenta Corriente');
  const [beneficiaryName, setBeneficiaryName] = useState<string>('RIFAS DEL CARIBE SRL');
  const [rncOrId, setRncOrId] = useState<string>('1-32-48921-9 (RNC)');
  const [shortInstructions, setShortInstructions] = useState<string>('Transfiere desde App seleccionando Pagos a Terceros.');
  const [isActive, setIsActive] = useState<boolean>(true);

  const openCreateModal = () => {
    setEditingAccount(null);
    setBankName('Banreservas');
    setAccountNumber('');
    setAccountType('Cuenta Corriente');
    setBeneficiaryName('RIFAS DEL CARIBE SRL');
    setRncOrId('1-32-48921-9 (RNC)');
    setShortInstructions('Transfiere vía App o Banca Móvil seleccionando Cuentas de Terceros / ACH.');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (acc: BankAccount) => {
    setEditingAccount(acc);
    setBankName(acc.bankName);
    setAccountNumber(acc.accountNumber);
    setAccountType(acc.accountType);
    setBeneficiaryName(acc.beneficiaryName);
    setRncOrId(acc.rncOrId);
    setShortInstructions(acc.shortInstructions);
    setIsActive(acc.isActive !== false);
    setIsModalOpen(true);
  };

  const handleToggleActive = (accountId: string) => {
    const updated = bankAccounts.map((acc) =>
      acc.id === accountId ? { ...acc, isActive: acc.isActive === false ? true : false } : acc
    );
    onUpdateBankAccounts(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNumber.trim()) return;

    if (editingAccount) {
      const updated = bankAccounts.map((acc) =>
        acc.id === editingAccount.id
          ? {
              ...acc,
              bankName,
              accountNumber: accountNumber.trim(),
              accountType,
              beneficiaryName: beneficiaryName.trim(),
              rncOrId: rncOrId.trim(),
              shortInstructions: shortInstructions.trim(),
              isActive,
            }
          : acc
      );
      onUpdateBankAccounts(updated);
    } else {
      const newAcc: BankAccount = {
        id: `bank-${Date.now()}`,
        bankName,
        bankCode: `BK-0${bankAccounts.length + 1}`,
        accountNumber: accountNumber.trim(),
        accountType,
        beneficiaryName: beneficiaryName.trim(),
        rncOrId: rncOrId.trim(),
        logoColor: bankName.includes('Banreservas') ? '#003882' : bankName.includes('BHD') ? '#008752' : '#002F6C',
        bgLight: 'bg-slate-50 border-slate-200 text-slate-900',
        badgeBorder: 'border-slate-400',
        shortInstructions: shortInstructions.trim(),
        isActive: true,
      };
      onUpdateBankAccounts([...bankAccounts, newAcc]);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Cuentas Bancarias Oficiales para Depósitos</span>
            <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {bankAccounts.length} Bancos RD
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Administra las cuentas de Banreservas, Banco BHD y Banco Popular donde los compradores transfieren el dinero.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors shadow-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Agregar Cuenta Bancaria</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bankAccounts.map((account) => {
          const isAccActive = account.isActive !== false;

          return (
            <div
              key={account.id}
              className={`bg-white rounded-3xl border shadow-xs p-6 space-y-4 flex flex-col justify-between transition-all ${
                isAccActive ? 'border-slate-200' : 'border-slate-200 opacity-60 bg-slate-50'
              }`}
            >
              <div className="space-y-3">
                {/* Bank Name & Status pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2
                      className="w-5 h-5"
                      style={{ color: account.logoColor || '#003882' }}
                    />
                    <h3 className="font-black text-base text-slate-900">{account.bankName}</h3>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isAccActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isAccActive ? 'Activa en Checkout' : 'Oculta'}
                  </span>
                </div>

                {/* Account Details */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Número de Cuenta</span>
                    <span className="font-mono font-black text-sm text-slate-900 tracking-wider">
                      {account.accountNumber}
                    </span>
                  </div>

                  {account.accountType && account.accountType.trim() !== '' && (
                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                      <span>Tipo:</span>
                      <strong className="text-slate-800">{account.accountType}</strong>
                    </div>
                  )}

                  {account.beneficiaryName && account.beneficiaryName.trim() !== '' && (
                    <div className="flex justify-between text-slate-600">
                      <span>Beneficiario:</span>
                      <strong className="text-slate-800 truncate max-w-[130px]">{account.beneficiaryName}</strong>
                    </div>
                  )}

                  {account.rncOrId && account.rncOrId.trim() !== '' && (
                    <div className="flex justify-between text-slate-600">
                      <span>RNC / Cédula:</span>
                      <strong className="text-slate-800 font-mono">{account.rncOrId}</strong>
                    </div>
                  )}
                </div>

                {/* Buyer Instructions */}
                {account.shortInstructions && account.shortInstructions.trim() !== '' && (
                  <p className="text-[11px] text-slate-500 italic bg-white p-2.5 rounded-xl border border-slate-100">
                    "{account.shortInstructions}"
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleToggleActive(account.id)}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                >
                  {isAccActive ? (
                    <>
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                      <span>Activa</span>
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="w-5 h-5 text-slate-400" />
                      <span>Desactivada</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => openEditModal(account)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT BANK MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {editingAccount ? 'Editar Cuenta Bancaria' : 'Agregar Nueva Cuenta'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configura los datos exactos que verán los compradores para realizar sus transferencias.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Banco *</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="Banreservas">Banreservas (Banco de Reservas)</option>
                  <option value="Banco BHD">Banco BHD</option>
                  <option value="Banco Popular">Banco Popular Dominicano</option>
                  <option value="Asociación Popular">Asociación Popular de Ahorros y Préstamos</option>
                  <option value="Scotiabank">Scotiabank República Dominicana</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número de Cuenta *</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="Ej: 960-1234567-8"
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Cuenta</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Cuenta Corriente">Cuenta Corriente</option>
                    <option value="Cuenta de Ahorros">Cuenta de Ahorros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Titular / Beneficiario (Opcional)</label>
                <input
                  type="text"
                  value={beneficiaryName}
                  onChange={(e) => setBeneficiaryName(e.target.value)}
                  placeholder="Ej: RIFAS DEL CARIBE SRL (o dejar vacío)"
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">RNC o Cédula (Opcional)</label>
                <input
                  type="text"
                  value={rncOrId}
                  onChange={(e) => setRncOrId(e.target.value)}
                  placeholder="Ej: 1-32-48921-9 (o dejar vacío para no mostrarlo)"
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 font-mono text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Instrucciones de Transferencia (Opcional)</label>
                <textarea
                  rows={2}
                  value={shortInstructions}
                  onChange={(e) => setShortInstructions(e.target.value)}
                  placeholder="Ej: Transfiere desde la App de Banreservas seleccionando Pagos a Terceros..."
                  className="w-full px-3 py-2 rounded-2xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black cursor-pointer shadow-sm"
                >
                  Guardar Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
