import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * MoralGym — PWA Local-First.
 *
 * Estratégia de build: SPA com Vercel adapter.
 *   - `adapter-vercel` é otimizado para a plataforma Vercel, evita conflitos
 *     de configuração que causam página branca com `adapter-static`.
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
		adapter: adapter(),

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
