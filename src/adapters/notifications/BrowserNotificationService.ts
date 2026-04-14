import type {
	NotificationPayload,
	NotificationService,
	PermissionStatus
} from '../../core/application/ports/NotificationService';

/**
 * Adapter que concretiza `NotificationService` sobre a Notification API
 * e `navigator.vibrate` (quando disponível).
 *
 * Regras de robustez:
 *  - Toda ausência de suporte (navegador antigo, contexto inseguro, iOS sem
 *    PWA instalado) resolve-se em `denied`/no-op. Nunca estouramos erro —
 *    falhar a notificação jamais pode interromper o fluxo de treino.
 *  - A permissão é sempre consultada "ao vivo" via `Notification.permission`,
 *    já que o usuário pode alterá-la nas configurações do sistema sem avisar.
 *  - `vibrate` é disparado separadamente: alguns navegadores (Firefox Android)
 *    só vibram via `navigator.vibrate` mesmo quando a notificação é exibida.
 */
export class BrowserNotificationService implements NotificationService {
	private get supported(): boolean {
		return typeof Notification !== 'undefined';
	}

	getPermission(): PermissionStatus {
		if (!this.supported) return 'denied';
		return Notification.permission as PermissionStatus;
	}

	async requestPermission(): Promise<PermissionStatus> {
		if (!this.supported) return 'denied';
		if (Notification.permission === 'granted') return 'granted';
		if (Notification.permission === 'denied') return 'denied';

		try {
			const result = await Notification.requestPermission();
			return result as PermissionStatus;
		} catch {
			// Safari < 16 lança em contextos não-user-gesture.
			return 'denied';
		}
	}

	async notify(payload: NotificationPayload): Promise<void> {
		this.tryVibrate(payload.vibrate);

		if (!this.supported || Notification.permission !== 'granted') {
			return;
		}

		try {
			// `vibrate` via options também funciona em navegadores compatíveis
			// (Chrome Android); a chamada explícita acima cobre os demais.
			new Notification(payload.title, {
				body: payload.body,
				silent: false,
				tag: 'moralgym-rest-timer', // coalesce: só uma notificação viva por vez
				vibrate: payload.vibrate as number[] | undefined
			} as NotificationOptions);
		} catch {
			// iOS Safari exige Notification via ServiceWorkerRegistration.showNotification.
			// Swallow: a UI ainda mostra o fim do timer; a notificação é um extra.
		}
	}

	private tryVibrate(pattern: readonly number[] | undefined): void {
		if (!pattern || pattern.length === 0) return;
		if (typeof navigator === 'undefined') return;
		const vibrate = (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean })
			.vibrate;
		if (typeof vibrate !== 'function') return;
		try {
			vibrate.call(navigator, [...pattern]);
		} catch {
			// Ignora: vibrate pode ser bloqueado por política do navegador.
		}
	}
}
