# ✅ CHECKLIST DE VERIFICACIÓN - Actualizaciones en Tiempo Real

## Verificación Local (Antes de desplegar)

- [ ] He leído `INICIO_RAPIDO.md`
- [ ] Los archivos se compilaron sin errores (`npm run lint` pasó)
- [ ] Revisé los cambios en `src/App.tsx`
- [ ] Revisé los cambios en `src/lib/supabaseClient.ts`
- [ ] Revisé el nuevo archivo `src/lib/realtimeSubscriptions.ts`

---

## Verificación en Supabase

- [ ] Accedí a https://app.supabase.com/
- [ ] Fui a SQL Editor
- [ ] Ejecuté el SQL de Realtime (PASO 1 en INICIO_RAPIDO.md)
- [ ] El SQL mostró "Success"
- [ ] Verifiqué en Database → Publications que las tablas están listadas

Tablas que deben estar en `supabase_realtime`:
- [ ] raffles
- [ ] tickets
- [ ] payment_reports
- [ ] draw_results
- [ ] support_conversations

**Nota**: `raffle_stats` es una VIEW (no una tabla), así que NO debe agregarse.

---

## Despliegue en Vercel

- [ ] Ejecuté `git add .`
- [ ] Ejecuté `git commit -m "..."`
- [ ] Ejecuté `git push origin main`
- [ ] Vercel inició el despliegue automáticamente
- [ ] Espero 2-3 minutos a que termine el despliegue
- [ ] Accedí a mi app en Vercel después del despliegue

---

## Pruebas Funcionales

### Test 1: Sesión Persistente
- [ ] Inicia sesión como cliente
- [ ] Recarga la página (F5)
- [ ] La sesión se mantiene (no pide correo de nuevo)
- [ ] Verifica DevTools → Application → localStorage → "raffle_auth_session" existe

### Test 2: Admin - Cambios en Tiempo Real
- [ ] Abre la app en 2 pestañas: Admin (pestaña 1) + Cliente (pestaña 2)
- [ ] Admin crea una nueva rifa
- [ ] Cliente: Sin recargar, verifica que la nueva rifa aparece en < 5 segundos
- [ ] Admin: Verifica el estado de un pago
- [ ] Cliente: Sin recargar, verifica que el estado se actualiza en < 5 segundos

### Test 3: Cliente - Actualizaciones
- [ ] Inicia sesión como cliente
- [ ] Ve a la sección "Mis Boletos"
- [ ] Admin: Verifica uno de tus pagos
- [ ] Cliente: Sin recargar, verifica que el boleto aparece como confirmado en < 5 segundos

### Test 4: Contador de Boletos
- [ ] Cliente A: Ve una rifa con X boletos disponibles
- [ ] Cliente B: Compra Y boletos
- [ ] Cliente A: Sin recargar, verifica que el contador cambió a (X-Y) en < 5 segundos

### Test 5: Respuestas de Soporte
- [ ] Cliente: Envía un mensaje de soporte
- [ ] Admin: Responde el mensaje
- [ ] Cliente: Sin recargar, verifica que la respuesta aparece en < 5 segundos

---

## Verificación en DevTools

Abre DevTools (F12) → Console y verifica:

- [ ] No hay errores rojos
- [ ] Ves logs de Realtime subscriptions
- [ ] Ves logs de polling iniciado
- [ ] No ves errores como "WebSocket refused connection"

Ejemplo de logs esperados:
```
✅ Realtime subscription established for raffles
✅ Polling fallback iniciado cada 30000ms
```

---

## Monitoreo en Producción

Después de desplegar, en los próximos 24 horas:

- [ ] Revisa DevTools Console regularmente (no debe haber errores)
- [ ] Verifica que cambios se reflejan en tiempo real
- [ ] Si ves cambios lentos, aumenta el logging y contacta a soporte

---

## Si Algo Falla

Revisa esta matriz de troubleshooting:

| Síntoma | Causa Probable | Solución |
|---------|---|---|
| Sesión se pierde | localStorage deshabilitado | Limpiar caché, verificar privacidad |
| Cambios tardan 30s | Realtime no activado | Ejecutar SQL del PASO 1 |
| Cambios nunca llegan | RLS bloqueando | Revisar políticas de RLS en Supabase |
| Console muestra errores | Build incompleto | `npm install && npm run build` |
| App no carga | Env vars faltando | Verificar VITE_SUPABASE_URL en .env |

---

## Documento de Referencia Rápida

Si necesitas consultas rápidas:

1. **Instrucciones paso a paso**: `INICIO_RAPIDO.md`
2. **Guía técnica completa**: `REALTIME_SETUP.md`
3. **Resumen de cambios**: `CAMBIOS_REALIZADOS.md`
4. **Este checklist**: `VERIFICACION.md` (este archivo)

---

## Notas

- Si Realtime no funciona, Polling automático lo cubre cada 30 segundos
- No es necesario hacer nada especial en la aplicación - todo funciona automáticamente
- Los cambios son totalmente backward compatible
- Tu código de componentes no necesita cambiar

---

**Última verificación**: ¿Completaste todos los checkboxes? 

Si respondiste SÍ a todo, ¡tu aplicación está lista con actualizaciones en tiempo real! 🎉

Si hay algo incompleto, revisa los documentos de referencia o el troubleshooting.
