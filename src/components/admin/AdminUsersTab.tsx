import React, { useState } from 'react';
import { 
  Users, UserCheck, UserX, Shield, Search, Filter, Phone, Mail, 
  MapPin, DollarSign, Ticket, Award, Edit3, MessageCircle, AlertCircle,
  Eye, CheckCircle2, ChevronRight, XCircle
} from 'lucide-react';
import { ManagedUser, Ticket as TicketType } from '../../types';

interface AdminUsersTabProps {
  users?: ManagedUser[];
  tickets?: TicketType[];
  onUpdateUserStatus: (userId: string, newStatus: 'active' | 'blocked' | 'vip', notes?: string) => void;
}

export const AdminUsersTab: React.FC<AdminUsersTabProps> = ({
  users = [],
  tickets = [],
  onUpdateUserStatus,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectUser, setInspectUser] = useState<ManagedUser | null>(null);

  const safeUsers = users || [];
  const safeTickets = tickets || [];

  // Edit user note state
  const [editingNote, setEditingNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  // Filtered users
  const filteredUsers = safeUsers.filter((u) => {
    const matchesStatus = selectedFilter === 'all' || u.status === selectedFilter;
    const matchesSearch =
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone || '').includes(searchQuery) ||
      (u.cedulaOrId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.city && u.city.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const totalSpentAll = safeUsers.reduce((acc, u) => acc + (u.totalSpent || 0), 0);

  const handleOpenInspect = (user: ManagedUser) => {
    setInspectUser(user);
    setEditingNote(user.notes || '');
    setIsEditingNote(false);
  };

  const handleSaveUserStatus = (newStatus: 'active' | 'blocked' | 'vip') => {
    if (!inspectUser) return;
    onUpdateUserStatus(inspectUser.id, newStatus, editingNote);
    setInspectUser({ ...inspectUser, status: newStatus, notes: editingNote });
    setIsEditingNote(false);
  };

  const userTickets = inspectUser ? safeTickets.filter((t) => t.userId === inspectUser.id || t.userName === inspectUser.fullName) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Gestión de Usuarios & Compradores</span>
            <span className="text-xs bg-indigo-100 text-indigo-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {users.length} Usuarios Registrados
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Directorio de participantes, historial de boletos adquiridos, segmentación VIP y control de acceso.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold bg-slate-100 text-slate-800 px-3.5 py-2 rounded-2xl">
            Volumen Compradores: <strong className="text-emerald-700">RD$ {totalSpentAll.toLocaleString()}</strong>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">Compradores Activos</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {safeUsers.filter((u) => u.status === 'active').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">Clientes VIP (+RD$3,000)</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {safeUsers.filter((u) => u.status === 'vip').length}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <UserX className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block">Cuentas Restringidas</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {safeUsers.filter((u) => u.status === 'blocked').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'active', label: 'Activos' },
            { id: 'vip', label: 'VIP' },
            { id: 'blocked', label: 'Bloqueados' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono (809...), email..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-4">Usuario</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Ubicación</th>
                <th className="p-4 text-center">Boletos</th>
                <th className="p-4 text-right">Inversión Total</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                  {/* User name & avatar */}
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-slate-900 text-emerald-400 font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                        {user.fullName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 block">{user.fullName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {user.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="p-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-slate-700 font-mono font-medium">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{user.phone}</span>
                      </div>
                      {user.cedulaOrId && (
                        <div className="text-[11px] font-mono text-slate-600">
                          <span className="text-slate-400 text-[10px]">Céd: </span>{user.cedulaOrId}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-300" />
                        <span className="truncate max-w-[140px]">{user.email}</span>
                      </div>
                    </div>
                  </td>

                  {/* Location */}
                  <td className="p-4 text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{user.city || 'Santo Domingo'}</span>
                    </div>
                  </td>

                  {/* Tickets bought */}
                  <td className="p-4 text-center font-mono font-bold text-slate-900">
                    <span className="px-2 py-0.5 rounded-lg bg-slate-100">
                      {user.totalTicketsBought}
                    </span>
                  </td>

                  {/* Total spent */}
                  <td className="p-4 text-right font-mono font-extrabold text-emerald-700">
                    RD$ {user.totalSpent.toLocaleString()}
                  </td>

                  {/* Status */}
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        user.status === 'vip'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : user.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.status === 'vip' && <Award className="w-3 h-3 text-amber-600" />}
                      {user.status === 'active' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {user.status === 'blocked' && <UserX className="w-3 h-3 text-red-600" />}
                      <span className="capitalize">{user.status}</span>
                    </span>
                  </td>

                  {/* Action */}
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(user)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ficha</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER DETAIL & HISTORY MODAL */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 border border-slate-200 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 font-black flex items-center justify-center text-base">
                  {inspectUser.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <span>{inspectUser.fullName}</span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        inspectUser.status === 'vip'
                          ? 'bg-amber-100 text-amber-900'
                          : inspectUser.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {inspectUser.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Registrado el {new Date(inspectUser.joinedDate).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Contact Bar & WhatsApp Trigger */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Teléfono Móvil</span>
                <span className="font-mono font-bold text-slate-900">{inspectUser.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Cédula / Documento</span>
                <span className="font-mono font-bold text-slate-900">{inspectUser.cedulaOrId || 'No registrada'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Correo Electrónico</span>
                <span className="font-medium text-slate-800 truncate block">{inspectUser.email}</span>
              </div>
              <div className="flex items-center justify-start sm:justify-end">
                <a
                  href={`https://wa.me/1${inspectUser.phone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Status Switcher & Notes */}
            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <label className="text-xs font-bold text-slate-800 block">Estado de Cuenta</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveUserStatus('active')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    inspectUser.status === 'active'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  Activo (Permitido)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveUserStatus('vip')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    inspectUser.status === 'vip'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  VIP (Trato Preferencial)
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveUserStatus('blocked')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    inspectUser.status === 'blocked'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  Bloqueado (Restringido)
                </button>
              </div>

              {/* Internal Admin Notes */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-600 block mb-1">Notas Internas del Cliente</label>
                <textarea
                  rows={2}
                  value={editingNote}
                  onChange={(e) => setEditingNote(e.target.value)}
                  placeholder="Anotaciones sobre método preferido de pago, validaciones notariales..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Tickets History List */}
            <div className="space-y-2">
              <h4 className="font-extrabold text-xs text-slate-900 flex items-center justify-between">
                <span>Historial de Boletos Adquiridos</span>
                <span className="font-mono text-slate-500">{userTickets.length} boletos</span>
              </h4>

              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                {userTickets.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No se han registrado boletos para este perfil.
                  </div>
                ) : (
                  userTickets.map((t) => (
                    <div key={t.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div>
                        <span className="font-mono font-black text-slate-900">#{t.ticketNumber}</span>
                        <span className="text-slate-500 ml-2 font-medium">{t.raffleTitle}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-slate-700">RD$ {t.pricePaid}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'confirmed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'pending_payment'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
