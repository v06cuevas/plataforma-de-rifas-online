import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { ScreenType, UserProfile, Raffle, Ticket, PaymentReport, DrawResult, SupportConversation, AppNotification, RaffleStatus, ManagedUser, BankAccount, AdminAuditLog } from './types';
import * as api from './lib/api';
import { supabase } from './lib/supabaseClient';
import { subscribeToRealtimeUpdates, startPollingFallback } from './lib/realtimeSubscriptions';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileNav } from './components/MobileNav';
import { HomeView } from './components/HomeView';
import { RaffleDetailView } from './components/RaffleDetailView';
import { TransferPaymentView } from './components/TransferPaymentView';
import { MyTicketsView } from './components/MyTicketsView';
import { SupportView } from './components/SupportView';
import { WinnersView } from './components/WinnersView';
import { PaymentMethodsView } from './components/PaymentMethodsView';
// Estos 4 componentes son "pesados" (panel admin completo + modales) y NO
// los necesita un visitante normal que solo entra a ver/comprar rifas. Se
// cargan en un chunk aparte (code-splitting) para que el bundle inicial que
// descarga cualquier visitante (y Googlebot, clave para el SEO/LCP) sea más
// pequeño y arranque a pedir los datos de las rifas más rápido.
const AdminDashboardView = lazy(() =>
  import('./components/AdminDashboardView').then((m) => ({ default: m.AdminDashboardView }))
);
const AuthModal = lazy(() => import('./components/AuthModal').then((m) => ({ default: m.AuthModal })));
const AdminLoginModal = lazy(() =>
  import('./components/AdminLoginModal').then((m) => ({ default: m.AdminLoginModal }))
);
const EditProfileModal = lazy(() =>
  import('./components/EditProfileModal').then((m) => ({ default: m.EditProfileModal }))
);
import { CheckCircle2 } from 'lucide-react';

function AppSectionFallback() {
  return (
    <div className="w-full min-h-[50vh] flex items-center justify-center">
      <span className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const EMPTY_USER: UserProfile = {
  id: '',
  fullName: '',
  email: '',
  phone: '',
  isLoggedIn: false,
  role: 'client',
};

export default function App() {
  // Navigation & View State
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [selectedRaffleId, setSelectedRaffleId] = useState<string>('');

  // State for checkout transfer flow
  const [checkoutNumbers, setCheckoutNumbers] = useState<string[]>([]);
  const [checkoutBonusNumbers, setCheckoutBonusNumbers] = useState<string[]>([]);
  const [checkoutTotalAmount, setCheckoutTotalAmount] = useState<number>(0);

  // Core Application Data State (ahora poblado desde Supabase, no desde mockData)
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [paymentReports, setPaymentReports] = useState<PaymentReport[]>([]);
  const [drawResults, setDrawResults] = useState<DrawResult[]>([]);
  const [showWinners, setShowWinners] = useState(false);
  const [supportConversations, setSupportConversations] = useState<SupportConversation[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [user, setUser] = useState<UserProfile>(EMPTY_USER);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Admin and Auth Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<{ name: string; role: string; email: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs para manejar subscripciones y polling
  const unsubscribeRealtimeRef = useRef<(() => void) | null>(null);
  const unsubscribePollingRef = useRef<(() => void) | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // -----------------------------------------------------------------
  // CARGA INICIAL: datos públicos + sesión existente (si la hay)
  // -----------------------------------------------------------------
  const loadPublicData = async () => {
    // Las rifas son lo único que bloquea el primer pintado de la portada
    // (la imagen de la primera tarjeta es el elemento LCP), así que se piden
    // primero y en solitario. Cuentas bancarias y ganadores no son visibles
    // en el "above the fold" de la portada, así que se cargan en paralelo
    // en segundo plano y NO retrasan el fin del estado "isLoading".
    const activeRaffles = await api.fetchActiveRaffles();
    setRaffles(activeRaffles);
    if (activeRaffles.length > 0) setSelectedRaffleId(activeRaffles[0].id);

    Promise.all([api.fetchBankAccounts(true), api.fetchDrawResults()])
      .then(([banks, winners]) => {
        setBankAccounts(banks);
        setDrawResults(winners);
      })
      .catch((err) => {
        console.error('Error cargando datos secundarios (bancos/ganadores):', err);
      });
  };

  const loadMyClientData = async () => {
    const [myTickets, myConversations] = await Promise.all([
      api.fetchMyTickets(),
      api.fetchMySupportConversations(),
    ]);
    setTickets(myTickets);
    setSupportConversations(myConversations);
  };

  // Cargar datos y configurar suscripciones en tiempo real
  useEffect(() => {
    (async () => {
      try {
        // Carga inicial de datos públicos (rifas). En cuanto esto resuelve,
        // ya podemos quitar el spinner y pintar la portada: el chequeo de
        // sesión de abajo NO debe retrasar ese primer pintado.
        await loadPublicData();
        setIsLoading(false);

        // Verificar si hay sesión existente (desde localStorage). Esto pasa
        // en segundo plano, después de que la portada ya es visible.
        const profile = await api.fetchMyProfile();
        if (profile) {
          setUser(profile);
          await loadMyClientData();
        }
      } catch (err) {
        console.error('Error en carga inicial:', err);
        showToast('No se pudo conectar con la base de datos. Revisa tu configuración de Supabase.');
        setIsLoading(false);
      }
    })();

    // Escuchar cambios de autenticación
    const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      if (event === 'SIGNED_OUT') {
        setUser(EMPTY_USER);
        setTickets([]);
        setSupportConversations([]);
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Recargar datos del perfil cuando hay cambios de autenticación
        try {
          const updatedProfile = await api.fetchMyProfile();
          if (updatedProfile) {
            setUser(updatedProfile);
            await loadMyClientData();
          }
        } catch (err) {
          console.error('Error actualizando perfil:', err);
        }
      }
    });

    // Limpiar
    return () => {
      authSub?.subscription.unsubscribe();
      if (unsubscribeRealtimeRef.current) unsubscribeRealtimeRef.current();
      if (unsubscribePollingRef.current) unsubscribePollingRef.current();
    };
  }, []);

  // Configurar suscripciones en tiempo real cuando el usuario cambia
  useEffect(() => {
    if (isLoading) return;

    const isAdmin = adminProfile?.role === 'admin';

    // Limpiar suscripciones anteriores
    if (unsubscribeRealtimeRef.current) unsubscribeRealtimeRef.current();
    if (unsubscribePollingRef.current) unsubscribePollingRef.current();

    // Configurar nuevas suscripciones
    unsubscribeRealtimeRef.current = subscribeToRealtimeUpdates(isAdmin, {
      onRafflesUpdate: setRaffles,
      onTicketsUpdate: setTickets,
      onPaymentReportsUpdate: setPaymentReports,
      onDrawResultsUpdate: setDrawResults,
      onSupportConversationsUpdate: setSupportConversations,
      onError: (error) => {
        console.error('Error en suscripción realtime:', error);
      },
    });

    // Configurar polling como fallback (cada 30 segundos)
    unsubscribePollingRef.current = startPollingFallback(isAdmin, {
      onRafflesUpdate: setRaffles,
      onTicketsUpdate: setTickets,
      onPaymentReportsUpdate: setPaymentReports,
      onDrawResultsUpdate: setDrawResults,
      onSupportConversationsUpdate: setSupportConversations,
      onError: (error) => {
        console.error('Error en polling fallback:', error);
      },
    }, 30000);

    return () => {
      if (unsubscribeRealtimeRef.current) unsubscribeRealtimeRef.current();
      if (unsubscribePollingRef.current) unsubscribePollingRef.current();
    };
  }, [isLoading, adminProfile?.role]);

  // Cargar medios de la rifa cuando se abre el detalle
  useEffect(() => {
    if (currentScreen !== 'raffle_detail' || !selectedRaffleId) return;

    const loadMediaForRaffle = async () => {
      try {
        const media = await api.fetchRaffleMedia(selectedRaffleId);
        setRaffles((prevRaffles) =>
          prevRaffles.map((r) =>
            r.id === selectedRaffleId ? { ...r, media } : r
          )
        );
      } catch (err) {
        console.error('Error loading raffle media:', err);
      }
    };

    loadMediaForRaffle();
  }, [currentScreen, selectedRaffleId]);

  const refreshAdminData = async () => {
    const [allRaffles, allTickets, allPayments, allSupport, users, logs, winners] = await Promise.all([
      api.fetchAllRafflesForAdmin(),
      api.fetchAllTicketsForAdmin(),
      api.fetchAllPaymentReportsForAdmin(),
      api.fetchAllSupportConversationsForAdmin(),
      api.fetchManagedUsers(),
      api.fetchAuditLogs(),
      api.fetchDrawResults(),
    ]);
    setRaffles(allRaffles);
    setTickets(allTickets);
    setPaymentReports(allPayments);
    setSupportConversations(allSupport);
    setManagedUsers(users);
    setAuditLogs(logs);
    setDrawResults(winners);
  };

  // Client Flow Handlers
  const handleSelectRaffle = (raffleId: string) => {
    setSelectedRaffleId(raffleId);
    setCurrentScreen('raffle_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToPayment = (selectedNumbers: string[], totalAmount: number, bonusNumbers: string[] = []) => {
    if (!user.isLoggedIn) {
      showToast('Debes iniciar sesión antes de comprar boletos.');
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutNumbers(selectedNumbers);
    setCheckoutBonusNumbers(bonusNumbers);
    setCheckoutTotalAmount(totalAmount);
    setCurrentScreen('payment_transfer');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitPaymentReport = async (reportData: {
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
  }) => {
    try {
      await api.submitPaymentReport(reportData);
      await Promise.all([loadPublicData(), loadMyClientData()]);
      setCurrentScreen('my_tickets');
      showToast('¡Comprobante enviado con éxito! Tus boletos quedaron apartados en verificación bancaria.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      showToast(err?.message || 'No se pudo procesar tu compra. Intenta con otro número de boleto.');
    }
  };

  const handleSendMessage = async (subject: string, messageText: string, ticketId?: string) => {
    try {
      await api.sendSupportMessage({ fullName: user.fullName, phone: user.phone, subject, messageText, ticketId });
      await loadMyClientData();
      showToast('Consulta enviada. Nuestro oficial de soporte te responderá por este panel.');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo enviar tu mensaje.');
    }
  };

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    try {
      await api.updateMyProfile(updatedProfile);
      setUser(updatedProfile);
      showToast('Tus datos se actualizaron correctamente.');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo actualizar tu perfil.');
    }
  };

  // ADMIN OPERATIONS
  const handleCreateOrUpdateRaffle = async (raffleData: Partial<Raffle> & { id?: string }) => {
    try {
      const raffleId = await api.createOrUpdateRaffle(raffleData);
      
      // Guardar medios en la base de datos
      if (raffleData.media && raffleData.media.length > 0) {
        // Si es edición, eliminar medios antiguos primero
        if (raffleData.id) {
          await api.deleteRaffleMedia(raffleData.id);
        }
        
        // Agregar los nuevos medios
        await api.addRaffleMedia(raffleId, raffleData.media.map((m) => ({
          type: m.type,
          url: m.url,
          title: m.title,
        })));
      }
      
      await refreshAdminData();
      showToast(raffleData.id ? 'Rifa actualizada correctamente.' : '¡Nueva rifa creada en borrador!');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo guardar la rifa.');
    }
  };

  const handleUpdateRaffleStatus = async (raffleId: string, newStatus: RaffleStatus) => {
    try {
      await api.updateRaffleStatus(raffleId, newStatus);
      await refreshAdminData();
      showToast(`Estado de la rifa actualizado a: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      showToast(err?.message || 'No se pudo actualizar el estado de la rifa.');
    }
  };

  const handleVerifyPayment = async (reportId: string, approved: boolean, notes?: string) => {
    try {
      await api.reviewPaymentReport(reportId, approved, notes);
      await refreshAdminData();
      showToast(approved ? 'Pago aprobado. Boletos confirmados para el sorteo.' : 'Comprobante rechazado.');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo revisar el pago.');
    }
  };

  const handleExecuteDraw = async (raffleId: string, publicSeed: string) => {
    try {
      const result = await api.executeDraw(raffleId, publicSeed);
      await refreshAdminData();
      showToast(`¡SORTEO COMPLETADO! Boleto Ganador: #${result.winningTicketNumber} (${result.winnerName})`);
    } catch (err: any) {
      alert(err?.message || 'No se pudo ejecutar el sorteo.');
    }
  };

  const handleReplySupport = async (conversationId: string, replyText: string) => {
    try {
      await api.replySupport(conversationId, adminProfile?.name || 'Administrador', replyText);
      await refreshAdminData();
      showToast('Respuesta oficial enviada al comprador.');
    } catch (err: any) {
      showToast(err?.message || 'No se pudo enviar la respuesta.');
    }
  };

  const activeRaffle = raffles.find((r) => r.id === selectedRaffleId) || raffles[0];
  const currentScreenValue = currentScreen as ScreenType;

  if (isLoading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-100/70">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Cargando plataforma...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-slate-100/70 text-slate-900 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* If admin is viewing the Admin Dashboard */}
      {adminProfile && adminProfile.role === 'admin' && currentScreen === 'admin_dashboard' ? (
        <div className="flex-1">
          <Suspense fallback={<AppSectionFallback />}>
          <AdminDashboardView
            raffles={raffles}
            tickets={tickets}
            paymentReports={paymentReports}
            drawResults={drawResults}
            supportConversations={supportConversations}
            users={managedUsers}
            bankAccounts={bankAccounts}
            auditLogs={auditLogs}
            adminProfile={adminProfile}
            onExitAdmin={async () => {
              setCurrentScreen('home');
              await loadPublicData();
            }}
            onCreateOrUpdateRaffle={handleCreateOrUpdateRaffle}
            onUpdateRaffleStatus={handleUpdateRaffleStatus}
            onVerifyPayment={handleVerifyPayment}
            onExecuteDraw={handleExecuteDraw}
            onReplySupport={handleReplySupport}
            onUpdateBankAccounts={async (accs) => {
              try {
                await api.updateBankAccounts(accs);
                const banks = await api.fetchBankAccounts(false);
                setBankAccounts(banks);
                showToast('Cuentas bancarias actualizadas.');
              } catch (err: any) {
                showToast(err?.message || 'No se pudieron actualizar las cuentas bancarias.');
              }
            }}
            onUpdateUserStatus={async (uId, st, nt) => {
              try {
                await api.updateManagedUserStatus(uId, st, nt);
                const users = await api.fetchManagedUsers();
                setManagedUsers(users);
                showToast(`Estado de usuario actualizado a: ${st.toUpperCase()}`);
              } catch (err: any) {
                showToast(err?.message || 'No se pudo actualizar el usuario.');
              }
            }}
            showWinners={showWinners}
            onToggleWinners={(visible) => {
              setShowWinners(visible);
              if (!visible && currentScreenValue === 'winners') setCurrentScreen('home');
              showToast(visible ? 'Página de ganadores visible para los clientes.' : 'Página de ganadores ocultada para los clientes.');
            }}
          />
          </Suspense>
        </div>
      ) : (
        <>
          {/* Main Header */}
          <Header
            currentScreen={currentScreen}
            onNavigate={(sc) => {
              setCurrentScreen(sc);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            user={user}
            userTickets={tickets}
            showWinners={showWinners}
            onOpenEditProfile={user.isLoggedIn ? () => setIsEditProfileOpen(true) : undefined}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
            adminProfile={adminProfile}
            onOpenAdminDashboard={async () => {
              if (!adminProfile || adminProfile.role !== 'admin') {
                showToast('No tienes permisos para abrir el panel administrativo.');
                setCurrentScreen('home');
                return;
              }
              await refreshAdminData();
              setCurrentScreen('admin_dashboard');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onAdminLogout={async () => {
              await api.logout();
              setAdminProfile(null);
              showToast('Sesión administrativa finalizada.');
            }}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLogout={async () => {
              await api.logout();
              showToast('Has cerrado sesión correctamente.');
            }}
          />

          {/* Content Views */}
          <main className="flex-1 w-full min-w-0 px-3 sm:px-6 lg:px-8 pt-20 sm:pt-24">
            {currentScreen === 'home' && (
              <HomeView
                raffles={raffles}
                winners={drawResults}
                onSelectRaffle={handleSelectRaffle}
                onNavigateToWinners={() => {
                  setCurrentScreen('winners');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentScreen === 'raffle_detail' && activeRaffle && (
              <RaffleDetailView
                raffle={activeRaffle}
                existingTickets={tickets}
                allTickets={tickets}
                onBack={() => setCurrentScreen('home')}
                onProceedToPayment={handleProceedToPayment}
              />
            )}

            {currentScreen === 'payment_transfer' && activeRaffle && (
              <TransferPaymentView
                raffle={activeRaffle}
                selectedNumbers={checkoutNumbers}
                bonusNumbers={checkoutBonusNumbers}
                totalAmount={checkoutTotalAmount}
                user={user}
                bankAccounts={bankAccounts}
                onBack={() => setCurrentScreen('raffle_detail')}
                onSubmitPaymentReport={handleSubmitPaymentReport}
                onNavigateToSupport={() => {
                  setCurrentScreen('support');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentScreen === 'payment_methods' && (
              <PaymentMethodsView
                bankAccounts={bankAccounts}
                onExploreRaffles={() => {
                  setCurrentScreen('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onNavigateToSupport={() => {
                  setCurrentScreen('support');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentScreen === 'my_tickets' && (
              <MyTicketsView
                tickets={tickets}
                user={user}
                onExploreRaffles={() => {
                  setCurrentScreen('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onViewRaffle={handleSelectRaffle}
                onNavigateToSupport={() => {
                  setCurrentScreen('support');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentScreen === 'support' && (
              <SupportView
                user={user}
                tickets={tickets}
                conversations={supportConversations}
                onSendMessage={handleSendMessage}
              />
            )}

            {showWinners && currentScreen === 'winners' && (
              <WinnersView
                winners={drawResults}
                onExploreRaffles={() => {
                  setCurrentScreen('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}
          </main>

          {/* Footer */}
          <Footer
            onNavigate={(sc) => {
              setCurrentScreen(sc);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenAdminLogin={() => setIsAdminLoginOpen(true)}
          />

          {/* Mobile Fixed Bottom Navigation Bar */}
          <MobileNav
            currentScreen={currentScreen}
            onNavigate={(sc) => {
              setCurrentScreen(sc);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            ticketCount={tickets.length}
            showWinners={showWinners}
          />
        </>
      )}

      {/*
        Los 3 modales de abajo se montan (y por lo tanto descargan su chunk
        JS) SOLO cuando el usuario realmente los abre. Si se montaran siempre
        con isOpen=false, React igual dispararía la descarga del chunk en
        cuanto la portada carga, compitiendo por ancho de banda con la
        imagen LCP de la tarjeta de rifa — justo lo que queremos evitar.
      */}
      {isAuthModalOpen && (
        <Suspense fallback={null}>
          <AuthModal
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onLoginSuccess={async (loggedUser) => {
              setUser(loggedUser);
              await loadMyClientData();
              showToast(`¡Bienvenido ${loggedUser.fullName}!`);
            }}
          />
        </Suspense>
      )}

      {isEditProfileOpen && (
        <Suspense fallback={null}>
          <EditProfileModal
            isOpen={isEditProfileOpen}
            user={user}
            onClose={() => setIsEditProfileOpen(false)}
            onSave={handleSaveProfile}
          />
        </Suspense>
      )}

      {/* Admin Special & Unique Login Modal */}
      {isAdminLoginOpen && (
        <Suspense fallback={null}>
          <AdminLoginModal
            isOpen={isAdminLoginOpen}
            onClose={() => setIsAdminLoginOpen(false)}
            onAdminLoginSuccess={async (adminData) => {
              setAdminProfile(adminData);
              await refreshAdminData();
              setCurrentScreen('admin_dashboard');
              showToast(`Sesión Administrativa Iniciada: ${adminData.name}`);
            }}
          />
        </Suspense>
      )}

      {/* Global Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-16 md:bottom-8 right-4 left-4 md:left-auto md:max-w-md z-50 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-medium leading-snug">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
