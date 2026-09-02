import { supabase } from './supabaseClient';
import {
  BankAccount,
  Raffle,
  MediaItem,
  Ticket,
  PaymentReport,
  DrawResult,
  SupportConversation,
  SupportChatMessage,
  ManagedUser,
  AdminAuditLog,
  UserProfile,
  RaffleStatus,
} from '../types';

// =========================================================================
// Este archivo reemplaza src/data/mockData.ts. Cada función habla con las
// tablas reales creadas por supabase_schema.sql. Los nombres de columnas en
// la base de datos van en snake_case; aquí se convierten a los tipos
// camelCase que ya usan los componentes (types.ts) para no tener que tocar
// el resto de la interfaz.
// =========================================================================

// ---------------------------------------------------------------------
// Helpers de conversión (fila de Supabase -> tipo de la app)
// ---------------------------------------------------------------------

function mapBankAccount(row: any): BankAccount {
  return {
    id: row.id,
    bankName: row.bank_name,
    bankCode: row.bank_code || undefined,
    accountNumber: row.account_number,
    accountType: row.account_type || undefined,
    beneficiaryName: row.beneficiary_name || undefined,
    rncOrId: row.rnc_or_id || undefined,
    logoColor: row.logo_color || undefined,
    bgLight: row.bg_light || undefined,
    badgeBorder: row.badge_border || undefined,
    shortInstructions: row.short_instructions || undefined,
    isActive: row.is_active,
  };
}

function mapMedia(row: any): MediaItem {
  return { id: row.id, type: row.type, url: row.url, title: row.title || undefined };
}

function mapRaffle(row: any): Raffle {
  const stats = row.raffle_stats && Array.isArray(row.raffle_stats) ? row.raffle_stats[0] : row.raffle_stats;
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle || '',
    category: row.category || '',
    ticketPrice: Number(row.ticket_price),
    totalTickets: row.total_tickets,
    soldTicketsCount: stats?.sold_tickets_count ?? 0,
    reservedTicketsCount: stats?.reserved_tickets_count ?? 0,
    drawDate: row.draw_date || '',
    status: row.status as RaffleStatus,
    bannerUrl: row.banner_url || '',
    media: (row.raffle_media || []).map(mapMedia),
    description: row.description || '',
    rules: row.rules || [],
    legalTerms: row.legal_terms || '',
    createdAt: row.created_at,
    drawnAt: row.drawn_at || undefined,
    winningTicketNumber: row.winning_ticket_number || undefined,
    winnerName: row.winner_name || undefined,
    hideRemainingTickets: row.hide_remaining_tickets,
    hasBonusPromotion: row.has_bonus_promotion,
    bonusBuyThreshold: row.bonus_buy_threshold || undefined,
    bonusFreeTickets: row.bonus_free_tickets || undefined,
    bonusPromotionBadge: row.bonus_promotion_badge || undefined,
    allowSalesBeyondLimit: row.allow_sales_beyond_limit,
    enableDrawDate: row.enable_draw_date,
    customDrawDateText: row.custom_draw_date_text || undefined,
    prizeDetails: row.prize_details || undefined,
  };
}

function mapTicket(row: any): Ticket {
  const raffle = row.raffles;
  const buyer = row.users;
  return {
    id: row.id,
    raffleId: row.raffle_id,
    raffleTitle: raffle?.title || '',
    raffleCover: raffle?.banner_url || '',
    userId: row.user_id,
    userName: buyer?.full_name || '',
    userPhone: buyer?.phone || '',
    userEmail: buyer?.email || '',
    userCedula: buyer?.cedula_or_id || undefined,
    ticketNumber: row.ticket_number,
    paymentReportId: row.payment_report_id || '',
    status: row.status,
    pricePaid: Number(row.price_paid),
    bankUsed: row.bank_used || '',
    referenceNumber: row.reference_number || '',
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at || undefined,
    drawDate: raffle?.draw_date || '',
    isBonusTicket: row.is_bonus_ticket,
  };
}

function mapPaymentReport(row: any): PaymentReport {
  return {
    id: row.id,
    raffleId: row.raffle_id,
    raffleTitle: row.raffles?.title || '',
    userId: row.user_id,
    senderName: row.sender_name,
    senderPhone: row.sender_phone,
    senderEmail: row.sender_email || '',
    senderCedula: row.sender_cedula || undefined,
    destinationBank: row.destination_bank,
    referenceNumber: row.reference_number,
    amount: Number(row.amount),
    ticketNumbers: (row.tickets || []).map((t: any) => t.ticket_number),
    receiptUrl: row.receipt_url || '',
    status: row.status,
    adminNotes: row.admin_notes || undefined,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at || undefined,
  };
}

function mapDrawResult(row: any): DrawResult {
  return {
    id: row.id,
    raffleId: row.raffle_id,
    raffleTitle: row.raffles?.title || '',
    prizeImage: row.raffles?.banner_url || '',
    winningTicketNumber: row.winning_ticket_number,
    winnerUserId: row.winner_user_id || '',
    winnerName: row.winner_name || '',
    winnerCity: row.winner_city || '',
    drawnAt: row.drawn_at,
    publicSeed: row.public_seed,
    drawHash: row.draw_hash,
    totalEligibleTickets: row.total_eligible_tickets,
    lotteryReference: row.lottery_reference || '',
    notaryCertificateUrl: row.notary_certificate_url || undefined,
    prizeDelivered: row.prize_delivered,
    deliveryPhotoUrl: row.delivery_photo_url || undefined,
    testimonial: row.testimonial || undefined,
  };
}

function mapSupportMessage(row: any): SupportChatMessage {
  return {
    id: row.id,
    sender: row.sender,
    senderName: row.sender_name,
    text: row.message,
    createdAt: row.created_at,
  };
}

function mapSupportConversation(row: any): SupportConversation {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.users?.full_name || '',
    userPhone: row.users?.phone || '',
    subject: row.subject,
    relatedTicketId: row.related_ticket_id || undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: (row.support_messages || []).map(mapSupportMessage),
  };
}

function mapManagedUser(row: any): ManagedUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    cedulaOrId: row.cedula_or_id || undefined,
    status: row.status,
    role: row.role,
    totalTicketsBought: row.total_tickets_bought ?? 0,
    totalSpent: row.total_spent ?? 0,
    joinedDate: row.joined_date,
    lastActive: row.last_active,
    notes: row.notes || undefined,
    city: row.city || undefined,
  };
}

function mapAuditLog(row: any): AdminAuditLog {
  return {
    id: row.id,
    adminName: row.admin_name || 'Sistema',
    action: row.action,
    category: row.category,
    details: row.details || '',
    timestamp: row.created_at,
    ipAddress: row.ip_address || undefined,
  };
}

// ---------------------------------------------------------------------
// AUTENTICACIÓN
// ---------------------------------------------------------------------

export async function registerClient(params: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  cedulaOrId?: string;
}): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: { data: { full_name: params.fullName, phone: params.phone } },
  });
  if (error) throw error;
  if (!data.user) throw new Error('No se pudo crear la cuenta.');

  if (params.cedulaOrId) {
    await supabase.from('users').update({ cedula_or_id: params.cedulaOrId }).eq('id', data.user.id);
  }

  return {
    id: data.user.id,
    fullName: params.fullName,
    email: params.email,
    phone: params.phone,
    cedulaOrId: params.cedulaOrId,
    isLoggedIn: true,
    role: 'client',
  };
}

export async function loginClient(email: string, password: string): Promise<UserProfile> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const profile = await fetchMyProfile();
  if (!profile) throw new Error('No se encontró tu perfil.');
  return profile;
}

export async function fetchMyProfile(): Promise<UserProfile | null> {
  // getSession() lee la sesión desde localStorage (instantáneo, sin red).
  // getUser() en cambio SIEMPRE hace una llamada de red al servidor de Auth
  // de Supabase para revalidar el token, incluso cuando el visitante no ha
  // iniciado sesión. Como esta función se ejecuta en TODA carga de la página
  // (visitante anónimo incluido), ese round-trip extra era puro tiempo
  // perdido bloqueando el primer pintado (afecta LCP). Si no hay sesión
  // local, salimos de inmediato sin tocar la red.
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user;
  if (!sessionUser) return null;

  const { data, error } = await supabase.from('users').select('*').eq('id', sessionUser.id).single();
  if (error || !data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    email: data.email,
    phone: data.phone,
    cedulaOrId: data.cedula_or_id || undefined,
    isLoggedIn: true,
    role: data.role === 'admin' ? 'admin' : 'client',
  };
}

/**
 * Login del panel administrador. Verifica contraseña Y que el rol en la
 * base de datos sea 'admin'. Si la cuenta tiene un factor TOTP (2FA)
 * inscrito en Supabase, exige y valida el código; si no tiene ninguno
 * inscrito, deja pasar sin pedirlo (no hay nada que verificar todavía).
 */
export async function loginAdmin(
  email: string,
  password: string,
  totpCode?: string
): Promise<{ name: string; role: string; email: string }> {
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const profile = await fetchMyProfile();
  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Esta cuenta no tiene permisos de administrador.');
  }

  const { data: factorsData } = await supabase.auth.mfa.listFactors();
  const totpFactor = factorsData?.totp?.[0];

  if (totpFactor) {
    if (!totpCode || totpCode.length !== 6) {
      await supabase.auth.signOut();
      throw new Error('Esta cuenta tiene 2FA activado: ingresa el código de 6 dígitos.');
    }
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
    if (challengeError) throw challengeError;
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: totpFactor.id,
      challengeId: challenge.id,
      code: totpCode,
    });
    if (verifyError) {
      await supabase.auth.signOut();
      throw new Error('Código 2FA incorrecto.');
    }
  }

  return { name: profile.fullName, role: 'admin', email: profile.email };
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function startAdminEmailLogin(email: string, password: string) {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const profile = await fetchMyProfile();
  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('Esta cuenta no tiene permisos de administrador.');
  }

  return { name: profile.fullName, role: 'admin', email: profile.email };
}

export async function verifyAdminEmailCode(code: string) {
  const { data, error } = await supabase.functions.invoke('admin-email-2fa', {
    body: { action: 'verify', code },
  });
  if (error || !data?.verified) {
    await supabase.auth.signOut();
    throw new Error(error?.message || data?.error || 'Código de confirmación incorrecto.');
  }
}

// ---------------------------------------------------------------------
// LECTURA (sitio cliente)
// ---------------------------------------------------------------------

async function fetchRaffles(statuses?: RaffleStatus[]): Promise<Raffle[]> {
  let query = supabase
    .from('raffles')
    .select('*')
    .order('created_at', { ascending: false });
  if (statuses) query = query.in('status', statuses);

  const [{ data: raffleData, error: raffleError }, { data: statsData, error: statsError }] = await Promise.all([
    query,
    supabase.from('raffle_stats').select('*'),
  ]);
  if (raffleError) throw raffleError;
  if (statsError) throw statsError;

  const statsByRaffleId = new Map((statsData || []).map((stats: any) => [stats.raffle_id, stats]));
  return (raffleData || []).map((raffle: any) => ({
    ...raffle,
    raffle_stats: statsByRaffleId.get(raffle.id),
    media: [], // Los medios se cargarán cuando sea necesario
  })).map(mapRaffle);
}

export async function fetchRaffleMedia(raffleId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('raffle_media')
    .select('*')
    .eq('raffle_id', raffleId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data || []).map(mapMedia);
}

export async function fetchActiveRaffles(): Promise<Raffle[]> {
  return fetchRaffles(['active', 'closed', 'drawn']);
}

export async function fetchAllRafflesForAdmin(): Promise<Raffle[]> {
  const raffles = await fetchRaffles();
  
  // Cargar medios para cada rifa en paralelo
  const rafflesWithMedia = await Promise.all(
    raffles.map(async (raffle) => {
      try {
        const media = await fetchRaffleMedia(raffle.id);
        return { ...raffle, media };
      } catch (err) {
        console.error(`Error loading media for raffle ${raffle.id}:`, err);
        return raffle;
      }
    })
  );
  
  return rafflesWithMedia;
}

export async function fetchBankAccounts(onlyActive = true): Promise<BankAccount[]> {
  let query = supabase.from('bank_accounts').select('*').order('created_at', { ascending: true });
  if (onlyActive) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapBankAccount);
}

export async function fetchDrawResults(): Promise<DrawResult[]> {
  const { data, error } = await supabase
    .from('draw_results')
    .select('*, raffles(title, banner_url)')
    .order('drawn_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDrawResult);
}

export async function fetchMyTickets(): Promise<Ticket[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];
  const { data, error } = await supabase
    .from('tickets')
    .select('*, raffles(title, banner_url, draw_date), users(full_name, phone, email, cedula_or_id)')
    .eq('user_id', authData.user.id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTicket);
}

export async function fetchMySupportConversations(): Promise<SupportConversation[]> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return [];
  const { data, error } = await supabase
    .from('support_conversations')
    .select('*, users(full_name, phone), support_messages(*)')
    .eq('user_id', authData.user.id)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSupportConversation);
}

// ---------------------------------------------------------------------
// ESCRITURA (sitio cliente)
// ---------------------------------------------------------------------

/**
 * Reserva cada número de boleto de forma atómica (uno por llamada a la
 * función reserve_ticket de la base de datos, que rechaza duplicados) y
 * luego crea el reporte de pago asociado a esos boletos.
 */
export async function submitPaymentReport(params: {
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
}): Promise<PaymentReport> {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error('Debes iniciar sesión para comprar boletos.');

  const bonusNumbers = params.bonusNumbers || [];
  const ticketNumbers = Array.from(new Set(params.selectedNumbers));
  const paidCount = Math.max(1, ticketNumbers.length - bonusNumbers.length);
  const unitPrice = params.totalAmount / paidCount;

  // 1. Reservar cada número de forma atómica (evita duplicados por diseño).
  const reservedTicketIds: string[] = [];
  for (const num of ticketNumbers) {
    const isBonus = bonusNumbers.includes(num);
    const { data: ticket, error: reserveError } = await supabase.rpc('reserve_ticket', {
      p_raffle_id: params.raffleId,
      p_ticket_number: num,
      p_price_paid: isBonus ? 0 : unitPrice,
    });
    if (reserveError) {
      // Si un número falla (ya tomado), no seguimos reservando los demás.
      throw new Error(`No se pudo reservar el boleto ${num}: ${reserveError.message}`);
    }
    reservedTicketIds.push(ticket.id);
  }

  // 2. Crear el reporte de pago.
  const { data: report, error: reportError } = await supabase
    .from('payment_reports')
    .insert({
      raffle_id: params.raffleId,
      user_id: authData.user.id,
      sender_name: params.senderName,
      sender_phone: params.senderPhone,
      sender_email: params.senderEmail,
      sender_cedula: params.senderCedula,
      destination_bank: params.destinationBank,
      reference_number: params.referenceNumber,
      amount: params.totalAmount,
      receipt_url: params.receiptUrl,
    })
    .select('*, raffles(title)')
    .single();
  if (reportError) throw reportError;

  // 3. Vincular los boletos recién reservados a este reporte de pago.
  await supabase.from('tickets').update({ payment_report_id: report.id }).in('id', reservedTicketIds);

  return mapPaymentReport({ ...report, tickets: ticketNumbers.map((n) => ({ ticket_number: n })) });
}

export async function sendSupportMessage(params: {
  fullName: string;
  phone: string;
  subject: string;
  messageText: string;
  ticketId?: string;
}) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) throw new Error('Debes iniciar sesión para escribir a soporte.');

  const { data: conv, error: convError } = await supabase
    .from('support_conversations')
    .insert({
      user_id: authData.user.id,
      subject: params.ticketId ? `[Boleto #${params.ticketId}] ${params.subject}` : params.subject,
      related_ticket_id: params.ticketId || null,
    })
    .select()
    .single();
  if (convError) throw convError;

  const { error: msgError } = await supabase.from('support_messages').insert({
    conversation_id: conv.id,
    sender: 'user',
    sender_id: authData.user.id,
    sender_name: params.fullName,
    message: params.messageText,
  });
  if (msgError) throw msgError;
}

export async function updateMyProfile(params: {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  cedulaOrId?: string;
}) {
  const { error } = await supabase
    .from('users')
    .update({ full_name: params.fullName, phone: params.phone, cedula_or_id: params.cedulaOrId })
    .eq('id', params.id);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// ADMINISTRADOR
// ---------------------------------------------------------------------

export async function fetchManagedUsers(): Promise<ManagedUser[]> {
  const { data, error } = await supabase.from('users').select('*').order('joined_date', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapManagedUser);
}

export async function updateManagedUserStatus(userId: string, status: string, notes?: string) {
  const { error } = await supabase.from('users').update({ status, notes }).eq('id', userId);
  if (error) throw error;
}

export async function fetchAuditLogs(): Promise<AdminAuditLog[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data || []).map(mapAuditLog);
}

export async function fetchAllTicketsForAdmin(): Promise<Ticket[]> {
  const { data, error } = await supabase
    .from('tickets')
    .select('*, raffles(title, banner_url, draw_date), users(full_name, phone, email, cedula_or_id)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapTicket);
}

export async function fetchAllPaymentReportsForAdmin(): Promise<PaymentReport[]> {
  const { data, error } = await supabase
    .from('payment_reports')
    .select('*, raffles(title), tickets(ticket_number)')
    .order('submitted_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapPaymentReport);
}

export async function fetchAllSupportConversationsForAdmin(): Promise<SupportConversation[]> {
  const { data, error } = await supabase
    .from('support_conversations')
    .select('*, users(full_name, phone), support_messages(*)')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapSupportConversation);
}

export async function createOrUpdateRaffle(raffleData: Partial<Raffle> & { id?: string }) {
  const payload: any = {
    title: raffleData.title,
    subtitle: raffleData.subtitle,
    category: raffleData.category,
    ticket_price: raffleData.ticketPrice,
    total_tickets: raffleData.totalTickets,
    draw_date: raffleData.drawDate || null,
    status: raffleData.status || 'draft',
    banner_url: raffleData.bannerUrl,
    description: raffleData.description,
    prize_details: raffleData.prizeDetails,
    rules: raffleData.rules,
    legal_terms: raffleData.legalTerms,
    hide_remaining_tickets: raffleData.hideRemainingTickets,
    has_bonus_promotion: raffleData.hasBonusPromotion,
    bonus_buy_threshold: raffleData.bonusBuyThreshold,
    bonus_free_tickets: raffleData.bonusFreeTickets,
    bonus_promotion_badge: raffleData.bonusPromotionBadge,
    allow_sales_beyond_limit: raffleData.allowSalesBeyondLimit,
    enable_draw_date: raffleData.enableDrawDate,
    custom_draw_date_text: raffleData.customDrawDateText,
  };
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

  if (raffleData.id) {
    const { error } = await supabase.from('raffles').update(payload).eq('id', raffleData.id);
    if (error) throw error;
    return raffleData.id;
  }

  const { data, error } = await supabase.from('raffles').insert(payload).select('id').single();
  if (error) throw error;
  return data.id as string;
}

export async function updateRaffleStatus(raffleId: string, status: RaffleStatus) {
  const { error } = await supabase.from('raffles').update({ status }).eq('id', raffleId);
  if (error) throw error;
}

export async function addRaffleMedia(raffleId: string, items: { type: 'image' | 'video'; url: string; title?: string }[]) {
  if (items.length === 0) return;
  const { error } = await supabase.from('raffle_media').insert(
    items.map((item, idx) => ({ raffle_id: raffleId, type: item.type, url: item.url, title: item.title, sort_order: idx }))
  );
  if (error) throw error;
}

export async function deleteRaffleMedia(raffleId: string) {
  const { error } = await supabase.from('raffle_media').delete().eq('raffle_id', raffleId);
  if (error) throw error;
}

/**
 * Confirma o rechaza un pago llamando a la función de base de datos
 * review_payment_report(), que valida el rol admin, actualiza el pago,
 * actualiza los boletos y registra la auditoría — todo de forma atómica.
 */
export async function reviewPaymentReport(reportId: string, approved: boolean, notes?: string) {
  const { error } = await supabase.rpc('review_payment_report', {
    p_payment_id: reportId,
    p_approve: approved,
    p_admin_notes: notes || null,
  });
  if (error) throw error;
}

export async function updateBankAccounts(accounts: BankAccount[]) {
  for (const acc of accounts) {
    const payload = {
      bank_name: acc.bankName,
      bank_code: acc.bankCode,
      account_number: acc.accountNumber,
      account_type: acc.accountType,
      beneficiary_name: acc.beneficiaryName,
      rnc_or_id: acc.rncOrId,
      logo_color: acc.logoColor,
      bg_light: acc.bgLight,
      badge_border: acc.badgeBorder,
      short_instructions: acc.shortInstructions,
      is_active: acc.isActive,
    };
    if (acc.id) {
      const { error } = await supabase.from('bank_accounts').update(payload).eq('id', acc.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('bank_accounts').insert(payload);
      if (error) throw error;
    }
  }
}

/**
 * Ejecuta el sorteo: elige un boleto CONFIRMADO al azar (solo boletos
 * pagados y verificados participan), guarda el resultado y marca la rifa
 * como sorteada y el boleto como ganador.
 */
export async function executeDraw(raffleId: string, publicSeed: string) {
  const { data: eligibleTickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('*, users(full_name)')
    .eq('raffle_id', raffleId)
    .eq('status', 'confirmed');
  if (ticketsError) throw ticketsError;
  if (!eligibleTickets || eligibleTickets.length === 0) {
    throw new Error('No se puede ejecutar el sorteo: no existen boletos con pago confirmado.');
  }

  const winningTicket = eligibleTickets[Math.floor(Math.random() * eligibleTickets.length)];

  // Hash público verificable = seed + lista de boletos elegibles + boleto ganador.
  const encoder = new TextEncoder();
  const payload = `${publicSeed}|${raffleId}|${eligibleTickets.map((t) => t.ticket_number).join(',')}|${winningTicket.ticket_number}`;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  const drawHash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');

  const { data: raffle } = await supabase.from('raffles').select('title, banner_url').eq('id', raffleId).single();

  const { error: insertError } = await supabase.from('draw_results').insert({
    raffle_id: raffleId,
    winning_ticket_number: winningTicket.ticket_number,
    winner_user_id: winningTicket.user_id,
    winner_name: winningTicket.users?.full_name || '',
    drawn_at: new Date().toISOString(),
    public_seed: publicSeed || `SEED_${Date.now()}`,
    draw_hash: drawHash,
    total_eligible_tickets: eligibleTickets.length,
  });
  if (insertError) throw insertError;

  await supabase.from('raffles').update({ status: 'drawn', drawn_at: new Date().toISOString(), winning_ticket_number: winningTicket.ticket_number, winner_name: winningTicket.users?.full_name || '' }).eq('id', raffleId);
  await supabase.from('tickets').update({ status: 'winner' }).eq('id', winningTicket.id);

  return { winningTicketNumber: winningTicket.ticket_number, winnerName: winningTicket.users?.full_name || '', raffleTitle: raffle?.title || '' };
}

export async function replySupport(conversationId: string, adminName: string, replyText: string) {
  const { data: authData } = await supabase.auth.getUser();
  const { error: msgError } = await supabase.from('support_messages').insert({
    conversation_id: conversationId,
    sender: 'admin',
    sender_id: authData.user?.id,
    sender_name: adminName,
    message: replyText,
  });
  if (msgError) throw msgError;

  const { error: convError } = await supabase
    .from('support_conversations')
    .update({ status: 'answered' })
    .eq('id', conversationId);
  if (convError) throw convError;
}
