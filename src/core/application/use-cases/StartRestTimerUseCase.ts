import type { NotificationService } from '../ports/NotificationService';
import type { RestTimer } from '../ports/RestTimer';

export interface StartRestTimerInput {
	readonly totalSeconds: number;
	readonly exerciseId?: string;
	readonly exerciseName?: string;
}

interface Dependencies {
	readonly restTimer: RestTimer;
	readonly notifications: NotificationService;
}

/**
 * Orquestra o cronômetro de descanso: inicia o Worker e agenda
 * exatamente UMA notificação quando o tempo zerar. Evita duplicar
 * notificações se o use case for chamado em sequência.
 */
export class StartRestTimerUseCase {
	private unsubscribe: (() => void) | null = null;

	constructor(private readonly deps: Dependencies) {}

	execute(input: StartRestTimerInput): void {
		if (input.totalSeconds <= 0) {
			throw new Error('totalSeconds deve ser > 0');
		}

		// Cancela subscrição anterior — apenas o último start conta.
		this.unsubscribe?.();

		const handler = () => {
			this.deps.notifications
				.notify({
					title: 'Descanso finalizado',
					body: input.exerciseName
						? `Próxima série: ${input.exerciseName}`
						: 'Hora da próxima série.',
					vibrate: [200, 100, 200]
				})
				.catch(() => {
					// Falha de notificação não deve quebrar o fluxo de treino.
				});
			this.unsubscribe?.();
			this.unsubscribe = null;
		};

		this.unsubscribe = this.deps.restTimer.onComplete(handler);
		this.deps.restTimer.start(input.totalSeconds);
	}

	cancel(): void {
		this.unsubscribe?.();
		this.unsubscribe = null;
		this.deps.restTimer.stop();
	}
}
