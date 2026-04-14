import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * MoralGym — PWA Local-First.
 *
 * Estratégia de build: SSG puro com fallback SPA.
 *   - `adapter-static` gera artefatos 100% estáticos (pode hospedar em qualquer
 *     CDN / GitHub Pages / Netlify free-tier).
 *   - `fallback: 'index.html'` instrui o adapter a emitir um index.html que faz
 *     client-side routing para qualquer rota não pré-renderizada. É o que
 *     permite deep-links funcionarem offline depois do primeiro load.
 *   - SSR é desligado globalmente (ver `src/routes/+layout.ts`) porque o app
 *     depende de APIs de browser: IndexedDB, Web Worker, Notification, Canvas.
 *   - O service worker do `vite-plugin-pwa` faz precache do build (incluindo
 *     `index.html`) e serve navegação offline via `NavigationRoute`.
 *
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: true,
			strict: true
		}),

		// Pure SPA: nada é prerenderizado. Toda navegação acontece client-side.
		prerender: { entries: [] },

		alias: {
			$core: 'src/core',
			$adapters: 'src/adapters',
			$ui: 'src/ui',
			$workers: 'src/workers'
		},

		serviceWorker: {
			// O service worker do PWA é controlado pelo vite-plugin-pwa,
			// não pelo auto-SW do SvelteKit. Evita conflito de registros.
			register: false
		}
	}
};

export default config;
