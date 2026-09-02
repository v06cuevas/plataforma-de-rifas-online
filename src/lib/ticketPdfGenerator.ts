import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Ticket } from '../types';

export async function generateTicketPdf(ticket: Ticket): Promise<void> {
  try {
    // Crear elemento DOM temporal para capturar el certificado
    const container = document.createElement('div');
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20px';
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '-9999px';

    // Generar código QR
    const qrPayload = JSON.stringify({ 
      ticket: ticket.ticketNumber, 
      raffle: ticket.raffleId, 
      reference: ticket.referenceNumber 
    });
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(qrPayload)}`;

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
            <div style="background: white; padding: 20px; border-radius: 12px; border: 2px solid #0f172a; display: inline-block;">
              <img src="${qrImageUrl}" alt="Código QR" style="width: 200px; height: 200px; object-fit: contain;">
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 12px; font-weight: bold;">
              Escanea para verificar tu boleto
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
            El código QR contiene información verificable de tu boleto. En caso de duda, contacta con nuestro equipo de soporte.
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

    // Capturar el elemento como canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    // Crear PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Agregar imagen al PDF (permite múltiples páginas si es necesario)
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Descargar PDF
    pdf.save(`boleto-${ticket.ticketNumber}.pdf`);

    // Limpiar
    document.body.removeChild(container);
  } catch (error) {
    console.error('Error generando PDF:', error);
    alert('Error al generar el PDF. Intenta de nuevo.');
  }
}
