import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Ticket } from '../types';

// Función para generar QR con logo en el centro
async function generateBrandedQRDataUrl(ticket: Ticket, size: number = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const qrPayload = `https://rifascaribe.vercel.app/#my-tickets?ticket=${ticket.id}`;

      // Crear elemento QR temporal
      const qrElement = document.createElement('div');
      qrElement.style.position = 'fixed';
      qrElement.style.left = '-9999px';
      document.body.appendChild(qrElement);

      // Renderizar QR (simplificado - usaremos canvas directamente)
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        document.body.removeChild(qrElement);
        reject(new Error('No context 2d'));
        return;
      }

      // Generar QR usando la API externa para obtener imagen
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=3&data=${encodeURIComponent(
        qrPayload
      )}`;

      const qrImage = new Image();
      qrImage.onload = () => {
        // Dibujar QR base
        ctx.drawImage(qrImage, 0, 0, size, size);

        const centerX = size / 2;
        const centerY = size / 2;

        // Pequeño círculo azul con logo (sin fondo blanco)
        const smallLogoRadius = 40;
        ctx.fillStyle = '#0F2137';
        ctx.beginPath();
        ctx.arc(centerX, centerY, smallLogoRadius, 0, Math.PI * 2);
        ctx.fill();

        // Cargar y dibujar el favicon en el centro (pequeño)
        const logoImage = new Image();
        logoImage.onload = () => {
          ctx.save();
          ctx.globalAlpha = 0.95;
          const logoDisplaySize = smallLogoRadius * 1.6;
          ctx.drawImage(
            logoImage,
            centerX - logoDisplaySize / 2,
            centerY - logoDisplaySize / 2,
            logoDisplaySize,
            logoDisplaySize
          );
          ctx.restore();
          document.body.removeChild(qrElement);
          resolve(canvas.toDataURL('image/png'));
        };
        logoImage.crossOrigin = 'anonymous';
        logoImage.src = '/favicon.svg';
      };

      qrImage.onerror = () => {
        document.body.removeChild(qrElement);
        reject(new Error('Failed to load QR image'));
      };

      qrImage.crossOrigin = 'anonymous';
      qrImage.src = qrImageUrl;
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateTicketImage(ticket: Ticket): Promise<void> {
  try {
    // Generar QR con logo
    const qrDataUrl = await generateBrandedQRDataUrl(ticket, 400);

    // Crear elemento DOM temporal para capturar el certificado
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.padding = '40px 30px';
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';

    // Estructura HTML del certificado
    const htmlContent = `
      <div style="max-width: 800px; margin: 0 auto; padding: 40px 30px; border: 3px solid #0f172a; border-radius: 16px; background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);">
        
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #0f172a;">
          <div style="font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: 2px;">
            🎟️ CERTIFICADO DE PARTICIPACIÓN OFICIAL
          </div>
          <div style="font-size: 12px; color: #64748b; margin-top: 8px; letter-spacing: 1px;">
            PLATAFORMA DE RIFAS EN LÍNEA
          </div>
        </div>

        <!-- Main Content -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; align-items: center;">
          
          <!-- Left: Raffle Info -->
          <div>
            <div style="margin-bottom: 20px;">
              <div style="font-size: 11px; color: #64748b; font-weight: 900; letter-spacing: 1px; margin-bottom: 4px;">
                RIFA PARTICIPANTE
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #0f172a; line-height: 1.3;">
                ${ticket.raffleTitle}
              </div>
            </div>

            <div style="background: #f1f5f9; padding: 15px; border-radius: 12px; border-left: 4px solid #10b981;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
                <span style="color: #64748b; font-weight: bold;">Número de Boleto:</span>
                <span style="font-family: monospace; font-weight: 900; color: #0f172a; font-size: 14px;">#${ticket.ticketNumber}</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
                <span style="color: #64748b; font-weight: bold;">Estado:</span>
                <span style="font-weight: 900; color: ${ticket.status === 'winner' ? '#ca8a04' : ticket.status === 'confirmed' ? '#10b981' : '#f59e0b'};">
                  ${ticket.status === 'pending_payment' ? '⏳ PENDIENTE' : ticket.status === 'confirmed' ? '✓ CONFIRMADO' : ticket.status === 'winner' ? '🏆 GANADOR' : '✗ CANCELADO'}
                </span>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
                <span style="color: #64748b; font-weight: bold;">Monto Pagado:</span>
                <span style="font-family: monospace; font-weight: bold; color: #0f172a;">
                  ${ticket.isBonusTicket ? 'GRATIS' : `RD$ ${ticket.pricePaid.toLocaleString()}`}
                </span>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
                <span style="color: #64748b; font-weight: bold;">Banco:</span>
                <span style="font-weight: bold; color: #0f172a;">${ticket.bankUsed}</span>
              </div>

              <div style="display: flex; justify-content: space-between; font-size: 11px;">
                <span style="color: #64748b; font-weight: bold;">Referencia:</span>
                <span style="font-family: monospace; font-weight: bold; color: #0f172a;">${ticket.referenceNumber}</span>
              </div>
            </div>
          </div>

          <!-- Right: QR Code -->
          <div style="text-align: center;">
            <div style="background: white; padding: 25px; border-radius: 16px; border: 3px solid #0f172a; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <img src="${qrDataUrl}" alt="Código QR" style="width: 280px; height: 280px; object-fit: contain; border-radius: 8px;">
            </div>
            <div style="font-size: 12px; color: #0f172a; margin-top: 16px; font-weight: 900; letter-spacing: 0.5px;">
              📱 Escanea para acceder a tu boleto
            </div>
            <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
              (Lleva a https://rifascaribe.vercel.app/)
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div style="background: #ecfdf5; padding: 15px; border-radius: 12px; border: 2px solid #10b981; margin-bottom: 20px;">
          <div style="font-size: 12px; font-weight: bold; color: #047857; margin-bottom: 8px;">
            ✓ BOLETO SEGURO Y VERIFICADO
          </div>
          <div style="font-size: 11px; color: #047857; line-height: 1.6;">
            Este certificado es tu comprobante oficial de participación en la rifa. Guárdalo en un lugar seguro. 
            Escanea el código QR para acceder a la plataforma oficial. En caso de duda, contacta con nuestro equipo de soporte.
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; font-size: 10px; color: #94a3b8; padding-top: 15px; border-top: 1px solid #cbd5e1;">
          <div>Generado el: ${new Date().toLocaleDateString('es-DO')} a las ${new Date().toLocaleTimeString('es-DO')}</div>
          <div style="margin-top: 4px;">Documento válido - Descargado desde PLATAFORMA DE RIFAS EN LÍNEA</div>
        </div>
      </div>
    `;

    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Capturar el elemento como imagen PNG en máxima calidad
    const canvas = await html2canvas(container, {
      scale: 3, // Máxima calidad para iOS, Android y PC
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
    });

    // Convertir canvas a blob para mejor compatibilidad con móviles
    return new Promise<void>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          alert('Error al generar la imagen del boleto. Intenta de nuevo.');
          document.body.removeChild(container);
          resolve();
          return;
        }

        // Crear URL del blob
        const blobUrl = URL.createObjectURL(blob);
        
        // Detectar si es iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        if (isIOS) {
          // Para iOS: abrir en nueva ventana para que el usuario pueda guardar
          const newWindow = window.open();
          if (newWindow) {
            newWindow.document.body.innerHTML = `<img src="${blobUrl}" style="width: 100%; height: auto;" />`;
            newWindow.document.title = `boleto-${ticket.ticketNumber}.png`;
          }
        } else {
          // Para Android y PC: descargar directamente
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `boleto-${ticket.ticketNumber}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        
        // Limpiar recursos después de un pequeño retraso
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          document.body.removeChild(container);
          resolve();
        }, 100);
      }, 'image/png');
    });
  } catch (error) {
    console.error('Error generando imagen del boleto:', error);
    alert('Error al generar la imagen del boleto. Intenta de nuevo.');
  }
}
