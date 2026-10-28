import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Sparkles, Shield, Clock, Trophy, ChevronRight, CheckCircle2, AlertCircle, ArrowRight, Star, Award, Building2, Gift, Video, Film, Image as ImageIcon } from 'lucide-react';
import { Raffle, DrawResult, MediaItem } from '../types';
import * as api from '../lib/api';

interface HomeViewProps {
  raffles?: Raffle[];
  winners?: DrawResult[];
  onSelectRaffle: (raffleId: string) => void;
  onNavigateToWinners: () => void;
}

const HomeRaffleCard: React.FC<{
  raffle: Raffle;
  raffleIndex: number;
  onSelectRaffle: (raffleId: string) => void;
}> = ({ raffle, raffleIndex, onSelectRaffle }) => {
  // El listado de "Rifas Activas" (fetchActiveRaffles) trae raffle.media = []
  // a propósito, para que la carga inicial de la página de inicio sea liviana.
  // Por eso cada tarjeta busca aquí su propia galería de fotos/videos.
  //
  // IMPORTANTE: NO usamos `raffle.media` como respaldo. Ese campo viene del
  // listado general, que siempre lo trae vacío y se sobrescribe cada vez que
  // llega una actualización en tiempo real (Supabase Realtime / polling).
  // Si mezclábamos ambas fuentes, una actualización en tiempo real podía
  // "vaciar" la galería ya cargada y congelar el carrusel en la imagen 1.
  // Por eso esta tarjeta depende ÚNICAMENTE de su propia carga (`galleryMedia`).
  const [galleryMedia, setGalleryMedia] = useState<MediaItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const loadGallery = (attempt = 1) => {
      api
        .fetchRaffleMedia(raffle.id)
        .then((media) => {
          if (!cancelled) setGalleryMedia(media);
        })
        .catch((err) => {
          console.error(`Error cargando galería de la rifa ${raffle.id} (intento ${attempt}):`, err);
          // Reintenta una vez más por si la sesión de Supabase aún no
          // había terminado de inicializar en la primera carga de la página.
          if (!cancelled && attempt < 2) {
            setTimeout(() => loadGallery(attempt + 1), 1500);
          }
        });
    };

    loadGallery();

    return () => {
      cancelled = true;
    };
  }, [raffle.id]);

  const mediaList = useMemo<MediaItem[]>(() => {
    const items: MediaItem[] = [...galleryMedia];
    const bannerUrl = raffle.bannerUrl?.trim();

    if (bannerUrl) {
      const alreadyExists = items.some((item) => item.url === bannerUrl);
      if (!alreadyExists) {
        items.unshift({ id: 'home-banner', type: 'image', url: bannerUrl, title: 'Portada Principal' });
      }
    }

    if (items.length === 0) {
      return [{ id: 'fallback', type: 'image', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80', title: 'Premio' }];
    }

    return items;
  }, [raffle.bannerUrl, galleryMedia]);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Ref con la lista de medios siempre actualizada, para que el intervalo de
  // abajo no dependa de la referencia del array (evita que actualizaciones en
  // tiempo real, que recrean el objeto `raffle`, reinicien el temporizador).
  const mediaListRef = useRef(mediaList);
  useEffect(() => {
    mediaListRef.current = mediaList;
    setActiveImageIndex((prev) => (prev >= mediaList.length ? 0 : prev));
  }, [mediaList]);

  // Auto-play de la galería cada 4 segundos.
  // Depende de `mediaList.length` (primitivo) en vez del array completo, y
  // ahora `mediaList` solo cambia de tamaño cuando realmente cambia la
  // galería cargada (no por actualizaciones en tiempo real ajenas a esto).
  useEffect(() => {
    if (!mediaList || mediaList.length <= 1) return;

    const timer = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % mediaListRef.current.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [mediaList.length]);

  const activeImage = mediaList[activeImageIndex] || mediaList[0];
  const soldCount = raffle.soldTicketsCount || 0;
  const percentSold = Math.round((soldCount / raffle.totalTickets) * 100);
  const remainingTickets = raffle.totalTickets - soldCount - (raffle.reservedTicketsCount || 0);
  const hasVideo = mediaList.some((m) => m.type === 'video');
  const mediaCount = mediaList.length;

  return (
    <div
      key={raffle.id}
      id={`raffle-card-${raffle.id}`}
      onClick={() => onSelectRaffle(raffle.id)}
      className="group cursor-pointer bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-slate-300 transition-all duration-300 overflow-hidden flex flex-col justify-between"
    >
      <div>
        {/* Image with Category badge and draw countdown */}
        <div className="relative aspect-16/10 overflow-hidden bg-slate-900">
          {activeImage.type === 'video' ? (
            <video
              src={activeImage.url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <img
              src={activeImage.url}
              alt={raffle.title}
              width={800}
              height={500}
              loading={raffleIndex === 0 ? 'eager' : 'lazy'}
              fetchPriority={raffleIndex === 0 ? 'high' : 'auto'}
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}

          {mediaList.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 rounded-full border border-white/20 bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
              {activeImageIndex + 1} / {mediaList.length}
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>

          {/* Top badges */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-extrabold bg-[#0F2137]/90 backdrop-blur-md text-white px-2.5 py-1 rounded-lg border border-slate-700 shadow-xs">
              {raffle.category}
            </span>
            {hasVideo && (
              <span className="text-[10px] font-black bg-purple-600/90 text-white px-2 py-0.5 rounded-md border border-purple-400 shadow-xs flex items-center gap-1 backdrop-blur-xs">
                <Video className="w-3 h-3" />
                <span>Video</span>
              </span>
            )}
            {!hasVideo && mediaCount > 1 && (
              <span className="text-[10px] font-black bg-slate-900/80 text-slate-200 px-2 py-0.5 rounded-md border border-slate-700 shadow-xs flex items-center gap-1 backdrop-blur-xs">
                <ImageIcon className="w-3 h-3 text-emerald-400" />
                <span>{mediaCount} Fotos</span>
              </span>
            )}
          </div>

          {raffle.hasBonusPromotion && (
            <div className="absolute top-3 right-3 animate-bounce">
              <span className="text-[11px] font-black bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 px-2.5 py-1 rounded-lg border border-amber-300 shadow-md flex items-center gap-1">
                <Gift className="w-3.5 h-3.5 text-slate-950" />
                <span>{raffle.bonusBuyThreshold}+{raffle.bonusFreeTickets} GRATIS</span>
              </span>
            </div>
          )}

          {/* Bottom Price Pill over image */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-300 tracking-wider block">
                Precio por Boleto
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold text-white font-mono drop-shadow-xs">
                  RD$ {raffle.ticketPrice.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-5 space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug line-clamp-2">
              {raffle.title}
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {raffle.subtitle}
            </p>
          </div>

          {/* Promotional Event Banner inside card */}
          {raffle.hasBonusPromotion && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
              <Gift className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-bold text-[11px] leading-tight line-clamp-1">
                {raffle.bonusPromotionBadge || `¡Evento: Compra ${raffle.bonusBuyThreshold} y llévate +${raffle.bonusFreeTickets} GRATIS!`}
              </span>
            </div>
          )}

          {/* Draw Date Info (Only if raffle has an active drawDate) */}
          {raffle.enableDrawDate !== false && raffle.drawDate && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
              <Clock className="w-4 h-4 shrink-0 text-amber-600" />
              <div className="truncate">
                <span className="text-slate-500 text-[11px] block">
                  Fecha del Sorteo:
                </span>
                <span className="font-bold text-slate-900">
                  {new Date(raffle.drawDate).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          )}

          {/* Progress Bar of Sold vs Remaining */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                {percentSold}% Boletos Confirmados
              </span>
              {raffle.hideRemainingTickets ? (
                <span className="text-emerald-700 font-mono text-[11px] font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  {soldCount} Vendidos
                </span>
              ) : (
                <span className="text-slate-500 font-mono text-[11px]">
                  {raffle.allowSalesBeyondLimit !== false && remainingTickets <= 0 ? (
                    <strong className="text-emerald-700">{soldCount} Vendidos</strong>
                  ) : (
                    <>Quedan <strong>{Math.max(0, remainingTickets)}</strong> de {raffle.totalTickets}</>
                  )}
                </span>
              )}
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, percentSold)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Button */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-700 transition-colors">
          Seleccionar Números
        </span>
        <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-colors shadow-2xs">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};

export const HomeView: React.FC<HomeViewProps> = ({
  raffles = [],
  winners = [],
  onSelectRaffle,
  onNavigateToWinners,
}) => {
  const safeRaffles = raffles || [];
  const safeWinners = winners || [];
  const activeRaffles = safeRaffles.filter((r) => r.status === 'active');

  return (
    <div className="space-y-8 pb-12">
      {/* ACTIVE RAFFLES SECTION */}
      <section id="active-raffles-section" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Rifas Activas Oficiales
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Boletos disponibles para compra inmediata mediante transferencia directa
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full w-fit">
            {activeRaffles.length} Sorteos en Venta
          </span>
        </div>

        {/* Raffles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeRaffles.map((raffle, raffleIndex) => (
            <HomeRaffleCard
              key={raffle.id}
              raffle={raffle}
              raffleIndex={raffleIndex}
              onSelectRaffle={onSelectRaffle}
            />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (3 Simple Steps) */}
      <section className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-xs space-y-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono">
            Proceso Directo & Confiable
          </span>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            ¿Cómo participar en 3 sencillos pasos?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
              1
            </div>
            <h3 className="font-bold text-sm text-slate-900">1. Elige tus Boletos</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Selecciona tus números favoritos en la cuadrícula en vivo o pide números aleatorios de la suerte.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
              2
            </div>
            <h3 className="font-bold text-sm text-slate-900">2. Transfiere a Cuenta Oficial</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Realiza la transferencia desde Banreservas, BHD o Popular a nuestra cuenta empresarial certificada.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm shadow-xs">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900">3. Validación & Sorteo</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sube tu comprobante. Nuestro auditor confirma el pago en cuenta y tu boleto entra al sorteo notarial.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
