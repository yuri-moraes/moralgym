import type { RestTimer, RestTimerState } from '../ports/RestTimer';
import type { StoragePort } from '../ports/StoragePort';

export interface PersistRestTimerOutput {
	readonly persisted: boolean;
}

interface StoredRestTimerState {
	readonly remainingSeconds: number;
	readonly totalSeconds: number;
	readonly running: boolean;
	readonly paused: boolean;
	readonly savedAt: string;
}

interface Dependencies {
	readonly restTimer: RestTimer;
	readonly storage: StoragePort;
}

/**
 * Caso de uso para persistir e restaurar o estado do cronômetro de descanso
 * em localStorage, considerando o tempo decorrido durante a sessão.
 *
 * Comportamento:
 * - execute(): Serializa estado atual e salva em localStorage
 * - restoreState(): Recupera de localStorage, ajusta pelo tempo decorrido, restaura cronômetro
 */
export class PersistRestTimerUseCase {
	private static readonly STORAGE_KEY = 'moralgym:rest_timer:state';

	constructor(private readonly deps: Dependencies) {}

	/**
	 * Persiste o estado atual do cronômetro em localStorage.
	 * Retorna { persisted: false } se houver erro de armazenamento.
	 */
	async execute(): Promise<PersistRestTimerOutput> {
		try {
			const currentState = await this.deps.restTimer.getState();
			const toStore: StoredRestTimerState = {
				remainingSeconds: currentState.remainingSeconds,
				totalSeconds: currentState.totalSeconds,
				running: currentState.running,
				paused: currentState.paused,
				savedAt: new Date().toISOString()
			};
			await this.deps.storage.setItem(
				PersistRestTimerUseCase.STORAGE_KEY,
				JSON.stringify(toStore)
			);
			return { persisted: true };
		} catch (error) {
			// Falha de armazenamento não deve quebrar o fluxo de treino
			console.error('[PersistRestTimerUseCase] Erro ao persistir:', error);
			return { persisted: false };
		}
	}

	/**
	 * Restaura o estado do cronômetro a partir de localStorage.
	 * Calcula tempo decorrido desde salvamento e ajusta remainingSeconds.
	 * Se o timer estava rodando, recomeça automaticamente com tempo ajustado.
	 * Retorna null se não houver estado salvo.
	 */
	async restoreState(): Promise<RestTimerState | null> {
		try {
			const stored = await this.deps.storage.getItem(PersistRestTimerUseCase.STORAGE_KEY);
			if (!stored) {
				return null;
			}

			const parsed: StoredRestTimerState = JSON.parse(stored);
			const savedAt = new Date(parsed.savedAt).getTime();
			const now = Date.now();
			const elapsedMs = now - savedAt;
			const elapsedSeconds = Math.floor(elapsedMs / 1000);

			// Calcular remaining ajustado
			let adjustedRemaining = Math.max(0, parsed.remainingSeconds - elapsedSeconds);

			// Se estava rodando e ainda há tempo, restaurar cronômetro
			if (parsed.running && !parsed.paused && adjustedRemaining > 0) {
				await this.deps.restTimer.setState(adjustedRemaining);
			} else if (adjustedRemaining <= 0) {
				// Timer expirou enquanto app estava fechado
				await this.deps.storage.removeItem(PersistRestTimerUseCase.STORAGE_KEY);
			}

			// Retornar estado restaurado
			const restoredState = await this.deps.restTimer.getState();
			return restoredState;
		} catch (error) {
			console.error('[PersistRestTimerUseCase] Erro ao restaurar:', error);
			return null;
		}
	}

	/**
	 * Limpa o estado persistido do cronômetro.
	 */
	async clearPersistedState(): Promise<void> {
		try {
			await this.deps.storage.removeItem(PersistRestTimerUseCase.STORAGE_KEY);
		} catch (error) {
			console.error('[PersistRestTimerUseCase] Erro ao limpar:', error);
		}
	}
}
