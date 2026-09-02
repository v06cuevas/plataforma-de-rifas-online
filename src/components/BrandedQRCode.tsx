import React, { useRef, useEffect, useState } from 'react';
import { Ticket } from '../types';

interface BrandedQRCodeProps {
  ticket: Ticket;
  size?: number;
  logoSize?: number;
  innerRef?: React.Ref<HTMLDivElement>;
}

export const BrandedQRCode: React.FC<BrandedQRCodeProps> = ({
  ticket,
  size = 300,
  logoSize = 80,
  innerRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const qrPayload = 'https://rifascaribe.vercel.app/';

  useEffect(() => {
    // Generar QR desde la API externa
    const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=3&data=${encodeURIComponent(
      qrPayload
    )}`;
    setQrDataUrl(apiUrl);
  }, [qrPayload, size]);

  useEffect(() => {
    if (!qrDataUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Cargar la imagen del QR
    const qrImage = new Image();
    qrImage.onload = () => {
      // Dibujar el QR
      ctx.drawImage(qrImage, 0, 0, size, size);

      const centerX = size / 2;
      const centerY = size / 2;

      // Dibujar pequeño círculo azul con logo (sin fondo blanco)
      const logoBgRadius = logoSize / 3;
      ctx.fillStyle = '#0F2137';
      ctx.beginPath();
      ctx.arc(centerX, centerY, logoBgRadius, 0, Math.PI * 2);
      ctx.fill();

      // Cargar y dibujar el favicon en el centro (pequeño)
      const logoImage = new Image();
      logoImage.onload = () => {
        ctx.save();
        ctx.globalAlpha = 0.95;
        const logoDisplaySize = logoSize * 0.5;
        ctx.drawImage(
          logoImage,
          centerX - logoDisplaySize / 2,
          centerY - logoDisplaySize / 2,
          logoDisplaySize,
          logoDisplaySize
        );
        ctx.restore();
      };
      logoImage.crossOrigin = 'anonymous';
      logoImage.src = '/favicon.svg';
    };
    qrImage.src = qrDataUrl;
  }, [qrDataUrl, size, logoSize]);

  return (
    <div ref={innerRef || containerRef} className="flex justify-center">
      {/* Canvas con QR + logo */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg border-2 border-slate-600 bg-white shadow-md"
        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
      />
    </div>
  );
};
