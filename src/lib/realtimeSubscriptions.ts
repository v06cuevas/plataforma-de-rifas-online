import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Raffle, Ticket, PaymentReport, DrawResult, SupportConversation } from '../types';
import * as api from './api';

type UnsubscribeFunction = () => void;

// Tipo para los callbacks que actualizan el estado
export interface RealtimeCallbacks {
  onRafflesUpdate?: (raffles: Raffle[]) => void;
  onTicketsUpdate?: (tickets: Ticket[]) => void;
  onPaymentReportsUpdate?: (reports: PaymentReport[]) => void;
  onDrawResultsUpdate?: (results: DrawResult[]) => void;
  onSupportConversationsUpdate?: (conversations: SupportConversation[]) => void;
  onError?: (error: Error) => void;
}

// Limpieza recomendada por Supabase: `channel.unsubscribe()` cierra la
// conexión pero NO elimina el canal de la lista interna del cliente
// (`supabase.getChannels()`). Si luego se vuelve a crear un canal con el
// mismo nombre (p. ej. al cambiar de cliente a admin), puede quedar
// duplicado. `supabase.removeChannel()` hace ambas cosas correctamente.
const cleanupChannel = (channel: RealtimeChannel) => {
  supabase.removeChannel(channel);
};

/**
 * Suscribe a cambios en tiempo real de las tablas principales.
 * Cada vez que detecta cambios, llama a la API para obtener datos frescos y actualiza el estado.
 * Retorna una función para desuscribirse.
 *
 * IMPORTANTE: para que esto funcione, las tablas deben estar agregadas a la
 * publicación `supabase_realtime` en Supabase (Database → Publications, o
 * el SQL en la sección "REALTIME" de supabase_schema.sql). Si no lo están,
 * estos canales se suscriben "exitosamente" pero JAMÁS reciben eventos —
 * el fallo es silencioso. Por eso abajo registramos el estado de cada
 * suscripción en consola: busca "SUBSCRIBED" o "CHANNEL_ERROR"/"TIMED_OUT".
 */
export function subscribeToRealtimeUpdates(
  isAdmin: boolean = false,
  callbacks: RealtimeCallbacks
): () => void {
  const channels: RealtimeChannel[] = [];

  // Helper para crear un throttle simple (evita actualizaciones demasiado frecuentes)
  const createThrottledCallback = <T>(callback: (data: T) => void, delayMs: number = 2000) => {
    let lastCall = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    return (data: T) => {
      const now = Date.now();
      if (now - lastCall >= delayMs) {
        lastCall = now;
        callback(data);
      } else if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          callback(data);
          timeoutId = null;
        }, delayMs - (now - lastCall));
      }
    };
  };

  // Callback de estado compartido para loguear si un canal realmente logró
  // suscribirse (esto es lo único que delata el problema #1 de arriba).
  const logChannelStatus = (channelName: string) => (status: string, err?: Error) => {
    if (status === 'SUBSCRIBED') {
      console.log(`[Realtime] ✅ Suscrito a "${channelName}"`);
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.error(
        `[Realtime] ❌ Error suscribiendo a "${channelName}" (${status}). ` +
          `Verifica que la tabla esté agregada a la publicación "supabase_realtime" en Supabase.`,
        err
      );
    } else if (status === 'CLOSED') {
      console.warn(`[Realtime] Canal "${channelName}" cerrado.`);
    }
  };

  // Callbacks "throttleados" para evitar que cada micro-cambio en la BD
  // dispare un re-render inmediato en toda la app (esto es lo que rompía
  // el auto-play del carrusel de imágenes: cada evento recreaba los objetos
  // de raffle y reiniciaba el temporizador antes de que llegara a cumplirse)
  const throttledRafflesUpdate = callbacks.onRafflesUpdate
    ? createThrottledCallback(callbacks.onRafflesUpdate, 2000)
    : undefined;
  const throttledTicketsUpdate = callbacks.onTicketsUpdate
    ? createThrottledCallback(callbacks.onTicketsUpdate, 2000)
    : undefined;
  const throttledSupportUpdate = callbacks.onSupportConversationsUpdate
    ? createThrottledCallback(callbacks.onSupportConversationsUpdate, 1000)
    : undefined;

  // Suscripción a cambios en RAFFLES
  // (raffle_stats es una VIEW, así que se actualiza automáticamente cuando raffles cambia)
  const raffleChannel = supabase
    .channel('public:raffles')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'raffles',
      },
      async () => {
        try {
          const raffles = isAdmin
            ? await api.fetchAllRafflesForAdmin()
            : await api.fetchActiveRaffles();
          throttledRafflesUpdate?.(raffles);
        } catch (error) {
          console.error('Error actualizando raffles en tiempo real:', error);
          callbacks.onError?.(error as Error);
        }
      }
    )
    .subscribe(logChannelStatus('raffles'));

  channels.push(raffleChannel);

  // Suscripción a cambios en TICKETS
  const ticketChannel = supabase
    .channel('public:tickets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
      },
      async () => {
        try {
          const tickets = isAdmin
            ? await api.fetchAllTicketsForAdmin()
            : await api.fetchMyTickets();
          throttledTicketsUpdate?.(tickets);
        } catch (error) {
          console.error('Error actualizando tickets en tiempo real:', error);
          callbacks.onError?.(error as Error);
        }
      }
    )
    .subscribe(logChannelStatus('tickets'));

  channels.push(ticketChannel);

  // Suscripción a cambios en PAYMENT_REPORTS (solo admin lo necesita realmente, pero útil para clientes)
  if (isAdmin) {
    const paymentChannel = supabase
      .channel('public:payment_reports')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payment_reports',
        },
        async () => {
          try {
            const reports = await api.fetchAllPaymentReportsForAdmin();
            callbacks.onPaymentReportsUpdate?.(reports);
          } catch (error) {
            console.error('Error actualizando payment reports en tiempo real:', error);
            callbacks.onError?.(error as Error);
          }
        }
      )
      .subscribe(logChannelStatus('payment_reports'));

    channels.push(paymentChannel);

    // Suscripción a cambios en DRAW_RESULTS
    const drawChannel = supabase
      .channel('public:draw_results')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'draw_results',
        },
        async () => {
          try {
            const results = await api.fetchDrawResults();
            callbacks.onDrawResultsUpdate?.(results);
          } catch (error) {
            console.error('Error actualizando draw results en tiempo real:', error);
            callbacks.onError?.(error as Error);
          }
        }
      )
      .subscribe(logChannelStatus('draw_results'));

    channels.push(drawChannel);

    // Suscripción a cambios en SUPPORT_CONVERSATIONS
    const supportConvChannel = supabase
      .channel('public:support_conversations:admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
        },
        async () => {
          try {
            const conversations = await api.fetchAllSupportConversationsForAdmin();
            throttledSupportUpdate?.(conversations);
          } catch (error) {
            console.error('Error actualizando support conversations en tiempo real:', error);
            callbacks.onError?.(error as Error);
          }
        }
      )
      .subscribe(logChannelStatus('support_conversations (admin)'));

    channels.push(supportConvChannel);

    // Suscripción a cambios en SUPPORT_MESSAGES (los mensajes del chat viven
    // en esta tabla, NO en support_conversations — sin esto, un mensaje
    // nuevo del cliente no aparecía en el panel admin hasta el polling de 30s)
    const supportMsgChannel = supabase
      .channel('public:support_messages:admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
        },
        async () => {
          try {
            const conversations = await api.fetchAllSupportConversationsForAdmin();
            throttledSupportUpdate?.(conversations);
          } catch (error) {
            console.error('Error actualizando mensajes de soporte en tiempo real:', error);
            callbacks.onError?.(error as Error);
          }
        }
      )
      .subscribe(logChannelStatus('support_messages (admin)'));

    channels.push(supportMsgChannel);
  } else {
    // Para clientes, solo escuchar sus propias conversaciones de soporte
    const supportConvChannel = supabase
      .channel('public:support_conversations:client')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_conversations',
        },
        async () => {
          try {
            const conversations = await api.fetchMySupportConversations();
            throttledSupportUpdate?.(conversations);
          } catch (error) {
            console.error('Error actualizando support conversations en tiempo real:', error);
            callbacks.onError?.(error as Error);
          }
        }
      )
      .subscribe(logChannelStatus('support_conversations (cliente)'));

    channels.push(supportConvChannel);

    // Igual que arriba: sin escuchar support_messages, las respuestas del
    // admin en el chat no llegaban en tiempo real al cliente.
    const supportMsgChannel = supabase
      .channel('public:support_messages:client')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
        },
        async () => {
          try {
            const conversations = await api.fetchMySupportConversations();
            throttledSupportUpdate?.(conversations);
          } catch (error) {
            console.error('Error actualizando mensajes de soporte en tiempo real:', error);
            callbacks.onError?.(error as Error);
          }
        }
      )
      .subscribe(logChannelStatus('support_messages (cliente)'));

    channels.push(supportMsgChannel);
  }

  // Retornar función para desuscribirse de todo
  return () => {
    channels.forEach((channel) => cleanupChannel(channel));
  };
}

/**
 * Suscriptor de polling automático como fallback.
 * Útil si WebSockets no funciona (ej: conexiones malas, firewalls)
 */
export function startPollingFallback(
  isAdmin: boolean = false,
  callbacks: RealtimeCallbacks,
  intervalMs: number = 30000 // 30 segundos por defecto
): () => void {
  const intervals: NodeJS.Timeout[] = [];

  // Polling para raffles
  const raffleInterval = setInterval(async () => {
    try {
      const raffles = isAdmin
        ? await api.fetchAllRafflesForAdmin()
        : await api.fetchActiveRaffles();
      callbacks.onRafflesUpdate?.(raffles);
    } catch (error) {
      console.error('Error en polling de raffles:', error);
      callbacks.onError?.(error as Error);
    }
  }, intervalMs);
  intervals.push(raffleInterval);

  // Polling para tickets
  const ticketInterval = setInterval(async () => {
    try {
      const tickets = isAdmin
        ? await api.fetchAllTicketsForAdmin()
        : await api.fetchMyTickets();
      callbacks.onTicketsUpdate?.(tickets);
    } catch (error) {
      console.error('Error en polling de tickets:', error);
      callbacks.onError?.(error as Error);
    }
  }, intervalMs);
  intervals.push(ticketInterval);

  if (isAdmin) {
    // Polling para payment reports
    const paymentInterval = setInterval(async () => {
      try {
        const reports = await api.fetchAllPaymentReportsForAdmin();
        callbacks.onPaymentReportsUpdate?.(reports);
      } catch (error) {
        console.error('Error en polling de payment reports:', error);
        callbacks.onError?.(error as Error);
      }
    }, intervalMs);
    intervals.push(paymentInterval);

    // Polling para draw results
    const drawInterval = setInterval(async () => {
      try {
        const results = await api.fetchDrawResults();
        callbacks.onDrawResultsUpdate?.(results);
      } catch (error) {
        console.error('Error en polling de draw results:', error);
        callbacks.onError?.(error as Error);
      }
    }, intervalMs);
    intervals.push(drawInterval);

    // Polling para support conversations
    const supportInterval = setInterval(async () => {
      try {
        const conversations = await api.fetchAllSupportConversationsForAdmin();
        callbacks.onSupportConversationsUpdate?.(conversations);
      } catch (error) {
        console.error('Error en polling de support conversations:', error);
        callbacks.onError?.(error as Error);
      }
    }, intervalMs);
    intervals.push(supportInterval);
  } else {
    // Para clientes, polling de sus conversaciones de soporte
    const supportInterval = setInterval(async () => {
      try {
        const conversations = await api.fetchMySupportConversations();
        callbacks.onSupportConversationsUpdate?.(conversations);
      } catch (error) {
        console.error('Error en polling de support conversations:', error);
        callbacks.onError?.(error as Error);
      }
    }, intervalMs);
    intervals.push(supportInterval);
  }

  // Retornar función para limpiar todos los intervals
  return () => {
    intervals.forEach((interval) => clearInterval(interval));
  };
}
