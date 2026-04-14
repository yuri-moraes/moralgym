import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

/**
 * Configuração Vite para o MoralGym.
 *
 * Estratégia PWA:
 *  - `registerType: 'autoUpdate'` → quando um novo SW é instalado, ele
 *    assume imediatamente a próxima navegação. O usuário não precisa clicar
 *    em nada para receber bugfixes.
 *  - `strategies: 'generateSW'` → deixamos o Workbox gerar o SW. Para um
 *    PWA com zero backend dinâmico, `injectManifest` seria overkill.
 *  - `navigateFallback: '/'` com `NavigationRoute` cobrindo TODA rota
 *    cliente, casando com o `fallback: 'index.html'` do adapter-static.
 *    Resultado: qualquer URL aberta offline cai na SPA, que então resolve
 *    a rota localmente via client-side routing.
 *  - Runtime caching: nenhuma origem externa é cacheada porque nenhuma
 *    origem externa é chamada — o app é Local-First estrito.
 *  - `globPatterns` abrange fonts, imagens e wasm no futuro, sem precisar
 *    mexer aqui. O limite de 5MB por arquivo é suficiente (o maior asset
 *    esperado é o runtime Svelte compilado, bem abaixo disso).
 */
export default defineConfig({
	plugins: [
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			strategies: 'generateSW',
			injectRegister: 'auto',

			// Ativa o SW em `npm run dev` para conseguirmos testar comportamento
			// offline sem precisar rodar `build && preview`.
			devOptions: {
				enabled: true,
				type: 'module',
				navigateFallback: '/'
			},

			manifest: {
				name: 'MoralGym',
				short_name: 'MoralGym',
				description:
					'Seu diário de treino. Offline, Local-First, sem ads, sem conta.',
				lang: 'pt-BR',
				dir: 'ltr',
				start_url: '/',
				scope: '/',
				display: 'standalone',
				orientation: 'portrait',
				// Paleta neutra/escura — coerente com ambiente de academia
				// (telas em contraste alto, economia de bateria em OLED).
				background_color: '#0B0B0D',
				theme_color: '#0B0B0D',
				categories: ['health', 'fitness', 'lifestyle', 'productivity'],
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/icons/icon-maskable-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},

			workbox: {
				// Ativos pré-cacheados na instalação do SW.
				globPatterns: [
					'client/**/*.{js,css,ico,png,svg,webp,woff,woff2}',
					'prerendered/**/*.html'
				],
				// SPA fallback: qualquer navegação offline cai no index.html
				// gerado pelo adapter-static, que carrega o router do SvelteKit.
				navigateFallback: '/',
				navigateFallbackAllowlist: [/^\/(?!api\/).*/],
				// Local-First: zero runtime caching de origens externas.
				runtimeCaching: [],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				skipWaiting: true
			},

			kit: {
				// Respeita o `fallback` do adapter-static (`index.html`).
				trailingSlash: 'never'
			}
		})
	],

	// `fake-indexeddb` e `jsdom` para o Vitest — testes de domínio/adapters
	// rodam em Node puro, sem precisar de browser.
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: ['tests/setup.ts'],
		include: ['tests/**/*.{test,spec}.ts'],
		coverage: {
			reporter: ['text', 'html', 'lcov'],
			include: ['src/core/**/*.ts', 'src/adapters/**/*.ts'],
			exclude: ['src/**/*.d.ts', 'src/workers/**']
		}
	},

	// Workers: bundled como ES modules (precisam de `type: 'module'` no
	// construtor). Casa com `new Worker(new URL(...), { type: 'module' })`.
	worker: {
		format: 'es'
	}
});
