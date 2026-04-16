export interface RestTimerTick {
	readonly remainingSeconds: number;
	readonly totalSeconds: number;
}

export type RestTimerListener = (tick: RestTimerTick) => void;

/**
 * Port — cronômetro de descanso que sobrevive à tela apagada.
 * Adapter concreto roda em Web Worker e dispara notificação ao zerar.
 */
export interface RestTimer {
	start(totalSeconds: number): void;
	pause(): void;
	resume(): void;
	stop(): void;
	setState(secondsRemaining: number): Promise<void>;
	getState(): Promise<RestTimerState>;
	onTick(listener: RestTimerListener): () => void;
	onComplete(listener: () => void): () => void;
}

// Importado de RestTimerState VO para manter DRY principle
export type { RestTimerState } from '../value-objects/RestTimerState';
