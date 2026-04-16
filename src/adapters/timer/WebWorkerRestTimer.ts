import type {
	RestTimer,
	RestTimerListener,
	RestTimerTick,
	RestTimerState
} from '../../core/application/ports/RestTimer';

// Mesmos types do worker, duplicados aqui para evitar import cruzado entre
// adapter e entry-point de worker (Vite trata paths de worker de forma especial).
type InboundMessage =
	| { type: 'start'; totalSeconds: number }
	| { type: 'pause' }
	| { type: 'resume' }
	| { type: 'stop' }
	| { type: 'setState'; remainingSeconds: number };

type OutboundMessage =
	| { type: 'tick'; remainingSeconds: number; totalSeconds: number }
	| { type: 'complete'; totalSeconds: number }
	| { type: 'state'; running: boolean; paused: boolean };

/**
 * Adapter que implementa o Port RestTimer delegando o cronômetro a um
 * Web Worker dedicado. Conexão lazy: o Worker só é instanciado na primeira
 * chamada a `start`, para não pagar o custo em telas que não usam o timer.
 */
export class WebWorkerRestTimer implements RestTimer {
	private worker: Worker | null = null;
	private readonly tickListeners = new Set<RestTimerListener>();
	private readonly completeListeners = new Set<() => void>();
	private currentState: RestTimerState = {
		running: false,
		paused: false,
		remainingSeconds: 0,
		totalSeconds: 0,
		elapsedSeconds: 0
	};

	start(totalSeconds: number): void {
		this.ensureWorker();
		this.post({ type: 'start', totalSeconds });
	}

	pause(): void {
		this.post({ type: 'pause' });
	}

	resume(): void {
		this.post({ type: 'resume' });
	}

	stop(): void {
		this.post({ type: 'stop' });
	}

	setState(remainingSeconds: number): Promise<void> {
		this.ensureWorker();
		return new Promise((resolve) => {
			this.post({ type: 'setState', remainingSeconds });
			// Resolve imediatamente: setState é otimista
			// O worker emitirá tick com novo estado
			resolve();
		});
	}

	async getState(): Promise<RestTimerState> {
		return Promise.resolve(this.currentState);
	}

	onTick(listener: RestTimerListener): () => void {
		this.tickListeners.add(listener);
		return () => this.tickListeners.delete(listener);
	}

	onComplete(listener: () => void): () => void {
		this.completeListeners.add(listener);
		return () => this.completeListeners.delete(listener);
	}

	/** Descarta o worker — chamar em unmount da app se necessário. */
	dispose(): void {
		this.worker?.terminate();
		this.worker = null;
		this.tickListeners.clear();
		this.completeListeners.clear();
	}

	// ----------------- privados -----------------

	private ensureWorker(): void {
		if (this.worker) return;
		this.worker = new Worker(new URL('../../workers/rest-timer.worker.ts', import.meta.url), {
			type: 'module',
			name: 'moralgym-rest-timer'
		});
		this.worker.addEventListener('message', (event: MessageEvent<OutboundMessage>) => {
			this.handleMessage(event.data);
		});
	}

	private post(message: InboundMessage): void {
		if (!this.worker) return;
		this.worker.postMessage(message);
	}

	private handleMessage(msg: OutboundMessage): void {
		if (msg.type === 'tick') {
			const tick: RestTimerTick = {
				remainingSeconds: msg.remainingSeconds,
				totalSeconds: msg.totalSeconds
			};
			// Atualizar estado local
			this.currentState = {
				running: this.currentState.running,
				paused: this.currentState.paused,
				remainingSeconds: msg.remainingSeconds,
				totalSeconds: msg.totalSeconds,
				elapsedSeconds: msg.totalSeconds - msg.remainingSeconds
			};
			for (const listener of this.tickListeners) listener(tick);
			return;
		}
		if (msg.type === 'complete') {
			// Atualizar estado ao completar
			this.currentState = {
				running: false,
				paused: false,
				remainingSeconds: 0,
				totalSeconds: this.currentState.totalSeconds,
				elapsedSeconds: this.currentState.totalSeconds
			};
			for (const listener of this.completeListeners) listener();
			return;
		}
		if (msg.type === 'state') {
			// Atualizar estado running/paused
			this.currentState = {
				...this.currentState,
				running: msg.running,
				paused: msg.paused
			};
		}
	}
}
