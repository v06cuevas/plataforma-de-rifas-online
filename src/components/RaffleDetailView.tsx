import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeft, Clock, Play, Sparkles, Shuffle, Check, X, 
  Info, FileText, ChevronRight, AlertCircle, Share2, HelpCircle, Search, 
  Plus, Gift, Tag, CheckCircle2, Infinity, CalendarOff, Flame,
  Video, Film, ChevronLeft, Maximize2, Image as ImageIcon, Circle
} from 'lucide-react';
import { Raffle, Ticket, MediaItem } from '../types';

interface RaffleDetailViewProps {
  raffle: Raffle;
  existingTickets?: Ticket[];
  allTickets?: Ticket[];
  onBack: () => void;
  onProceedToPayment: (selectedNumbers: string[], totalAmount: number, bonusNumbers?: string[]) => void;
}

// Helper to convert YouTube / Vimeo URLs to embeddable player URLs
const getEmbedUrl = (url: string): { isEmbed: boolean; embedUrl: string } => {
  if (!url) return { isEmbed: false, embedUrl: url };
  
  // YouTube watch URL
  const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return { isEmbed: true, embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0` };
  }

  // Vimeo URL
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return { isEmbed: true, embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1` };
  }

  return { isEmbed: false, embedUrl: url };
};

export const RaffleDetailView: React.FC<RaffleDetailViewProps> = ({
  raffle,
  existingTickets = [],
  allTickets,
  onBack,
  onProceedToPayment,
}) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [showLightboxModal, setShowLightboxModal] = useState(false);
  const [selectedNumbers, setSelectedNumbers] = useState<string[]>([]);
  const [customQuantity, setCustomQuantity] = useState<number>(1);
  const [isShuffling, setIsShuffling] = useState(false);
  const [activeTab, setActiveTab] = useState<'selector' | 'description' | 'rules'>('selector');

  const mediaList: MediaItem[] = useMemo(() => {
    const items: MediaItem[] = raffle?.media && raffle.media.length > 0 ? [...raffle.media] : [];
    const bannerUrl = raffle?.bannerUrl?.trim();

    if (bannerUrl) {
      const alreadyExists = items.some((item) => item.url === bannerUrl);
      if (!alreadyExists) {
        items.unshift({ id: 'm-banner', type: 'image', url: bannerUrl, title: 'Portada Principal' });
      }
    }

    if (items.length === 0) {
      return [
        {
          id: 'm-default',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
          title: 'Premio'
        }
      ];
    }

    return items;
  }, [raffle?.media, raffle?.bannerUrl]);

  // Ref con la lista de medios siempre actualizada, para no depender de la
  // referencia del array dentro del efecto (evita reinicios innecesarios del timer)
  const mediaListRef = React.useRef(mediaList);
  useEffect(() => {
    mediaListRef.current = mediaList;
    // Si la lista cambió de tamaño y el índice activo quedó fuera de rango, lo corregimos
    setActiveMediaIndex((prev) => (prev >= mediaList.length ? 0 : prev));
  }, [mediaList]);

  // Auto-play gallery every 4 seconds (only when modal is not open)
  // Depende de `mediaList.length` (un número primitivo) y NO del array completo,
  // porque `raffle` se recrea en cada actualización en tiempo real (Supabase Realtime)
  // aunque el contenido no cambie. Si dependiéramos del array, el efecto se
  // desmontaría y volvería a montar constantemente, reiniciando el contador de 4s
  // antes de que llegara a cumplirse — por eso antes parecía "frizado".
  useEffect(() => {
    if (showLightboxModal) return; // Detener auto-play si el modal está abierto

    if (!mediaList || mediaList.length <= 1) return; // Solo auto-play si hay más de 1 imagen/video

    const timer = setInterval(() => {
      setActiveMediaIndex((prev) => (prev + 1) % mediaListRef.current.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [showLightboxModal, mediaList.length]);

  const safeTicketsList = allTickets || existingTickets || [];
  const allowSalesBeyondLimit = raffle?.allowSalesBeyondLimit !== false;
  const isDrawDateEnabled = raffle?.enableDrawDate !== false;

  const activeMedia = mediaList[activeMediaIndex] || mediaList[0];
  const videoCount = mediaList.filter(m => m.type === 'video').length;
  const imageCount = mediaList.filter(m => m.type === 'image').length;

  // Find all numbers that are already confirmed or pending payment for this raffle
  const { takenNumbersStrSet, takenNumbersIntSet } = useMemo(() => {
    const strSet = new Set<string>();
    const intSet = new Set<number>();
    if (!raffle?.id) return { takenNumbersStrSet: strSet, takenNumbersIntSet: intSet };

    safeTicketsList
      .filter((t) => t?.raffleId === raffle.id && (t?.status === 'confirmed' || t?.status === 'pending_payment'))
      .forEach((t) => {
        if (t?.ticketNumber) {
          strSet.add(t.ticketNumber);
          const parsed = parseInt(t.ticketNumber, 10);
          if (!isNaN(parsed) && parsed > 0) {
            intSet.add(parsed);
          }
        }
      });
    return { takenNumbersStrSet: strSet, takenNumbersIntSet: intSet };
  }, [safeTicketsList, raffle?.id]);

  // Max ticket number currently observed in taken set
  const maxTicketNumberObserved = useMemo(() => {
    let max = raffle?.totalTickets || 100;
    takenNumbersIntSet.forEach((numInt) => {
      if (numInt > max) {
        max = numInt;
      }
    });
    return max;
  }, [takenNumbersIntSet, raffle?.totalTickets]);

  // Dynamic formatting padding based on total tickets (e.g. 100 -> 4 digits '0042', 200,000 -> 6 digits '084920')
  const digitPadding = useMemo(() => {
    const total = raffle?.totalTickets || 1000;
    return Math.max(4, String(total).length);
  }, [raffle?.totalTickets]);

  const formatTicketNumber = (num: number): string => {
    return num.toString().padStart(digitPadding, '0');
  };

  // High-performance cryptographic/pseudo-random unique number generator
  // Guarantees 100% uniqueness with zero repeated numbers across 10k, 100k, 200k+ tickets
  const generateRandomAvailableNumbers = (count: number, currentSelected: string[] = []): string[] => {
    if (count <= 0) return [];
    const results: string[] = [];
    const chosenStrSet = new Set<string>(currentSelected);
    const chosenIntSet = new Set<number>();

    currentSelected.forEach((s) => {
      const parsed = parseInt(s, 10);
      if (!isNaN(parsed)) chosenIntSet.add(parsed);
    });

    const maxVal = allowSalesBeyondLimit
      ? Math.max(raffle.totalTickets, maxTicketNumberObserved + count + 200)
      : raffle.totalTickets;

    let attempts = 0;
    const maxAttempts = Math.max(count * 500, 5000);

    while (results.length < count && attempts < maxAttempts) {
      attempts++;
      const randInt = Math.floor(Math.random() * maxVal) + 1;
      const formatted = formatTicketNumber(randInt);

      const isTaken = takenNumbersIntSet.has(randInt) || takenNumbersStrSet.has(formatted);
      const isAlreadyChosen = chosenIntSet.has(randInt) || chosenStrSet.has(formatted);

      if (!isTaken && !isAlreadyChosen) {
        chosenIntSet.add(randInt);
        chosenStrSet.add(formatted);
        results.push(formatted);
      }
    }

    // Fallback scan if random sampling encounters dense regions
    if (results.length < count) {
      for (let i = 1; i <= maxVal && results.length < count; i++) {
        const formatted = formatTicketNumber(i);
        const isTaken = takenNumbersIntSet.has(i) || takenNumbersStrSet.has(formatted);
        const isAlreadyChosen = chosenIntSet.has(i) || chosenStrSet.has(formatted);

        if (!isTaken && !isAlreadyChosen) {
          chosenIntSet.add(i);
          chosenStrSet.add(formatted);
          results.push(formatted);
        }
      }

      if (results.length < count && allowSalesBeyondLimit) {
        let nextI = maxVal + 1;
        while (results.length < count) {
          const formatted = formatTicketNumber(nextI);
          const isTaken = takenNumbersIntSet.has(nextI) || takenNumbersStrSet.has(formatted);
          const isAlreadyChosen = chosenIntSet.has(nextI) || chosenStrSet.has(formatted);

          if (!isTaken && !isAlreadyChosen) {
            chosenIntSet.add(nextI);
            chosenStrSet.add(formatted);
            results.push(formatted);
          }
          nextI++;
        }
      }
    }

    return Array.from(new Set(results));
  };

  // Promotional Event Bonus Calculation (Buy X Get Y Free)
  const buyThreshold = raffle?.hasBonusPromotion && raffle?.bonusBuyThreshold && raffle.bonusBuyThreshold > 0 ? raffle.bonusBuyThreshold : 0;
  const freePerThreshold = raffle?.hasBonusPromotion && raffle?.bonusFreeTickets && raffle.bonusFreeTickets > 0 ? raffle.bonusFreeTickets : 0;
  const bonusTicketsEarned = (buyThreshold > 0 && freePerThreshold > 0)
    ? Math.floor(selectedNumbers.length / buyThreshold) * freePerThreshold
    : 0;

  // Auto-assigned bonus numbers from available tickets (strictly unique and non-colliding)
  const bonusNumbers = useMemo(() => {
    if (bonusTicketsEarned <= 0 || !raffle?.totalTickets) return [];
    return generateRandomAvailableNumbers(bonusTicketsEarned, selectedNumbers);
  }, [bonusTicketsEarned, raffle?.totalTickets, takenNumbersIntSet, takenNumbersStrSet, selectedNumbers, allowSalesBeyondLimit, maxTicketNumberObserved, digitPadding]);

  const ticketsUntilNextBonus = buyThreshold > 0 ? buyThreshold - (selectedNumbers.length % buyThreshold) : 0;

  // Actions for random number assignment
  const handleAddRandomTickets = (countToAdd: number) => {
    if (countToAdd <= 0) return;
    const newPicks = generateRandomAvailableNumbers(countToAdd, selectedNumbers);
    setSelectedNumbers(Array.from(new Set([...selectedNumbers, ...newPicks])));
  };

  const handleSetExactPack = (count: number) => {
    if (count <= 0) return;
    const newPicks = generateRandomAvailableNumbers(count, []);
    setSelectedNumbers(Array.from(new Set(newPicks)));
  };

  const handleShuffleAllNumbers = () => {
    setIsShuffling(true);
    const currentCount = selectedNumbers.length > 0 ? selectedNumbers.length : 1;
    setTimeout(() => {
      const newPicks = generateRandomAvailableNumbers(currentCount, []);
      setSelectedNumbers(Array.from(new Set(newPicks)));
      setIsShuffling(false);
    }, 250);
  };

  const handleRemoveNumber = (num: string) => {
    setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
  };

  const totalAmount = selectedNumbers.length * raffle.ticketPrice;
  const soldCount = raffle.soldTicketsCount || 0;
  const percentSold = Math.round((soldCount / raffle.totalTickets) * 100);
  const remainingTickets = raffle.totalTickets - soldCount - (raffle.reservedTicketsCount || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top breadcrumb & back button */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a Sorteos</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
            {raffle.status === 'active' ? 'Sorteo Oficial Activo' : 'Sorteo Pausado'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (Images, Video, Description, Rules) - 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Gallery with Photo & Video Player Support */}
          <div className="space-y-3">
            <div className="relative aspect-16/10 rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-md group">
              {activeMedia.type === 'video' ? (
                (() => {
                  const embed = getEmbedUrl(activeMedia.url);
                  if (embed.isEmbed) {
                    return (
                      <iframe
                        src={embed.embedUrl}
                        title={activeMedia.title || 'Video del Premio'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    );
                  }
                  return (
                    <video
                      src={activeMedia.url}
                      controls
                      autoPlay
                      className="w-full h-full object-contain bg-black"
                    />
                  );
                })()
              ) : (
                <div 
                  onClick={() => setShowLightboxModal(true)}
                  className="w-full h-full cursor-pointer relative"
                >
                  <img
                    src={activeMedia.url}
                    alt={activeMedia.title || raffle.title}
                    className="w-full h-full object-contain transition-all duration-300 group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/20 transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-700 flex items-center gap-1.5 shadow-lg">
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Ampliar Imagen</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Action buttons & badges on top */}
              <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap pointer-events-none">
                <span className="bg-[#0F2137]/90 text-white font-extrabold text-xs px-3 py-1 rounded-lg backdrop-blur-xs border border-slate-700 shadow-xs">
                  {raffle.category}
                </span>
                {raffle.hasBonusPromotion && (
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-3 py-1 rounded-lg shadow-md border border-amber-300 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    <span>{raffle.bonusBuyThreshold}+{raffle.bonusFreeTickets} GRATIS</span>
                  </span>
                )}
              </div>

              {/* Bottom Right Full Gallery / Media Controls */}
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLightboxModal(true)}
                  className="bg-slate-950/80 hover:bg-slate-950 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-lg transition-transform hover:scale-105 cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ver Pantalla Completa</span>
                </button>
              </div>

              {/* Item counter in bottom-left */}
              <div className="absolute bottom-4 left-4 pointer-events-none">
                <span className="bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                  {activeMedia.type === 'video' ? (
                    <Video className="w-3 h-3 text-purple-400" />
                  ) : (
                    <ImageIcon className="w-3 h-3 text-emerald-400" />
                  )}
                  <span>
                    {activeMedia.type === 'video' ? 'Video del Premio' : 'Foto'} ({activeMediaIndex + 1} de {mediaList.length})
                  </span>
                </span>
              </div>
            </div>

            {/* Thumbnails row (Both Photos and Videos) */}
            {mediaList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {mediaList.map((item, idx) => (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => setActiveMediaIndex(idx)}
                    className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-slate-900 ${
                      activeMediaIndex === idx
                        ? 'border-emerald-500 ring-2 ring-emerald-500/40 shadow-sm scale-102'
                        : 'border-slate-200 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {item.type === 'video' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-purple-950 text-white relative">
                        <Play className="w-5 h-5 fill-purple-400 text-purple-400" />
                        <span className="text-[8px] font-black uppercase tracking-wider text-purple-200">Video</span>
                      </div>
                    ) : (
                      <img src={item.url} alt={item.title || 'Foto'} className="w-full h-full object-cover" />
                    )}
                    <span className={`absolute top-1 left-1 px-1 rounded text-[7px] font-black uppercase text-white ${
                      item.type === 'video' ? 'bg-purple-600' : 'bg-slate-950/80'
                    }`}>
                      {item.type === 'video' ? 'Video' : 'Foto'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title and Key Details */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4 shadow-xs">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-snug">
              {raffle.title}
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{raffle.subtitle}</p>

            {/* Draw Date Card (Only displayed if the raffle has an official date configured) */}
            {isDrawDateEnabled && raffle.drawDate && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl border gap-3 bg-amber-50/80 border-amber-200/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 text-amber-900">
                    <Clock className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider block text-amber-800">
                      Fecha Oficial del Sorteo
                    </span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {new Date(raffle.drawDate).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full shrink-0">
                  {raffle.status === 'active' ? 'Venta Abierta' : 'Pausada'}
                </span>
              </div>
            )}

            {/* Overlimit Sales Notice Banner */}
            {allowSalesBeyondLimit && percentSold >= 100 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 text-xs text-emerald-950 flex items-start gap-2.5">
                <Flame className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-extrabold block">¡Meta Inicial Superada ({percentSold}%)!</span>
                  <p className="text-[11px] text-emerald-800 leading-tight mt-0.5">
                    Este sorteo continúa recibiendo compras. Todos los boletos participantes cuentan con igualdad de oportunidades.
                  </p>
                </div>
              </div>
            )}

            {/* Progress (Respects hideRemainingTickets and allowSalesBeyondLimit) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Progreso de boletos:</span>
                {raffle.hideRemainingTickets ? (
                  <span className="text-emerald-700 font-mono font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    {soldCount} vendidos confirmados ({percentSold}%)
                  </span>
                ) : (
                  <span className="text-slate-600 font-mono">
                    {allowSalesBeyondLimit && remainingTickets <= 0 ? (
                      <strong className="text-emerald-700">
                        {soldCount} vendidos (Meta de {raffle.totalTickets} alcanzada al {percentSold}%)
                      </strong>
                    ) : (
                      <>
                        {soldCount} vendidos de {raffle.totalTickets} ({percentSold}%)
                      </>
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

          {/* Description & Rules Tabs */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('selector')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'selector' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Información del Premio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                  activeTab === 'rules' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Reglas y Bases Legales
              </button>
            </div>

            {activeTab === 'selector' ? (
              <div className="prose prose-slate prose-sm text-slate-700 leading-relaxed">
                <p>{raffle.description}</p>
                {raffle.prizeDetails && raffle.prizeDetails.trim() && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 mt-4">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Detalles del Premio:</h4>
                    <div className="space-y-2">
                      {raffle.prizeDetails
                        .split('\n')
                        .map((detail, idx) => (
                          detail.trim() && (
                            <div key={idx} className="flex items-start gap-3">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="text-xs text-slate-600">{detail.trim()}</span>
                            </div>
                          )
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                {raffle.rules && raffle.rules.length > 0 && (
                  <div className="space-y-2">
                    {raffle.rules.map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-600">{rule}</span>
                      </div>
                    ))}
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600">Los pagos deben ser realizados mediante transferencia bancaria y confirmados por nuestro equipo antes del sorteo.</span>
                    </div>
                  </div>
                )}
                {raffle.legalTerms && raffle.legalTerms.trim() && (
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase">Términos Legales & RNC:</h4>
                    <div className="space-y-2">
                      {raffle.legalTerms
                        .split('\n')
                        .map((term, idx) => (
                          term.trim() && (
                            <div key={idx} className="flex items-start gap-3">
                              <Circle className="w-2.5 h-2.5 text-slate-400 shrink-0 mt-1" />
                              <span className="text-xs text-slate-600">{term.trim()}</span>
                            </div>
                          )
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Ticket Selector & Checkout Summary) - 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-lg space-y-6 sticky top-20">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">
                  Precio Oficial por Boleto
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
                  RD$ {raffle.ticketPrice.toLocaleString()}
                </span>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Transferencia Directa
              </span>
            </div>

            {/* PROMOTIONAL EVENT BANNER (Buy X Get Y Free) */}
            {raffle.hasBonusPromotion && buyThreshold > 0 && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 shadow-2xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 mt-0.5 shrink-0">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-amber-950 block">
                      ¡Evento Especial de Boletos de Regalo!
                    </span>
                    <p className="text-[11px] text-amber-900 leading-snug">
                      {raffle.bonusPromotionBadge || `Por cada ${buyThreshold} boletos que selecciones, el sistema te otorga +${freePerThreshold} boleto GRATIS automáticamente.`}
                    </p>
                  </div>
                </div>

                {/* Live Progress towards next free ticket */}
                {selectedNumbers.length > 0 && (
                  <div className="pt-1.5 border-t border-amber-200/80 flex items-center justify-between text-[11px]">
                    {bonusTicketsEarned > 0 ? (
                      <span className="font-extrabold text-emerald-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>¡Tienes <strong>+{bonusTicketsEarned} boleto(s) GRATIS</strong> ganados!</span>
                      </span>
                    ) : (
                      <span className="text-amber-800 font-medium">
                        Agrega <strong>{ticketsUntilNextBonus} boleto(s) más</strong> para tu 1er regalo
                      </span>
                    )}
                    <span className="font-mono font-bold text-amber-900 text-[10px] bg-amber-200/80 px-2 py-0.5 rounded-md">
                      {selectedNumbers.length % buyThreshold}/{buyThreshold}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* SELECCIÓN AUTOMÁTICA Y ALEATORIA DE BOLETOS */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Shuffle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Elige la Cantidad de Boletos</span>
                </label>
                {raffle.hasBonusPromotion && buyThreshold > 0 && (
                  <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    Promo {buyThreshold}+{freePerThreshold} Gratis
                  </span>
                )}
              </div>

              {/* Botones de Paquetes Rápidos Aleatorios */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { count: 1, label: '+1 Boleto' },
                  { count: 3, label: '+3 Boletos' },
                  { 
                    count: buyThreshold > 0 ? buyThreshold : 5, 
                    label: buyThreshold > 0 ? `+${buyThreshold} Boletos` : '+5 Boletos',
                    badge: freePerThreshold > 0 ? `+${freePerThreshold} 🎁` : undefined 
                  },
                  { 
                    count: buyThreshold > 0 ? buyThreshold * 2 : 10, 
                    label: buyThreshold > 0 ? `+${buyThreshold * 2} Boletos` : '+10 Boletos',
                    badge: freePerThreshold > 0 ? `+${freePerThreshold * 2} 🎁` : undefined 
                  },
                  { count: 25, label: '+25 Boletos' },
                  { count: 50, label: '+50 Boletos' },
                  { count: 100, label: '+100 Boletos' },
                  { count: 250, label: '+250 Boletos' },
                ].map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAddRandomTickets(item.count)}
                    className="py-2.5 px-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-all text-center shadow-2xs flex flex-col items-center justify-center cursor-pointer active:scale-95"
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black text-amber-600 block">{item.badge}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Control de Cantidad Manual Personalizada */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-600 block">
                  O introduce una cantidad personalizada:
                </span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setCustomQuantity((prev) => Math.max(1, prev - 1))}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold text-sm cursor-pointer transition-colors"
                      title="Restar 1"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={customQuantity}
                      onChange={(e) => setCustomQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-16 text-center font-mono font-extrabold text-xs text-slate-900 focus:outline-none py-1.5"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomQuantity((prev) => prev + 1)}
                      className="px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-bold text-sm cursor-pointer transition-colors"
                      title="Sumar 1"
                    >
                      +
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddRandomTickets(customQuantity)}
                    className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Confirmar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Listado de Números Asignados */}
            {(selectedNumbers.length > 0 || bonusNumbers.length > 0) && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                {/* Regular Selected Numbers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tus Números de la Suerte ({selectedNumbers.length}):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedNumbers([])}
                      className="text-[11px] text-red-600 hover:underline font-semibold cursor-pointer"
                    >
                      Limpiar
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {selectedNumbers.map((num) => (
                      <span
                        key={num}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-slate-900 border border-slate-200 font-mono text-xs font-bold shadow-2xs hover:border-emerald-400 transition-colors"
                      >
                        <span className="text-emerald-700 font-extrabold">#{num}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveNumber(num)}
                          className="text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Eliminar este número"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bonus Free Tickets Awarded by Event */}
                {bonusNumbers.length > 0 && (
                  <div className="space-y-1.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-amber-950 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-amber-600" />
                        <span>Boletos de Regalo Otorgados ({bonusNumbers.length} GRATIS):</span>
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded">
                        Costo: RD$ 0
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                      {bonusNumbers.map((num) => (
                        <span
                          key={num}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400 text-slate-950 font-mono text-xs font-black shadow-2xs border border-amber-500"
                        >
                          #{num} <span className="text-[9px] bg-slate-950 text-amber-300 px-1 rounded">GRATIS 🎁</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Order Total & CTA */}
            <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-4 shadow-md">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block">Total a Transferir:</span>
                    <span className="text-2xl font-extrabold font-mono text-emerald-400">
                      RD$ {totalAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Boletos a pagar:</span>
                    <span className="text-sm font-bold text-white">
                      {selectedNumbers.length} {selectedNumbers.length === 1 ? 'Boleto' : 'Boletos'}
                    </span>
                  </div>
                </div>

                {bonusNumbers.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-amber-400 font-bold flex items-center gap-1">
                      <Gift className="w-3.5 h-3.5" />
                      <span>+{bonusNumbers.length} Boleto(s) Gratis de Regalo</span>
                    </span>
                    <span className="text-slate-300 font-bold">
                      Juegas con {selectedNumbers.length + bonusNumbers.length} boletos
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                id="btn-proceed-to-payment"
                disabled={selectedNumbers.length === 0}
                onClick={() => {
                  const cleanSelected = Array.from(new Set(selectedNumbers));
                  const cleanBonus = Array.from(new Set(bonusNumbers.filter((b) => !cleanSelected.includes(b))));
                  onProceedToPayment(cleanSelected, totalAmount, cleanBonus);
                }}
                className={`w-full py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
                  selectedNumbers.length > 0
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-emerald-500/20'
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                <span>Proceder al Pago por Transferencia</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL LIGHTBOX / GALERÍA COMPLETA (FOTOS & VIDEOS) */}
      {showLightboxModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold bg-slate-800 text-slate-200 px-3 py-1 rounded-full">
                {activeMedia.type === 'video' ? '🎥 Video Oficial' : '🖼️ Fotografía del Premio'}
              </span>
              <span className="text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md">
                {activeMedia.title || raffle.title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold hidden sm:inline">
                {activeMediaIndex + 1} de {mediaList.length}
              </span>
              <button
                type="button"
                onClick={() => setShowLightboxModal(false)}
                className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Media Stage in Modal */}
          <div className="flex-1 relative flex items-center justify-center py-4 my-auto min-h-0">
            {/* Prev Button */}
            {mediaList.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveMediaIndex((prev) => (prev > 0 ? prev - 1 : mediaList.length - 1))}
                className="absolute left-2 z-10 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 transition-transform hover:scale-105 cursor-pointer shadow-lg"
                title="Anterior"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Media Content */}
            <div className="w-full h-full max-w-5xl max-h-[70vh] flex items-center justify-center rounded-2xl overflow-hidden bg-black/50 shadow-2xl border border-slate-800">
              {activeMedia.type === 'video' ? (
                (() => {
                  const embed = getEmbedUrl(activeMedia.url);
                  if (embed.isEmbed) {
                    return (
                      <iframe
                        src={embed.embedUrl}
                        title={activeMedia.title || 'Video del Premio'}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="w-full h-full aspect-video border-0"
                      />
                    );
                  }
                  return (
                    <video
                      src={activeMedia.url}
                      controls
                      autoPlay
                      className="w-full h-full max-h-[70vh] object-contain"
                    />
                  );
                })()
              ) : (
                <img
                  src={activeMedia.url}
                  alt={activeMedia.title || raffle.title}
                  className="w-full h-full max-h-[70vh] object-contain"
                />
              )}
            </div>

            {/* Next Button */}
            {mediaList.length > 1 && (
              <button
                type="button"
                onClick={() => setActiveMediaIndex((prev) => (prev < mediaList.length - 1 ? prev + 1 : 0))}
                className="absolute right-2 z-10 w-11 h-11 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 transition-transform hover:scale-105 cursor-pointer shadow-lg"
                title="Siguiente"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip in Modal */}
          {mediaList.length > 1 && (
            <div className="flex justify-center items-center gap-2 overflow-x-auto pt-3 border-t border-slate-800 max-w-2xl mx-auto w-full">
              {mediaList.map((item, idx) => (
                <button
                  key={item.id || idx}
                  type="button"
                  onClick={() => setActiveMediaIndex(idx)}
                  className={`relative w-16 h-12 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer bg-slate-900 ${
                    activeMediaIndex === idx
                      ? 'border-emerald-400 ring-2 ring-emerald-500/50 scale-105'
                      : 'border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                >
                  {item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-purple-950 text-white">
                      <Play className="w-4 h-4 fill-purple-400 text-purple-400" />
                    </div>
                  ) : (
                    <img src={item.url} alt="Miniatura" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
