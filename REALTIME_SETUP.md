# Configuración de Actualizaciones en Tiempo Real

## ✅ Cambios Realizados

Se han implementado **suscripciones en tiempo real** y **polling automático** para resolver los problemas de:
- Actualizaciones lentas (2-3 minutos)
- Necesidad de recargar página constantemente
- Pérdida de sesión al recargar en Vercel

### Archivos modificados:
1. **`src/lib/supabaseClient.ts`** - Configuración mejorada de Supabase con:
   - localStorage personalizado para persistencia de sesión
   - Parámetros de Realtime optimizados

2. **`src/lib/realtimeSubscriptions.ts`** (NUEVO) - Gestión completa de:
   - Suscripciones WebSocket en tiempo real
   - Polling automático como fallback

3. **`src/App.tsx`** - Integración de suscripciones:
   - Carga de suscripciones al iniciar
   - Actualizaciones automáticas de estado
   - Mejor manejo de autenticación

---

## 🔧 Requisitos en Supabase

Para que funcionen las **suscripciones en tiempo real**, debes habilitar Realtime en Supabase:

### 1. **Habilitar Realtime en las tablas**

Accede al [panel de Supabase](https://app.supabase.com/) y:

1. Ve a **Editor SQL**
2. Ejecuta este SQL para habilitar Realtime en las tablas principales:

```sql
-- Habilitar Realtime en tablas (NO incluir raffle_stats, es una VIEW)
ALTER PUBLICATION supabase_realtime ADD TABLE raffles;
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_reports;
ALTER PUBLICATION supabase_realtime ADD TABLE draw_results;
ALTER PUBLICATION supabase_realtime ADD TABLE support_conversations;
```

**NOTA**: Si algunas tablas no existen, omítelas. El SQL no lanzará error si intentas agregar una tabla que ya está en Realtime.

### 2. **Verificar configuración de Realtime**

- Ve a **Database** → **Publications**
- Verifica que `supabase_realtime` incluya las tablas listadas arriba
- Si no aparecen, agrégalas manualmente

### 3. **Configuración de RLS (Row Level Security)**

Asegúrate que tus políticas RLS permitan:
- Lecturas públicas para raffles activas
- Acceso personal a tickets, mensajes de soporte, etc.

Ejemplo:
```sql
-- Raffles: Lectura pública si status = 'active'
CREATE POLICY "Read active raffles" ON raffles 
  FOR SELECT 
  USING (status = 'active' OR auth.uid()::text = user_id);

-- Tickets: Cada usuario ve sus propios tickets
CREATE POLICY "Users see their tickets" ON tickets 
  FOR SELECT 
  USING (user_id = auth.uid());
```

---

## 🚀 Cómo Funciona Ahora

### Inicio de sesión (Cliente)
```
1. Usuario ingresa email/contraseña
2. ✅ Sesión se guarda en localStorage (persistente)
3. ✅ Datos se cargan desde Supabase
4. ✅ Suscripción Realtime detecta cambios en tiempo real
5. ✅ Polling automático cada 30 segundos como fallback
```

**Resultado**: Al recargar la página en Vercel, la sesión se recupera automáticamente desde localStorage.

### Actualizaciones en tiempo real
```
Cuando algo cambia en la base de datos:
1. ✅ Realtime WebSocket notifica al frontend (< 1 segundo)
2. ✅ Estado se actualiza automáticamente
3. ✅ No es necesario recargar la página

Fallback (si WebSocket no funciona):
- Polling cada 30 segundos descarga datos frescos
- Los cambios se ven en máximo 30 segundos
```

### Ejemplos de actualizaciones automáticas:
- ✅ Cuando admin crea una nueva rifa → Clientes la ven al instante
- ✅ Cuando se verifica un pago → Estado cambia sin recargar
- ✅ Nuevos boletos reservados → Contador se actualiza en tiempo real
- ✅ Respuestas de soporte → Aparecen al instante en el chat

---

## 📱 Comportamiento en Vercel

### Antes (Problemas):
```
❌ Sesión perdida al recargar
❌ Tenías que volver a ingresar email
❌ Cambios tardaban 2-3 minutos
❌ Tenías que recargar página manualmente
```

### Ahora (Solucionado):
```
✅ Sesión persiste automáticamente en localStorage
✅ Al recargar, sesión se recupera instantáneamente
✅ Cambios se ven en < 1 segundo (Realtime)
✅ Fallback de polling cada 30 segundos
✅ No necesitas recargar la página
```

---

## 🔍 Verificar que funciona

1. **Abre la consola** (F12 → Console)
2. **Busca mensajes de Realtime**:
   - Deberías ver logs de suscripciones
   - Verifica que no haya errores de conexión

3. **Prueba el flujo**:
   - Admin: Crea una nueva rifa
   - Clientes: Verán la rifa aparecer al instante sin recargar
   - Admin: Verifica un pago
   - Cliente: Verá su boleto confirmado al instante

4. **Si los cambios tardan 30 segundos**:
   - Realtime WebSocket no funciona
   - Polling fallback está funcionando correctamente
   - Verifica que Realtime esté habilitado en Supabase

---

## 🛠️ Troubleshooting

### Problema: Sesión se pierde al recargar en Vercel
**Solución**: 
- Limpiar caché del navegador (Ctrl+Shift+Del)
- Verificar que localStorage no está deshabilitado
- Comprobar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY están definidas

### Problema: Cambios tardan 30 segundos o más
**Solución**:
1. Verificar Realtime está habilitado en Supabase
2. Ver consola (F12) para errores de WebSocket
3. Comprobar firewall/proxy no bloquea WebSocket
4. Aumentar intervalo de polling en `realtimeSubscriptions.ts` si es necesario

### Problema: Realtime no se conecta
**Solución**:
1. Ir a Supabase → Database → Publications
2. Verificar que `supabase_realtime` incluye tus tablas
3. Re-ejecutar el SQL de configuración
4. Recargar el navegador

### Problema: Alto uso de datos/battery
**Solución**:
- Aumentar `intervalMs` en `startPollingFallback()` (línea ~27 en App.tsx)
- Cambiar de 30000ms a 60000ms (1 minuto) si necesitas ahorrar datos

---

## 📊 Monitoreo

En la consola del navegador:
```javascript
// Ver historial de cambios
console.log('Raffles actualizadas:', raffles);
console.log('Tickets actualizadas:', tickets);

// Verificar conexión Realtime
supabase.getChannels() // Si no está vacío, hay canales activos
```

---

## 🎯 Próximos pasos

1. ✅ Ejecutar SQL de Realtime en Supabase
2. ✅ Desplegar en Vercel (git push)
3. ✅ Probar flujo completo
4. ✅ Monitorear console.log en navegador

**¡Listo!** Ahora tu plataforma debería tener actualizaciones en tiempo real y sesiones persistentes. 🚀
