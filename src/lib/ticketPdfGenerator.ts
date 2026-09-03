import html2canvas from 'html2canvas';
import { Ticket } from '../types';

/**
 * Descarga el boleto EXACTAMENTE con el mismo diseño que el usuario ve en
 * pantalla (mismos colores, layout, QR, badges, etc.).
 *
 * Antes esta función construía un HTML/diseño alterno desde cero (más
 * simple, tipo "certificado"), por lo que la imagen descargada nunca
 * coincidía con la tarjeta real del boleto. Ahora se captura directamente
 * el nodo del DOM de la tarjeta (`ticketElement`), así que el resultado es
 * siempre idéntico a lo que se ve en la app.
 *
 * Cualquier elemento hijo con el atributo `data-html2canvas-ignore="true"`
 * (por ejemplo los botones de acción) se excluye automáticamente de la
 * captura para que la imagen final quede limpia.
 */
export async function generateTicketImage(
  ticket: Ticket,
  ticketElement: HTMLElement
): Promise<void> {
  try {
    const canvas = await html2canvas(ticketElement, {
      scale: 3, // Alta resolución para iOS, Android y PC
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: false,
      ignoreElements: (el) => el.getAttribute('data-html2canvas-ignore') === 'true',
    });

    const fileName = `boleto-${ticket.ticketNumber}.png`;

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png', 1)
    );

    if (!blob) {
      throw new Error('No se pudo generar la imagen del boleto');
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // 1) Web Share API nativo (iOS/Android modernos): abre el share sheet
    //    real del sistema con la imagen ya adjunta, permitiendo "Guardar
    //    imagen" con un solo toque, sin salir de la app.
    if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function') {
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: `Boleto #${ticket.ticketNumber}`,
          });
          return;
        }
      } catch (shareError) {
        // Si el usuario cancela el share sheet no es un error real.
        if ((shareError as Error)?.name === 'AbortError') return;
        // Si falla por otro motivo, seguimos con el fallback de abajo.
      }
    }

    if (isIOS) {
      // Fallback iOS sin Web Share API: abrir en pestaña nueva
      // (mantener presionado + Guardar en Fotos).
      const dataUrl = canvas.toDataURL('image/png');
      const imgWindow = window.open();
      if (imgWindow) {
        imgWindow.document.write(
          `<img src="${dataUrl}" style="width: 100%; height: auto; margin: 0; padding: 0;" />`
        );
        imgWindow.document.title = fileName;
      } else {
        alert('No se pudo abrir la ventana. Por favor, habilita las ventanas emergentes.');
      }
      return;
    }

    // Android y PC: descarga directa del archivo.
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Error generando imagen del boleto:', error);
    alert('Error al generar la imagen del boleto. Intenta de nuevo.');
    throw error;
  }
}
