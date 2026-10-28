import {StrictMode, Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {supabaseConfig} from './lib/supabaseConfig';
import './index.css';

// Le dice al navegador que empiece a resolver DNS / negociar TLS con
// Supabase ANTES de que el JS termine de arrancar y de que se dispare el
// primer fetch de datos. En una SPA como esta, ese primer fetch (las rifas)
// es lo que determina cuándo puede aparecer el elemento LCP, así que ganar
// ese tiempo de conexión cuenta directamente para el LCP.
const App = lazy(() => import('./App.tsx'));
const supabaseUrl = !supabaseConfig.error && supabaseConfig.url;
if (supabaseUrl) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = supabaseUrl;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabaseConfig.error ? (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <section className="max-w-xl bg-white rounded-2xl border border-slate-200 p-8 space-y-4 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Configura tu conexión a Supabase</h1>
          <p className="text-slate-700">{supabaseConfig.error}</p>
          <p className="text-slate-600">Guarda los valores y reinicia el servidor con <code>npm run dev</code>. Si usas Vercel, configura las variables en el proyecto y vuelve a desplegar.</p>
          <p className="text-slate-600">El orden de los archivos SQL está explicado en README.md.</p>
        </section>
      </main>
    ) : (
      <Suspense fallback={<p className="p-8 text-center">Cargando plataforma…</p>}>
        <App />
      </Suspense>
    )}
  </StrictMode>,
);
