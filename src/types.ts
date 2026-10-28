export type ScreenType = 
  | 'home'
  | 'raffle_detail'
  | 'payment_transfer'
  | 'my_tickets'
  | 'payment_methods'
  | 'support'
  | 'winners'
  | 'admin_dashboard';

export type RaffleStatus = 'draft' | 'active' | 'paused' | 'closed' | 'drawn' | 'cancelled';
export type TicketStatus = 'pending_payment' | 'confirmed' | 'winner' | 'cancelled' | 'refunded';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type SupportStatus = 'open' | 'answered' | 'closed';

export interface BankAccount {
  id: string;
  bankName: 'Banreservas' | 'Banco BHD' | 'Banco Popular' | string;
  bankCode?: string;
  accountNumber: string;
  accountType?: 'Cuenta Corriente' | 'Cuenta de Ahorros' | string;
  beneficiaryName?: string;
  rncOrId?: string;
  logoColor?: string;
  bgLight?: string;
  badgeBorder?: string;
  shortInstructions?: string;
  isActive?: boolean;
}

export interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cedulaOrId?: string;
  status: 'active' | 'blocked' | 'vip';
  role: 'client' | 'admin' | 'moderator';
  totalTicketsBought: number;
  totalSpent: number;
  joinedDate: string;
  lastActive: string;
  notes?: string;
  city?: string;
}

export interface AdminAuditLog {
  id: string;
  adminName: string;
  action: string;
  category: 'raffle' | 'payment' | 'draw' | 'bank' | 'user' | 'support' | 'auth';
  details: string;
  timestamp: string;
  ipAddress?: string;
}

export type AdminTabType =
  | 'dashboard'
  | 'raffles'
  | 'payments'
  | 'users'
  | 'sales'
  | 'support'
  | 'bank_accounts';


export interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  title?: string;
}

export interface Raffle {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  ticketPrice: number; // in DOP
  totalTickets: number;
  soldTicketsCount: number;
  reservedTicketsCount: number;
  drawDate: string;
  status: RaffleStatus;
  bannerUrl: string;
  media: MediaItem[];
  description: string;
  rules: string[];
  legalTerms: string;
  createdAt: string;
  drawnAt?: string;
  winningTicketNumber?: string;
  winnerName?: string;
  hideRemainingTickets?: boolean; // Ocultar cuántos boletos quedan al público (muestra solo vendidos/progreso)
  hasBonusPromotion?: boolean; // Promoción automática: Compra X y llévate Y gratis
  bonusBuyThreshold?: number; // Cantidad requerida de compra (ej: 5)
  bonusFreeTickets?: number; // Boletos gratis otorgados (ej: 1)
  bonusPromotionBadge?: string; // Texto descriptivo del evento o promoción
  allowSalesBeyondLimit?: boolean; // Permitir seguir vendiendo boletos tras superar el límite/meta esperado
  enableDrawDate?: boolean; // Habilitar o desactivar fecha fija de sorteo
  customDrawDateText?: string; // Texto personalizado cuando la fecha fija está desactivada (ej. "Hasta agotar meta")
  prizeDetails?: string; // Detalles del premio (beneficios, garantías, etc.) - múltiples líneas
}

export interface Ticket {
  id: string;
  raffleId: string;
  raffleTitle: string;
  raffleCover: string;
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string;
  userCedula?: string;
  ticketNumber: string; // e.g. "0428"
  paymentReportId: string;
  status: TicketStatus;
  pricePaid: number;
  bankUsed: string;
  referenceNumber: string;
  createdAt: string;
  confirmedAt?: string;
  drawDate: string;
  isBonusTicket?: boolean; // Indica si fue otorgado como boleto gratis por promoción
}

export interface PaymentReport {
  id: string;
  raffleId: string;
  raffleTitle: string;
  userId: string;
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  senderCedula?: string;
  destinationBank: string;
  referenceNumber: string;
  amount: number;
  ticketNumbers: string[];
  receiptUrl: string;
  status: PaymentStatus;
  adminNotes?: string;
  submittedAt: string;
  reviewedAt?: string;
}

export interface DrawResult {
  id: string;
  raffleId: string;
  raffleTitle: string;
  prizeImage: string;
  winningTicketNumber: string;
  winnerUserId: string;
  winnerName: string;
  winnerCity: string;
  drawnAt: string;
  publicSeed: string;
  drawHash: string;
  totalEligibleTickets: number;
  lotteryReference: string;
  notaryCertificateUrl?: string;
  prizeDelivered: boolean;
  deliveryPhotoUrl?: string;
  testimonial?: string;
}

export interface SupportChatMessage {
  id: string;
  sender: 'user' | 'admin';
  senderName: string;
  text: string;
  createdAt: string;
}

export interface SupportConversation {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  subject: string;
  relatedTicketId?: string;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportChatMessage[];
}

export interface AppNotification {
  id: string;
  target: 'client' | 'admin' | 'all';
  userId?: string;
  title: string;
  message: string;
  type: 'payment_confirmed' | 'payment_rejected' | 'draw_executed' | 'support_reply' | 'raffle_closing';
  read: boolean;
  createdAt: string;
  linkScreen?: ScreenType;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  cedulaOrId?: string;
  isLoggedIn: boolean;
  role: 'client' | 'admin';
}
