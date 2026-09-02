import React, { useState } from 'react';
import { 
  MessageSquare, Send, CheckCircle2, Clock, User, Phone, 
  Search, Filter, Sparkles, MessageCircle, HelpCircle, Shield, 
  Check, X, CornerDownRight
} from 'lucide-react';
import { SupportConversation, Ticket } from '../../types';

interface AdminSupportTabProps {
  conversations?: SupportConversation[];
  tickets?: Ticket[];
  onReplySupport: (conversationId: string, replyText: string) => void;
  onUpdateConversationStatus?: (conversationId: string, status: 'open' | 'answered' | 'closed') => void;
}

export const AdminSupportTab: React.FC<AdminSupportTabProps> = ({
  conversations = [],
  tickets = [],
  onReplySupport,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const safeConversations = conversations || [];
  const safeTickets = tickets || [];

  const [activeConversationId, setActiveConversationId] = useState<string>(
    safeConversations[0]?.id || ''
  );
  const [replyText, setReplyText] = useState<string>('');

  const CANNED_RESPONSES = [
    '¡Hola! Tu transferencia bancaria ya fue verificada con éxito. Tus boletos están 100% asegurados ante notario público.',
    'Estimado cliente, no logramos ubicar la referencia en nuestro extracto bancario. Por favor reenvía el comprobante nítido.',
    'El sorteo se transmitirá en vivo por YouTube y Facebook Live en la fecha programada bajo supervisión notarial.',
    'La entrega de premios físicos se coordina en Santo Domingo con todos los documentos legales pagos por Rifas Caribe.',
  ];

  const filteredConversations = safeConversations.filter((c) => {
    const matchesStatus = selectedStatus === 'all' || c.status === selectedStatus;
    const matchesSearch =
      (c.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.userPhone || '').includes(searchQuery) ||
      (c.subject || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const activeConversation = safeConversations.find((c) => c.id === activeConversationId) || filteredConversations[0];

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeConversation) return;

    onReplySupport(activeConversation.id, replyText.trim());
    setReplyText('');
  };

  const handleUseCanned = (text: string) => {
    setReplyText(text);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Mesa de Soporte & Mensajes de Compradores</span>
            <span className="text-xs bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {safeConversations.filter((c) => c.status === 'open').length} Abiertos
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Atención personalizada sobre dudas de pagos bancarios, boletos apartados y fechas de sorteos oficiales.
          </p>
        </div>
      </div>

      {/* Main Support Grid: List on Left, Active Chat on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Inbox List */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col h-[650px]">
          {/* Filters & Search */}
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'open', label: 'Abiertos' },
                { id: 'answered', label: 'Respondidos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    selectedStatus === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por comprador o teléfono..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Conversations list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay conversaciones que coincidan con los filtros.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConversation?.id;
                const lastMsg = conv.messages[conv.messages.length - 1];

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversationId(conv.id)}
                    className={`p-4 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                      isSelected ? 'bg-emerald-50/70 border-l-4 border-emerald-600' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-slate-900">{conv.userName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(conv.updatedAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{conv.subject}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{lastMsg?.text}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400 font-mono">{conv.userPhone}</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${
                          conv.status === 'open'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {conv.status === 'open' ? 'Pendiente' : 'Respondido'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Chat Box & Replies */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 shadow-xs h-[650px] flex flex-col justify-between overflow-hidden">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-emerald-400 font-black flex items-center justify-center text-xs">
                    {activeConversation.userName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                      <span>{activeConversation.userName}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-normal">({activeConversation.userPhone})</span>
                    </h3>
                    <p className="text-[11px] font-medium text-slate-600 line-clamp-1">
                      Asunto: {activeConversation.subject}
                    </p>
                  </div>
                </div>

                <a
                  href={`https://wa.me/1${activeConversation.userPhone.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                {activeConversation.messages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="font-bold">{msg.senderName}</span>
                        <span>•</span>
                        <span>{new Date(msg.createdAt).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl max-w-md text-xs leading-relaxed ${
                          isAdmin
                            ? 'bg-slate-900 text-white rounded-br-none shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-2xs'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Canned responses & Input Footer */}
              <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                {/* Canned shortcuts */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Respuestas rápidas:</span>
                  </span>
                  {CANNED_RESPONSES.map((resp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleUseCanned(resp)}
                      className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg truncate max-w-[200px] shrink-0 cursor-pointer text-left"
                    >
                      {resp}
                    </button>
                  ))}
                </div>

                {/* Input form */}
                <form onSubmit={handleSendReply} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe la respuesta oficial como Oficial de Tesorería..."
                    className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Responder</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
              Selecciona una conversación para responder.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
