/**
 * Setup inicial do Sentry. Desligado por padrão.
 * Para ativar: defina PUBLIC_SENTRY_DSN em .env e rode `init()` no
 * hook client-side `src/hooks.client.ts`.
 */
import * as Sentry from '@sentry/sveltekit';

export function initSentry(dsn?: string): void {
	if (!dsn) return;
	Sentry.init({
		dsn,
		tracesSampleRate: 0.1,
		// Local-first: nunca enviar payloads de treino (PII do usuário).
		beforeSend(event) {
			if (event.request) delete event.request.data;
			return event;
		}
	});
}
