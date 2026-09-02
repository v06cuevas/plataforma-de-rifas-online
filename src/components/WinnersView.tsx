import React, { useState } from 'react';
import { Trophy, Award, ShieldCheck, CheckCircle2, Play, Star, Calendar, MapPin, Sparkles, Hash, FileCheck, Check } from 'lucide-react';
import { DrawResult } from '../types';

interface WinnersViewProps {
  winners: DrawResult[];
  onExploreRaffles: () => void;
}

export const WinnersView: React.FC<WinnersViewProps> = ({ winners, onExploreRaffles }) => {
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  const handleCopyHash = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHashId(id);
    setTimeout(() => setCopiedHashId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
          <Trophy className="w-4 h-4 text-amber-600" />
          <span>Muro de la Transparencia y Entregas Reales</span>
        </div>

        <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Ganadores Oficiales & Certificados Notariales
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl">
          Todos los sorteos son públicos, verificables mediante algoritmo criptográfico SHA-256 y certificados bajo fe de Notario Público en República Dominicana.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="text-slate-500 text-[11px] block">Total Premios Entregados</span>
              <strong className="text-slate-900 font-mono text-sm">+RD$ 15,000,000</strong>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="text-slate-500 text-[11px] block">Garantía Notarial</span>
              <strong className="text-slate-900 text-sm">100% Legal y Certificado</strong>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 shrink-0 fill-yellow-400" />
            <div>
              <span className="text-slate-500 text-[11px] block">Transparencia</span>
              <strong className="text-slate-900 text-sm">Hash Criptográfico SHA-256</strong>
            </div>
          </div>
        </div>
      </div>

      {/* WINNERS CARDS LIST */}
      <div className="space-y-6">
        {winners.map((winner) => (
          <div
            key={winner.id}
            className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-5 sm:p-6"
          >
            {/* Delivery Photo with Winner badge - 5 cols */}
            <div className="md:col-span-5 relative aspect-16/11 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-2xs">
              <img
                src={winner.deliveryPhotoUrl || winner.prizeImage}
                alt={winner.winnerName}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 font-extrabold text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Boleto Ganador #{winner.winningTicketNumber}</span>
              </div>
            </div>

            {/* Winner Details & Testimonial - 7 cols */}
            <div className="md:col-span-7 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {winner.prizeDelivered ? 'Premio Entregado y Verificado' : 'Sorteado • En Trámite'}
                </span>
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(winner.drawnAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div>
                <h3 className="font-extrabold text-lg sm:text-xl text-slate-900">
                  {winner.raffleTitle}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                  <span className="font-bold text-slate-800">{winner.winnerName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {winner.winnerCity}
                  </span>
                </div>
              </div>

              {winner.testimonial && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed italic">
                  "{winner.testimonial}"
                </div>
              )}

              {/* Cryptographic Proof Strip */}
              <div className="p-3 rounded-xl bg-slate-900 text-white text-[11px] font-mono space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold flex items-center gap-1">
                    <Hash className="w-3 h-3 text-emerald-400" />
                    Hash SHA-256 Verificable:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(winner.drawHash, winner.id)}
                    className="text-emerald-400 hover:text-emerald-300 font-sans font-bold flex items-center gap-1"
                  >
                    {copiedHashId === winner.id ? <Check className="w-3 h-3" /> : null}
                    <span>{copiedHashId === winner.id ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
                <p className="truncate text-slate-300 text-[10px]">{winner.drawHash}</p>
                <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between font-sans">
                  <span>Seed: <strong className="font-mono text-white">{winner.publicSeed}</strong></span>
                  <span>Boletos participantes: <strong className="text-white">{winner.totalEligibleTickets}</strong></span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CTA to Participate */}
      <div className="p-8 rounded-3xl bg-gradient-to-br from-[#0F2137] to-slate-900 text-white text-center space-y-4 shadow-xl">
        <h2 className="text-xl sm:text-2xl font-extrabold">¿Quieres ser el próximo ganador?</h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
          Participa con transferencias seguras desde Banreservas, BHD o Popular. Tus boletos quedan certificados de inmediato.
        </p>
        <button
          type="button"
          onClick={onExploreRaffles}
          className="py-3 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-extrabold text-xs sm:text-sm transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ver Rifas Activas Disponibles</span>
        </button>
      </div>
    </div>
  );
};
