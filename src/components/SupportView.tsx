import React, { useState } from 'react';
import { MessageSquare, Send, Phone, Clock, CheckCircle2, User, ShieldCheck, HelpCircle, MessageCircle, AlertCircle, Sparkles } from 'lucide-react';
import { SupportConversation, Ticket, UserProfile } from '../types';

interface SupportViewProps {
  user: UserProfile;
  tickets: Ticket[];
  conversations: SupportConversation[];
  onSendMessage: (subject: string, messageText: string, ticketId?: string) => void;
}

export const SupportView: React.FC<SupportViewProps> = ({
  user,
  tickets,
  conversations,
  onSendMessage,
}) => {
  const [subject, setSubject] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isSentSuccess, setIsSentSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !messageText.trim()) return;

    onSendMessage(subject, messageText, selectedTicketId || undefined);
    setSubject('');
    setMessageText('');
    setSelectedTicketId('');
    setIsSentSuccess(true);
    setTimeout(() => {
      setIsSentSuccess(false);
    }, 4000);
  };

  return (
    <div className="space-y-8 pb-24 md:pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-200">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Atención Directa al Comprador</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Centro de Ayuda & Verificaciones
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          ¿Tienes preguntas sobre el estado de tu boleto, la cuenta bancaria de depósito o el sorteo? Escríbenos directamente o chatea por WhatsApp con nuestro oficial de soporte.
        </p>

        {/* WhatsApp Fast Channel */}
        <div className="p-4 rounded-2xl bg-emerald-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-xs">
              <MessageCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Canal Directo de WhatsApp</h3>
              <p className="text-emerald-200 text-xs">+1 (829) 555-0199 • Respuestas inmediatas</p>
            </div>
          </div>

          <a
            href="https://wa.me/18295550199"
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs transition-colors flex items-center gap-2 shadow-xs shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chatear por WhatsApp</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form to submit a ticket - 6 cols */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
              Enviar Mensaje al Administrador
            </h2>
            <p className="text-xs text-slate-500">
              Te responderemos en este panel y recibirás una notificación instantánea
            </p>
          </div>

          {isSentSuccess && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡Mensaje enviado con éxito! El oficial revisará tu consulta.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subject */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Asunto o Motivo *</label>
              <input
                type="text"
                required
                placeholder="Ej. Consulta sobre comprobante Banreservas"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>

            {/* Associate with an existing ticket (optional) */}
            {tickets.length > 0 && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Asociar a un Boleto (Opcional)
                </label>
                <select
                  value={selectedTicketId}
                  onChange={(e) => setSelectedTicketId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
                >
                  <option value="">-- Sin boleto asociado --</option>
                  {tickets.map((t) => (
                    <option key={t.id} value={t.id}>
                      Boleto #{t.ticketNumber} - {t.raffleTitle.substring(0, 30)}... ({t.bankUsed})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Message Body */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Tu Mensaje o Duda *</label>
              <textarea
                required
                rows={4}
                placeholder="Describe tu consulta con el mayor detalle posible..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Enviar Consulta a Soporte</span>
            </button>
          </form>
        </div>

        {/* History / Previous Conversations - 6 cols */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="font-bold text-base text-slate-900">
                Historial de Consultas ({conversations.length})
              </h2>
              <span className="text-xs text-slate-500">Respuestas oficiales</span>
            </div>

            {conversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No tienes consultas activas en este momento.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{conv.subject}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          conv.status === 'answered'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {conv.status === 'answered' ? 'Respondido' : 'Pendiente'}
                      </span>
                    </div>

                    {/* Chat Messages */}
                    <div className="space-y-2 pt-1">
                      {conv.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl text-xs space-y-1 ${
                            m.sender === 'admin'
                              ? 'bg-emerald-950 text-white rounded-tl-xs ml-4'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tr-xs mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span
                              className={`font-bold ${
                                m.sender === 'admin' ? 'text-emerald-400' : 'text-slate-500'
                              }`}
                            >
                              {m.senderName}
                            </span>
                            <span className={m.sender === 'admin' ? 'text-slate-400' : 'text-slate-400'}>
                              {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="leading-relaxed">{m.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
