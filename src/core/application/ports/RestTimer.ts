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
	onTick(listener: RestTimerListener): () => void;
	onComplete(listener: () => void): () => void;
}
