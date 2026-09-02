import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Le dice al navegador que empiece a resolver DNS / negociar TLS con
// Supabase ANTES de que el JS termine de arrancar y de que se dispare el
// primer fetch de datos. En una SPA como esta, ese primer fetch (las rifas)
// es lo que determina cuándo puede aparecer el elemento LCP, así que ganar
// ese tiempo de conexión cuenta directamente para el LCP.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
if (supabaseUrl) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = supabaseUrl;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
