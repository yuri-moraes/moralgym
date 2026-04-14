// Estilos globais + diretivas Tailwind. Importado aqui (e não no +layout.svelte)
// para manter o componente de layout focado em markup; o Vite garante que o CSS
// seja injetado no <head> do mesmo jeito.
import '../app.css';

// SPA puro — toda lógica depende de APIs de browser (IndexedDB, Worker...).
// SSR/prerender desligados; o fallback index.html cuida do roteamento client-side.
export const ssr = false;
export const prerender = false;
export const trailingSlash = 'never';
