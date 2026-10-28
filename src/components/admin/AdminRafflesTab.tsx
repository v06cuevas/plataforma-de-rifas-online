import React, { useState } from 'react';
import { 
  Plus, Edit, Eye, Copy, Trash2, CheckCircle2, AlertTriangle, 
  Clock, ShieldAlert, Sparkles, Calendar, DollarSign, Image, 
  Layers, Search, Filter, Play, Pause, XCircle, Check, Info, FileText,
  EyeOff, Gift, Tag, Infinity, CalendarOff, Upload, Video, MoveUp, MoveDown,
  Film, Link, X, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft
} from 'lucide-react';
import { Raffle, RaffleStatus, Ticket, MediaItem } from '../../types';
import { supabase } from '../../lib/supabaseClient';

// Nombre del bucket público de Supabase Storage donde se guardan las fotos y
// videos de las rifas. Debe crearse una sola vez en el proyecto de Supabase
// (ver STORAGE_SETUP.sql en la raíz del repo) antes de usar esta pantalla.
const MEDIA_BUCKET = 'raffle-media';

/**
 * Redimensiona y comprime una imagen en el navegador ANTES de subirla.
 *
 * Antes, cada foto se guardaba tal cual (foto de celular sin comprimir,
 * muchas veces 3-8 MB) codificada en base64 directamente en la fila de la
 * base de datos. Eso significaba que CADA visita a la portada tenía que
 * descargar esos megabytes de texto dentro de la respuesta JSON de Supabase
 * antes de poder pintar la imagen, sin importar cuántas rifas hubiera — el
 * causante principal del LCP de 11-14s. Esta función deja el archivo en un
 * tamaño razonable para la web (máx. 1600px de lado más largo, JPEG ~82% de
 * calidad) antes de subirlo a Storage, así el visitante descarga una imagen
 * de unos pocos cientos de KB en vez de varios MB.
 */
async function compressImageForUpload(file: File, maxDimension = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file; // Si el navegador no puede decodificarla, se sube tal cual.

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const targetWidth = Math.round(bitmap.width * scale);
  const targetHeight = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
  );
  return blob || file;
}

/**
 * Sube un archivo (foto o video) al bucket público de Supabase Storage y
 * devuelve su URL pública, en vez de convertirlo a base64 y guardarlo
 * directamente en la base de datos.
 */
async function uploadMediaFile(file: File, isVideo: boolean): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_').toLowerCase();
  const path = `raffles/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

  const fileToUpload = isVideo ? file : await compressImageForUpload(file);
  const contentType = isVideo ? file.type || 'video/mp4' : 'image/jpeg';

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, fileToUpload, {
    contentType,
    cacheControl: '31536000', // 1 año: son archivos con nombre único, nunca cambian de contenido.
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

interface AdminRafflesTabProps {
  raffles?: Raffle[];
  tickets?: Ticket[];
  onCreateOrUpdateRaffle: (raffleData: Partial<Raffle> & { id?: string }) => void;
  onUpdateRaffleStatus: (raffleId: string, newStatus: RaffleStatus) => void;
}

export const AdminRafflesTab: React.FC<AdminRafflesTabProps> = ({
  raffles = [],
  tickets = [],
  onCreateOrUpdateRaffle,
  onUpdateRaffleStatus,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const safeRaffles = raffles || [];
  const safeTickets = tickets || [];

  // Modal state & Step Wizard
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRaffle, setEditingRaffle] = useState<Partial<Raffle> | null>(null);
  const [formStep, setFormStep] = useState<number>(1);

  // Tickets inspector modal
  const [inspectRaffleId, setInspectRaffleId] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formCategory, setFormCategory] = useState('Vehículos de Lujo');
  const [formPrice, setFormPrice] = useState<number | ''>('');
  const [formTotalTickets, setFormTotalTickets] = useState<number | ''>('');
  const [formDrawDate, setFormDrawDate] = useState('2025-11-30T20:00');
  const [formBannerUrl, setFormBannerUrl] = useState('https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80');
  const [formMedia, setFormMedia] = useState<MediaItem[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newMediaTitle, setNewMediaTitle] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'video'>('image');
  const [mediaUploadLoading, setMediaUploadLoading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formPrizeDetails, setFormPrizeDetails] = useState('');
  const [formRules, setFormRules] = useState('Sorteo supervisado ante Notario Público.\nParticipan exclusivamente boletos con comprobante bancario confirmado.');
  const [formLegal, setFormLegal] = useState('RNC: 1-32-48921-9. Sorteo certificado bajo leyes de la República Dominicana.');
  
  // Custom Controls: Hide Remaining Tickets, Bonus Event, Overlimit Sales, Enable/Disable Draw Date
  const [formHideRemainingTickets, setFormHideRemainingTickets] = useState(false);
  const [formHasBonusPromotion, setFormHasBonusPromotion] = useState(false);
  const [formBonusBuyThreshold, setFormBonusBuyThreshold] = useState(5);
  const [formBonusFreeTickets, setFormBonusFreeTickets] = useState(1);
  const [formBonusPromotionBadge, setFormBonusPromotionBadge] = useState('¡OFERTA 5+1! Compra 5 boletos y el sistema te regala 1 GRATIS de forma automática');
  const [formAllowSalesBeyondLimit, setFormAllowSalesBeyondLimit] = useState(true);
  const [formEnableDrawDate, setFormEnableDrawDate] = useState(true);
  const [formCustomDrawDateText, setFormCustomDrawDateText] = useState('¡Sorteo Inmediato al agotar meta de boletos!');

  const openCreateModal = () => {
    setEditingRaffle(null);
    setFormStep(1);
    setFormTitle('');
    setFormSubtitle('');
    setFormCategory('Vehículos de Lujo');
    setFormPrice('');
    setFormTotalTickets('');
    setFormDrawDate('2025-11-30T20:00');
    setFormBannerUrl('https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80');
    setFormMedia([
      {
        id: 'media-' + Date.now(),
        type: 'image',
        url: 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80',
        title: 'Imagen Principal de Portada'
      }
    ]);
    setNewMediaUrl('');
    setNewMediaTitle('');
    setFormDescription('Descripción detallada del premio y condiciones del sorteo...');
    setFormPrizeDetails('✓ Entrega inmediata con documentación legal completa.\n✓ Gastos de traspaso, impuestos o placas cubiertos por la organización.\n✓ Garantía oficial y factura original a nombre del ganador.');
    setFormRules('Sorteo transmitido en vivo ante Notario Público.\nParticipan únicamente boletos con pago verificado en cuenta bancaria.');
    setFormLegal('RNC: 1-32-48921-9. Boleto electrónico auditable.');
    setFormHideRemainingTickets(false);
    setFormHasBonusPromotion(false);
    setFormBonusBuyThreshold(5);
    setFormBonusFreeTickets(1);
    setFormBonusPromotionBadge('¡OFERTA 5+1! Compra 5 boletos y el sistema te regala 1 GRATIS de forma automática');
    setFormAllowSalesBeyondLimit(true);
    setFormEnableDrawDate(true);
    setFormCustomDrawDateText('¡Sorteo Inmediato al agotar meta de boletos!');
    setIsModalOpen(true);
  };

  const openEditModal = (raffle: Raffle) => {
    setEditingRaffle(raffle);
    setFormStep(1);
    setFormTitle(raffle.title);
    setFormSubtitle(raffle.subtitle);
    setFormCategory(raffle.category);
    setFormPrice(raffle.ticketPrice);
    setFormTotalTickets(raffle.totalTickets);
    setFormDrawDate(raffle.drawDate ? raffle.drawDate.slice(0, 16) : '2025-11-30T20:00');
    setFormBannerUrl(raffle.bannerUrl);
    setFormMedia(
      raffle.media && raffle.media.length > 0 
        ? [...raffle.media]
        : raffle.bannerUrl
        ? [{ id: 'media-b1', type: 'image', url: raffle.bannerUrl, title: 'Portada' }]
        : []
    );
    setNewMediaUrl('');
    setNewMediaTitle('');
    setFormDescription(raffle.description);
    setFormPrizeDetails(raffle.prizeDetails || '');
    setFormRules(raffle.rules.join('\n'));
    setFormLegal(raffle.legalTerms);
    setFormHideRemainingTickets(!!raffle.hideRemainingTickets);
    setFormHasBonusPromotion(!!raffle.hasBonusPromotion);
    setFormBonusBuyThreshold(raffle.bonusBuyThreshold || 5);
    setFormBonusFreeTickets(raffle.bonusFreeTickets || 1);
    setFormBonusPromotionBadge(raffle.bonusPromotionBadge || '¡OFERTA 5+1! Compra 5 boletos y el sistema te regala 1 GRATIS de forma automática');
    setFormAllowSalesBeyondLimit(raffle.allowSalesBeyondLimit !== false);
    setFormEnableDrawDate(raffle.enableDrawDate !== false);
    setFormCustomDrawDateText(raffle.customDrawDateText || '¡Sorteo Inmediato al agotar meta de boletos!');
    setIsModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
    e.target.value = '';
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const processFiles = async (fileList: File[]) => {
    setMediaUploadLoading(true);
    setMediaUploadError(null);

    // Antes esto usaba FileReader.readAsDataURL para meter el archivo
    // completo (sin comprimir) como texto base64 directo en el estado y,
    // más tarde, en la base de datos. Ahora cada archivo se sube al bucket
    // de Storage y solo guardamos su URL pública (unos 100 caracteres en
    // vez de varios MB de texto).
    const results = await Promise.allSettled(
      fileList.map(async (file) => {
        const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
        const url = await uploadMediaFile(file, isVideo);
        const item: MediaItem = {
          id: 'media-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          type: isVideo ? 'video' : 'image',
          url,
          title: file.name.replace(/\.[^/.]+$/, ''),
        };
        return item;
      })
    );

    const newItems: MediaItem[] = [];
    let failedCount = 0;
    for (const result of results) {
      if (result.status === 'fulfilled') newItems.push(result.value);
      else failedCount++;
    }

    if (newItems.length > 0) {
      setFormMedia((prev) => {
        const updated = [...prev, ...newItems];
        // If banner is not set or placeholder, use first image
        if (!formBannerUrl || formBannerUrl.includes('unsplash.com')) {
          const firstImg = updated.find((m) => m.type === 'image');
          if (firstImg) setFormBannerUrl(firstImg.url);
        }
        return updated;
      });
    }

    if (failedCount > 0) {
      setMediaUploadError(
        `No se pudo subir ${failedCount} archivo(s). Verifica que el bucket "${MEDIA_BUCKET}" exista en Supabase Storage (ver STORAGE_SETUP.sql) y vuelve a intentarlo.`
      );
    }

    setMediaUploadLoading(false);
  };

  const handleAddMediaByUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const url = newMediaUrl.trim();
    if (!url) return;

    // Detect if video by URL patterns
    const isVideoDetected = 
      newMediaType === 'video' ||
      url.includes('youtube.com') ||
      url.includes('youtu.be') ||
      url.includes('vimeo.com') ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);

    const newItem: MediaItem = {
      id: 'media-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      type: isVideoDetected ? 'video' : 'image',
      url,
      title: newMediaTitle.trim() || (isVideoDetected ? 'Video del Premio' : 'Foto del Premio'),
    };

    setFormMedia((prev) => [...prev, newItem]);
    if (!isVideoDetected && (!formBannerUrl || formBannerUrl.includes('unsplash.com'))) {
      setFormBannerUrl(url);
    }
    setNewMediaUrl('');
    setNewMediaTitle('');
  };

  const handleRemoveMedia = (id: string) => {
    setFormMedia((prev) => prev.filter((m) => m.id !== id));
  };

  const handleSetAsBanner = (url: string) => {
    setFormBannerUrl(url);
  };

  const handleMoveMedia = (index: number, direction: 'up' | 'down') => {
    setFormMedia((prev) => {
      const copy = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleDuplicate = (raffle: Raffle) => {
    onCreateOrUpdateRaffle({
      title: `${raffle.title} (Copia)`,
      subtitle: raffle.subtitle,
      category: raffle.category,
      ticketPrice: raffle.ticketPrice,
      totalTickets: raffle.totalTickets,
      drawDate: raffle.drawDate,
      status: 'draft',
      bannerUrl: raffle.bannerUrl,
      media: raffle.media,
      description: raffle.description,
      prizeDetails: raffle.prizeDetails,
      rules: raffle.rules,
      legalTerms: raffle.legalTerms,
      hideRemainingTickets: raffle.hideRemainingTickets,
      hasBonusPromotion: raffle.hasBonusPromotion,
      bonusBuyThreshold: raffle.bonusBuyThreshold,
      bonusFreeTickets: raffle.bonusFreeTickets,
      bonusPromotionBadge: raffle.bonusPromotionBadge,
      allowSalesBeyondLimit: raffle.allowSalesBeyondLimit,
      enableDrawDate: raffle.enableDrawDate,
      customDrawDateText: raffle.customDrawDateText,
    });
  };

  const handleSaveRaffle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    // Ensure there's a primary banner URL
    const effectiveBanner = formBannerUrl.trim() || formMedia.find((m) => m.type === 'image')?.url || 'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80';

    onCreateOrUpdateRaffle({
      id: editingRaffle?.id,
      title: formTitle.trim(),
      subtitle: formSubtitle.trim(),
      category: formCategory,
      ticketPrice: Number(formPrice),
      totalTickets: Number(formTotalTickets),
      drawDate: formDrawDate,
      bannerUrl: effectiveBanner,
      media: formMedia.length > 0 ? formMedia : [{ id: 'm-def', type: 'image', url: effectiveBanner, title: 'Portada' }],
      description: formDescription.trim(),
      prizeDetails: formPrizeDetails.trim(),
      rules: formRules.split('\n').filter((r) => r.trim().length > 0),
      legalTerms: formLegal.trim(),
      status: editingRaffle?.id ? editingRaffle.status : 'draft',
      hideRemainingTickets: formHideRemainingTickets,
      hasBonusPromotion: formHasBonusPromotion,
      bonusBuyThreshold: formHasBonusPromotion ? Number(formBonusBuyThreshold) : undefined,
      bonusFreeTickets: formHasBonusPromotion ? Number(formBonusFreeTickets) : undefined,
      bonusPromotionBadge: formHasBonusPromotion ? formBonusPromotionBadge.trim() : undefined,
      allowSalesBeyondLimit: formAllowSalesBeyondLimit,
      enableDrawDate: formEnableDrawDate,
      customDrawDateText: !formEnableDrawDate ? formCustomDrawDateText.trim() : undefined,
    });

    setIsModalOpen(false);
  };

  // Filter raffles
  const filteredRaffles = safeRaffles.filter((r) => {
    const matchesStatus = selectedStatus === 'all' || r.status === selectedStatus;
    const matchesSearch =
      (r.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.category || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const inspectingRaffle = safeRaffles.find((r) => r.id === inspectRaffleId);
  const inspectingTickets = safeTickets.filter((t) => t.raffleId === inspectRaffleId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Gestión y Creación de Rifas</span>
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full font-mono font-bold">
              {safeRaffles.length} en sistema
            </span>
          </h2>
          <p className="text-xs text-slate-500">
            Control de sorteos, precios, cupos autorizados y ciclo de vida (Borrador, Activa, Pausada, Sorteada).
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Rifa</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: 'Todas' },
            { id: 'active', label: 'Activas' },
            { id: 'draft', label: 'Borrador' },
            { id: 'paused', label: 'Pausadas' },
            { id: 'drawn', label: 'Sorteadas' },
            { id: 'cancelled', label: 'Canceladas' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar rifa por título..."
            className="w-full pl-9 pr-4 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Raffles Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRaffles.map((raffle) => {
          const confirmedCount = safeTickets.filter(
            (t) => t.raffleId === raffle.id && t.status === 'confirmed'
          ).length;
          const reservedCount = safeTickets.filter(
            (t) => t.raffleId === raffle.id && t.status === 'pending_payment'
          ).length;
          const soldPercentage = Math.min(100, Math.round((confirmedCount / raffle.totalTickets) * 100));

          return (
            <div
              key={raffle.id}
              className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between group hover:border-slate-300 transition-all"
            >
              <div>
                {/* Header Image with Status Pill */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                  <img
                    src={raffle.bannerUrl}
                    alt={raffle.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/30" />
                  
                  {/* Category */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-xl bg-black/60 backdrop-blur-md text-[11px] font-extrabold text-white border border-white/10">
                    {raffle.category}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-sm ${
                      raffle.status === 'active'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                        : raffle.status === 'draft'
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : raffle.status === 'paused'
                        ? 'bg-blue-500 text-white border-blue-400'
                        : raffle.status === 'drawn'
                        ? 'bg-purple-500 text-white border-purple-400'
                        : 'bg-rose-500 text-white border-rose-400'
                    }`}
                  >
                    {raffle.status}
                  </span>

                  {/* Price & Quota in Banner Footer */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="text-sm font-black font-mono">
                      RD$ {raffle.ticketPrice.toLocaleString()} / boleto
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Total: {raffle.totalTickets}
                    </span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 line-clamp-2 leading-tight">
                      {raffle.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {raffle.subtitle}
                    </p>
                  </div>

                  {/* Quota Progress Bar */}
                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-700">Progreso de Venta</span>
                      <span className="font-mono font-extrabold text-slate-900">{soldPercentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        style={{ width: `${soldPercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Confirmados: <strong className="text-emerald-700">{confirmedCount}</strong></span>
                      <span>Apartados: <strong className="text-amber-700">{reservedCount}</strong></span>
                      <span>Libres: <strong className="text-slate-700">{raffle.totalTickets - confirmedCount - reservedCount}</strong></span>
                    </div>
                  </div>

                  {/* Draw Date & Features Badges */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      {raffle.enableDrawDate !== false && raffle.drawDate ? (
                        <>
                          <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Sorteo: <strong>{new Date(raffle.drawDate).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })}</strong></span>
                        </>
                      ) : (
                        <>
                          <CalendarOff className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="text-slate-500 font-medium">Sin fecha programada</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {raffle.hideRemainingTickets && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                          <EyeOff className="w-3 h-3 text-slate-500" />
                          <span>Restantes Ocultos</span>
                        </span>
                      )}
                      {raffle.hasBonusPromotion && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-black">
                          <Gift className="w-3 h-3 text-amber-600" />
                          <span>Promo {raffle.bonusBuyThreshold}+{raffle.bonusFreeTickets} Gratis</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                {/* Status Switchers */}
                <div className="flex items-center gap-1">
                  {raffle.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => onUpdateRaffleStatus(raffle.id, 'active')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Publicar y Activar Rifa"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Activar</span>
                    </button>
                  )}

                  {raffle.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onUpdateRaffleStatus(raffle.id, 'paused')}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Pausar Venta Temporalmente"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pausar</span>
                    </button>
                  )}

                  {raffle.status === 'paused' && (
                    <button
                      type="button"
                      onClick={() => onUpdateRaffleStatus(raffle.id, 'active')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Reanudar</span>
                    </button>
                  )}

                  {/* Inspect Boletos */}
                  <button
                    type="button"
                    onClick={() => setInspectRaffleId(raffle.id)}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Ver Boletos Vendidos"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {/* Duplicate */}
                  <button
                    type="button"
                    onClick={() => handleDuplicate(raffle)}
                    className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer"
                    title="Duplicar Rifa como Borrador"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Edit Button */}
                <button
                  type="button"
                  onClick={() => openEditModal(raffle)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                >
                  <Edit className="w-3 h-3" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT RAFFLE MODAL (POR ETAPAS / STEPS) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 bg-white shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-black">
                    {formStep}/4
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                      {editingRaffle?.id ? 'Editar Rifa' : 'Crear Nueva Rifa'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {formStep === 1 && 'Etapa 1: Información básica, categoría y precio de boletos'}
                      {formStep === 2 && 'Etapa 2: Galería multimedia, fotos y videos del premio'}
                      {formStep === 3 && 'Etapa 3: Fecha del sorteo, venta continua y visibilidad'}
                      {formStep === 4 && 'Etapa 4: Promociones automáticas, descripción y legal'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  title="Cerrar ventana"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step Progress Bar & Tab Navigation */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                {/* Progress bar line */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(formStep / 4) * 100}%` }}
                  />
                </div>

                {/* Step navigation tabs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFormStep(1)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-left ${
                      formStep === 1
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                      formStep === 1 ? 'bg-white text-emerald-800' : 'bg-slate-300 text-slate-700'
                    }`}>
                      1
                    </span>
                    <span className="truncate">1. Datos & Precio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formTitle.trim()) {
                        setFormStep(1);
                        return;
                      }
                      setFormStep(2);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-left ${
                      formStep === 2
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                      formStep === 2 ? 'bg-white text-emerald-800' : 'bg-slate-300 text-slate-700'
                    }`}>
                      2
                    </span>
                    <span className="truncate">2. Galería & Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formTitle.trim()) {
                        setFormStep(1);
                        return;
                      }
                      setFormStep(3);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-left ${
                      formStep === 3
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                      formStep === 3 ? 'bg-white text-emerald-800' : 'bg-slate-300 text-slate-700'
                    }`}>
                      3
                    </span>
                    <span className="truncate">3. Modalidad</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!formTitle.trim()) {
                        setFormStep(1);
                        return;
                      }
                      setFormStep(4);
                    }}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-left ${
                      formStep === 4
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-black ${
                      formStep === 4 ? 'bg-white text-emerald-800' : 'bg-slate-300 text-slate-700'
                    }`}>
                      4
                    </span>
                    <span className="truncate">4. Ofertas & Legal</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Scrollable Form Content by Steps */}
            <form onSubmit={handleSaveRaffle} id="raffle-wizard-form" className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-4">
              {/* ================= STEP 1: INFORMACIÓN BÁSICA & PRECIO ================= */}
              {formStep === 1 && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-900">
                    <Tag className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ingresa el título oficial de la rifa, su categoría y los valores del boleto.</span>
                  </div>

                  {/* Title & Subtitle */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Título de la Rifa *</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ej: Toyota Hilux GR-Sport 2025 0KM + RD$500,000"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Subtítulo Descriptivo</label>
                    <textarea
                      rows={3}
                      value={formSubtitle}
                      onChange={(e) => setFormSubtitle(e.target.value)}
                      placeholder="Ej: Camioneta nueva con placa, marbete y seguro full por 1 año"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-y min-h-[88px]"
                    />
                  </div>

                  {/* Category, Price, Quota */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Categoría</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                      >
                        <option value="Vehículos de Lujo">Vehículos de Lujo</option>
                        <option value="Tecnología">Tecnología</option>
                        <option value="Inmuebles">Inmuebles / Villas</option>
                        <option value="Efectivo & Bonos">Efectivo & Bonos</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Precio Boleto (RD$) *</label>
                      <input
                        type="number"
                        required
                        min={50}
                        step={50}
                        value={formPrice}
                        onChange={(e) => setFormPrice(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Cupo Meta de Boletos *</label>
                      <input
                        type="number"
                        required
                        min={10}
                        max={1000000}
                        value={formTotalTickets}
                        onChange={(e) => setFormTotalTickets(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[500, 1000, 5000, 10000, 50000, 100000, 200000].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFormTotalTickets(preset)}
                            className="px-1.5 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-mono font-semibold cursor-pointer"
                          >
                            {preset.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-center justify-between">
                    <span>Recaudación proyectada al 100%:</span>
                    <span className="font-mono font-extrabold text-emerald-700 text-xs">
                      RD$ {((Number(formPrice) || 0) * (Number(formTotalTickets) || 0)).toLocaleString('es-DO')}
                    </span>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: GALERÍA MULTIMEDIA (FOTOS & VIDEOS) ================= */}
              {formStep === 2 && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">URL Imagen de Portada Principal *</label>
                    <input
                      type="url"
                      required
                      value={formBannerUrl}
                      onChange={(e) => setFormBannerUrl(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      placeholder="https://images.unsplash.com/..."
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Foto principal destacada en la tarjeta del catálogo de inicio.
                    </span>
                  </div>

                  {/* SECCIÓN MULTI-MEDIOS */}
                  <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
                          <Film className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-extrabold text-slate-900">
                            Galería Multimedia (Fotos y Videos)
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Sube fotos del premio y videos de demostración (archivos locales o enlaces).
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                          {formMedia.filter(m => m.type === 'image').length} Fotos
                        </span>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200 flex items-center gap-1">
                          <Video className="w-3 h-3 text-purple-600" />
                          <span>{formMedia.filter(m => m.type === 'video').length} Videos</span>
                        </span>
                      </div>
                    </div>

                    {/* Zona de Arrastrar y Soltar o Subir Múltiples Archivos */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      className="border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all rounded-2xl p-4 text-center space-y-2 bg-white cursor-pointer relative"
                    >
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <div className="flex justify-center items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                          <Upload className="w-3.5 h-3.5" />
                        </div>
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          Haz clic para seleccionar o arrastra fotos o videos aquí
                        </span>
                        <span className="text-[10px] text-slate-500">
                          JPG, PNG, WEBP, MP4, WEBM, MOV (puedes elegir varios archivos a la vez)
                        </span>
                      </div>
                      {mediaUploadLoading && (
                        <div className="pt-2 text-xs font-bold text-emerald-600 flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                          <span>Procesando archivos multimedia...</span>
                        </div>
                      )}
                    </div>

                    {/* Agregar también por Enlace / URL */}
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-blue-600" />
                        <span>O agregar imagen / video por enlace externo (YouTube, Vimeo, MP4)</span>
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-3">
                          <select
                            value={newMediaType}
                            onChange={(e) => setNewMediaType(e.target.value as 'image' | 'video')}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-slate-50"
                          >
                            <option value="image">🖼️ Imagen / Foto</option>
                            <option value="video">🎥 Video (YouTube/MP4)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-5">
                          <input
                            type="url"
                            value={newMediaUrl}
                            onChange={(e) => setNewMediaUrl(e.target.value)}
                            placeholder="https://... (URL de imagen o video)"
                            className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <input
                            type="text"
                            value={newMediaTitle}
                            onChange={(e) => setNewMediaTitle(e.target.value)}
                            placeholder="Título"
                            className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={handleAddMediaByUrl}
                            disabled={!newMediaUrl.trim()}
                            className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                              newMediaUrl.trim()
                                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Medios Cargados */}
                    {formMedia.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-slate-600 block">
                          Elementos en galería ({formMedia.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                          {formMedia.map((m, idx) => {
                            const isPrimary = formBannerUrl === m.url;
                            return (
                              <div
                                key={m.id}
                                className={`rounded-2xl border p-2 bg-white flex items-center gap-2 transition-all shadow-2xs ${
                                  isPrimary ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200'
                                }`}
                              >
                                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-200">
                                  {m.type === 'video' ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-purple-950 text-white">
                                      <Play className="w-4 h-4 fill-purple-400 text-purple-400" />
                                    </div>
                                  ) : (
                                    <img
                                      src={m.url}
                                      alt={m.title || 'Foto'}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                  <span className={`absolute top-0.5 left-0.5 px-1 rounded text-[7px] font-black uppercase ${
                                    m.type === 'video' ? 'bg-purple-600 text-white' : 'bg-slate-900/80 text-white'
                                  }`}>
                                    {m.type === 'video' ? 'Video' : 'Foto'}
                                  </span>
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <p className="text-xs font-bold text-slate-800 truncate" title={m.title || m.url}>
                                    {m.title || (m.type === 'video' ? 'Video del Premio' : `Foto #${idx + 1}`)}
                                  </p>
                                  
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {m.type === 'image' && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetAsBanner(m.url)}
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                          isPrimary
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-800'
                                        }`}
                                      >
                                        {isPrimary ? '⭐ Portada' : 'Hacer Portada'}
                                      </button>
                                    )}

                                    <div className="flex items-center gap-1 ml-auto">
                                      <button
                                        type="button"
                                        disabled={idx === 0}
                                        onClick={() => handleMoveMedia(idx, 'up')}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                        title="Mover arriba"
                                      >
                                        <MoveUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={idx === formMedia.length - 1}
                                        onClick={() => handleMoveMedia(idx, 'down')}
                                        className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                        title="Mover abajo"
                                      >
                                        <MoveDown className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveMedia(m.id)}
                                        className="p-1 rounded text-red-400 hover:text-red-600 cursor-pointer"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ================= STEP 3: MODALIDAD, FECHA & VENTA CONTINUA ================= */}
              {formStep === 3 && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* Draw Date Config */}
                  <div className="space-y-3 p-4 rounded-3xl bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        <span>Fecha y Hora del Sorteo</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={formEnableDrawDate}
                          onChange={(e) => setFormEnableDrawDate(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>{formEnableDrawDate ? 'Fecha Fija' : 'Fecha Flexible / Por Definir'}</span>
                      </label>
                    </div>

                    {formEnableDrawDate ? (
                      <div>
                        <input
                          type="datetime-local"
                          required={formEnableDrawDate}
                          value={formDrawDate}
                          onChange={(e) => setFormDrawDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Se mostrará el reloj de cuenta regresiva oficial y la fecha exacta en la ficha del sorteo.
                        </span>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={formCustomDrawDateText}
                          onChange={(e) => setFormCustomDrawDateText(e.target.value)}
                          placeholder="Ej: ¡Sorteo Inmediato al agotar meta de boletos!"
                          className="w-full px-3 py-2.5 rounded-xl border border-amber-300 text-xs text-slate-900 bg-amber-50/50 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-amber-800 mt-1 block font-medium">
                          Fecha flexible: se anunciará la fecha exacta al completar el cupo o por transmisión especial.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* VENTA CONTINUA */}
                  <div className="p-4 rounded-3xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-emerald-600 text-white mt-0.5 shadow-xs">
                          <Infinity className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-emerald-950 block">
                            Venta Continua (Permitir Vender más del 100% de la Meta)
                          </span>
                          <p className="text-[11px] text-emerald-900 leading-snug">
                            Permite a los usuarios seguir comprando boletos aun después de superar los {formTotalTickets} boletos previstos sin bloquear la rifa como agotada.
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={formAllowSalesBeyondLimit}
                          onChange={(e) => setFormAllowSalesBeyondLimit(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>

                  {/* OCULTAR BOLETOS RESTANTES */}
                  <div className="p-4 rounded-3xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-200 text-slate-700 mt-0.5">
                          <EyeOff className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-slate-900 block">
                            Ocultar Cifra Exacta de Boletos Restantes
                          </span>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            Oculta el texto exacto de &ldquo;Quedan X disponibles&rdquo;, pero mantiene visible los boletos vendidos y el avance.
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={formHideRemainingTickets}
                          onChange={(e) => setFormHideRemainingTickets(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 4: OFERTAS, DESCRIPCIÓN & LEGAL ================= */}
              {formStep === 4 && (
                <div className="space-y-4 animate-in fade-in-50 duration-200">
                  {/* EVENTO PROMOCIÓN AUTOMÁTICA */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/80 border border-amber-200 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="p-2 rounded-xl bg-amber-500 text-slate-950 mt-0.5 shadow-xs">
                          <Gift className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-extrabold text-amber-950 block">
                            Promoción Automática de Boletos Gratis (Ej: 5+1 Gratis)
                          </span>
                          <p className="text-[11px] text-amber-800 leading-snug">
                            El sistema otorga boletos de regalo automáticamente al alcanzar la cantidad establecida sin requerir cupones manuales.
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={formHasBonusPromotion}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormHasBonusPromotion(checked);
                            if (checked && !formBonusPromotionBadge.trim()) {
                              setFormBonusPromotionBadge(`¡OFERTA ${formBonusBuyThreshold}+${formBonusFreeTickets}! Compra ${formBonusBuyThreshold} boletos y recibe ${formBonusFreeTickets} GRATIS`);
                            }
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-amber-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-amber-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                      </label>
                    </div>

                    {formHasBonusPromotion && (
                      <div className="space-y-4 pt-3 border-t border-amber-200/80 animate-in fade-in duration-200">
                        {/* Plantillas Rápidas / Presets */}
                        <div>
                          <label className="block text-[11px] font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Plantillas Rápidas (Configuración en 1 Clic):</span>
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                            {[
                              { buy: 3, free: 1, label: '3 + 1 Gratis' },
                              { buy: 5, free: 1, label: '5 + 1 Gratis' },
                              { buy: 10, free: 2, label: '10 + 2 Gratis' },
                              { buy: 10, free: 3, label: '10 + 3 Gratis' },
                              { buy: 20, free: 5, label: '20 + 5 Gratis' },
                            ].map((preset, idx) => {
                              const isSelected = formBonusBuyThreshold === preset.buy && formBonusFreeTickets === preset.free;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    setFormBonusBuyThreshold(preset.buy);
                                    setFormBonusFreeTickets(preset.free);
                                    setFormBonusPromotionBadge(
                                      `¡OFERTA ${preset.buy}+${preset.free}! Compra ${preset.buy} boletos y recibe ${preset.free} GRATIS de forma automática`
                                    );
                                  }}
                                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center border ${
                                    isSelected
                                      ? 'bg-amber-600 text-white border-amber-700 shadow-xs'
                                      : 'bg-white text-amber-950 border-amber-200 hover:bg-amber-100/60'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Configuración Numérica Personalizada: Umbral de compra vs Boletos Regalados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-amber-200">
                          {/* Umbral de compra */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-extrabold text-slate-800">
                              1. Cantidad de boletos que el cliente debe comprar:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const newBuy = Math.max(1, formBonusBuyThreshold - 1);
                                  setFormBonusBuyThreshold(newBuy);
                                  setFormBonusPromotionBadge(`¡OFERTA ${newBuy}+${formBonusFreeTickets}! Compra ${newBuy} boletos y recibe ${formBonusFreeTickets} GRATIS`);
                                }}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={500}
                                value={formBonusBuyThreshold}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1);
                                  setFormBonusBuyThreshold(val);
                                  setFormBonusPromotionBadge(`¡OFERTA ${val}+${formBonusFreeTickets}! Compra ${val} boletos y recibe ${formBonusFreeTickets} GRATIS`);
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-center font-mono text-sm font-black text-slate-900 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newBuy = formBonusBuyThreshold + 1;
                                  setFormBonusBuyThreshold(newBuy);
                                  setFormBonusPromotionBadge(`¡OFERTA ${newBuy}+${formBonusFreeTickets}! Compra ${newBuy} boletos y recibe ${formBonusFreeTickets} GRATIS`);
                                }}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              Cada {formBonusBuyThreshold} boletos que agregue al carrito activarán el beneficio.
                            </span>
                          </div>

                          {/* Boletos Gratis Otorgados */}
                          <div className="space-y-1.5">
                            <label className="block text-xs font-extrabold text-slate-800">
                              2. Cantidad de boletos GRATIS que el sistema regala:
                            </label>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const newFree = Math.max(1, formBonusFreeTickets - 1);
                                  setFormBonusFreeTickets(newFree);
                                  setFormBonusPromotionBadge(`¡OFERTA ${formBonusBuyThreshold}+${newFree}! Compra ${formBonusBuyThreshold} boletos y recibe ${newFree} GRATIS`);
                                }}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={100}
                                value={formBonusFreeTickets}
                                onChange={(e) => {
                                  const val = Math.max(1, Number(e.target.value) || 1);
                                  setFormBonusFreeTickets(val);
                                  setFormBonusPromotionBadge(`¡OFERTA ${formBonusBuyThreshold}+${val}! Compra ${formBonusBuyThreshold} boletos y recibe ${val} GRATIS`);
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-center font-mono text-sm font-black text-amber-700 bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const newFree = formBonusFreeTickets + 1;
                                  setFormBonusFreeTickets(newFree);
                                  setFormBonusPromotionBadge(`¡OFERTA ${formBonusBuyThreshold}+${newFree}! Compra ${formBonusBuyThreshold} boletos y recibe ${newFree} GRATIS`);
                                }}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              Recibirá +{formBonusFreeTickets} boleto(s) de regalo 100% gratis con números asignados.
                            </span>
                          </div>
                        </div>

                        {/* Texto Promocional / Badge Personalizable */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-bold text-amber-950">
                              Texto Promocional Visible para los Clientes:
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setFormBonusPromotionBadge(`¡OFERTA ${formBonusBuyThreshold}+${formBonusFreeTickets}! Compra ${formBonusBuyThreshold} boletos y recibe ${formBonusFreeTickets} GRATIS de forma automática`);
                              }}
                              className="text-[10px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
                            >
                              Restablecer texto sugerido
                            </button>
                          </div>
                          <input
                            type="text"
                            value={formBonusPromotionBadge}
                            onChange={(e) => setFormBonusPromotionBadge(e.target.value)}
                            placeholder="Ej: ¡OFERTA 5+1! Compra 5 boletos y recibe 1 GRATIS"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-300 bg-white text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                          />
                        </div>

                        {/* Simulador y Ejemplo en Vivo */}
                        <div className="bg-amber-100/70 border border-amber-300/80 rounded-2xl p-3.5 space-y-1.5 text-xs text-amber-950">
                          <span className="font-extrabold flex items-center gap-1.5 text-amber-900">
                            <Info className="w-3.5 h-3.5 text-amber-700" />
                            <span>Simulación de compra con esta regla ({formBonusBuyThreshold} + {formBonusFreeTickets} Gratis):</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                            <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
                              <span className="text-slate-600 block">Compra {formBonusBuyThreshold} boletos:</span>
                              <strong className="text-emerald-700">Recibe {formBonusBuyThreshold} + {formBonusFreeTickets} = {formBonusBuyThreshold + formBonusFreeTickets} boletos</strong>
                            </div>
                            <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
                              <span className="text-slate-600 block">Compra {formBonusBuyThreshold * 2} boletos:</span>
                              <strong className="text-emerald-700">Recibe {formBonusBuyThreshold * 2} + {formBonusFreeTickets * 2} = {(formBonusBuyThreshold * 2) + (formBonusFreeTickets * 2)} boletos</strong>
                            </div>
                            <div className="bg-white/80 p-2 rounded-xl border border-amber-200">
                              <span className="text-slate-600 block">Compra {formBonusBuyThreshold * 3} boletos:</span>
                              <strong className="text-emerald-700">Recibe {formBonusBuyThreshold * 3} + {formBonusFreeTickets * 3} = {(formBonusBuyThreshold * 3) + (formBonusFreeTickets * 3)} boletos</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Descripción del Premio</label>
                    <textarea
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Detalles sobre equipamiento, garantía, entrega..."
                      className="w-full px-4 py-2 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  {/* Prize Details */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Detalles del Premio (Beneficios - 1 por línea)</label>
                    <textarea
                      rows={3}
                      value={formPrizeDetails}
                      onChange={(e) => setFormPrizeDetails(e.target.value)}
                      placeholder="✓ Entrega inmediata en Santo Domingo&#10;✓ Gastos de traspaso cubiertos&#10;✓ Garantía oficial y factura original"
                      className="w-full px-4 py-2 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Cada línea aparecerá con un ✓ verde en la página de detalle de la rifa.
                    </span>
                  </div>

                  {/* Rules & Legal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Reglas (1 por línea)</label>
                      <textarea
                        rows={2}
                        value={formRules}
                        onChange={(e) => setFormRules(e.target.value)}
                        className="w-full px-3 py-2 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Términos Legales & RNC</label>
                      <textarea
                        rows={2}
                        value={formLegal}
                        onChange={(e) => setFormLegal(e.target.value)}
                        className="w-full px-3 py-2 rounded-2xl border border-slate-300 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* Modal Fixed Footer with Step Navigation */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                {formStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setFormStep((prev) => Math.max(1, prev - 1))}
                    className="px-4 py-2.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Anterior</span>
                  </button>
                )}

                {formStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (formStep === 1 && !formTitle.trim()) {
                        alert('Por favor ingresa el título de la rifa antes de continuar.');
                        return;
                      }
                      setFormStep((prev) => Math.min(4, prev + 1));
                    }}
                    className="px-5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  >
                    <span>Siguiente</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="raffle-wizard-form"
                    className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingRaffle?.id ? 'Guardar Cambios' : 'Crear Rifa Oficial'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INSPECT TICKETS MODAL */}
      {inspectRaffleId && inspectingRaffle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  Boletos de la Rifa: {inspectingRaffle.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {inspectingTickets.filter((t) => t.status === 'confirmed').length} confirmados • {inspectingTickets.filter((t) => t.status === 'pending_payment').length} reservados
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectRaffleId(null)}
                className="p-1.5 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Tickets Table */}
            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {inspectingTickets.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Aún no se han registrado compras o apartados para esta rifa.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                    <tr>
                      <th className="p-2.5">Boleto #</th>
                      <th className="p-2.5">Comprador</th>
                      <th className="p-2.5">Teléfono</th>
                      <th className="p-2.5">Banco / Ref</th>
                      <th className="p-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspectingTickets.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono font-bold text-slate-900">#{t.ticketNumber}</td>
                        <td className="p-2.5 font-medium text-slate-800">{t.userName}</td>
                        <td className="p-2.5 text-slate-500 font-mono">{t.userPhone}</td>
                        <td className="p-2.5 text-slate-600">
                          {t.bankUsed} • <span className="font-mono font-bold">{t.referenceNumber}</span>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.status === 'confirmed'
                                ? 'bg-emerald-100 text-emerald-800'
                                : t.status === 'pending_payment'
                                ? 'bg-amber-100 text-amber-800'
                                : t.status === 'winner'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
