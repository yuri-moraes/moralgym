// SPA puro — toda lógica depende de APIs de browser (IndexedDB, Worker...).
// SSR/prerender desligados; o fallback index.html cuida do roteamento client-side.
export const ssr = false;
export const prerender = false;
export const trailingSlash = 'never';
