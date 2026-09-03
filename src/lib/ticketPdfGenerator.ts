import html2canvas from 'html2canvas';
import { Ticket } from '../types';

// Tailwind CSS v4 genera los colores usando funciones modernas de CSS
// (oklch(), color-mix(), etc.) — por ejemplo cualquier utilidad con
// opacidad como "bg-slate-300/70" o los degradados "bg-gradient-to-br".
// html2canvas (aún en 2026, v1.4.1) NO sabe interpretar esas funciones y
// lanza un error al calcular los colores computados, lo que provocaba el
// mensaje "Error al generar la imagen del boleto" en TODOS los
// dispositivos (no solo iOS). Antes de capturar, convertimos esos colores
// a rgb()/rgba() usando el propio motor de Canvas 2D (que sí entiende
// oklch/color-mix), sin alterar el diseño visible.
const MODERN_COLOR_FUNCTIONS = ['color-mix', 'oklch', 'oklab', 'lch', 'lab', 'color'];

function resolveColorExpression(expr: string, ctx: CanvasRenderingContext2D): string {
  try {
    ctx.fillStyle = '#000000';
    ctx.fillStyle = expr;
    return ctx.fillStyle;
  } catch {
    return expr;
  }
}

/** Reemplaza cada función de color (respetando paréntesis anidados, ej.
 * color-mix(in oklab, oklch(...) 70%, transparent)) por su equivalente rgb. */
function replaceModernColorFunctions(value: string, ctx: CanvasRenderingContext2D): string {
  let result = '';
  let i = 0;
  while (i < value.length) {
    const name = MODERN_COLOR_FUNCTIONS.find((fn) => value.startsWith(`${fn}(`, i));
    if (name) {
      const start = i;
      let depth = 0;
      let j = i + name.length;
      for (; j < value.length; j++) {
        if (value[j] === '(') depth++;
        else if (value[j] === ')') {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
      }
      result += resolveColorExpression(value.slice(start, j), ctx);
      i = j;
    } else {
      result += value[i];
      i++;
    }
  }
  return result;
}

const COLOR_PROPS: (keyof CSSStyleDeclaration)[] = [
  'color',
  'backgroundColor',
  'borderTopColor',
  'borderRightColor',
  'borderBottomColor',
  'borderLeftColor',
  'outlineColor',
  'textDecorationColor',
];

/** Recorre el nodo clonado (usado internamente por html2canvas al capturar)
 * y sustituye cualquier color moderno por su equivalente rgb/rgba en línea. */
function sanitizeModernColorsForCapture(root: HTMLElement, doc: Document) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const view = doc.defaultView ?? window;
  const elements: HTMLElement[] = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  elements.forEach((el) => {
    const computed = view.getComputedStyle(el);

    COLOR_PROPS.forEach((prop) => {
      const value = computed[prop] as unknown as string;
      if (value && MODERN_COLOR_FUNCTIONS.some((fn) => value.includes(`${fn}(`))) {
        (el.style as any)[prop] = replaceModernColorFunctions(value, ctx);
      }
    });

    const backgroundImage = computed.backgroundImage;
    if (backgroundImage && backgroundImage !== 'none' && MODERN_COLOR_FUNCTIONS.some((fn) => backgroundImage.includes(`${fn}(`))) {
      el.style.backgroundImage = replaceModernColorFunctions(backgroundImage, ctx);
    }

    const boxShadow = computed.boxShadow;
    if (boxShadow && boxShadow !== 'none' && MODERN_COLOR_FUNCTIONS.some((fn) => boxShadow.includes(`${fn}(`))) {
      el.style.boxShadow = replaceModernColorFunctions(boxShadow, ctx);
    }
  });
}

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
      onclone: (clonedDoc, clonedElement) => {
        sanitizeModernColorsForCapture(clonedElement, clonedDoc);
      },
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
