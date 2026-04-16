/// <reference lib="webworker" />

/**
 * Web Worker — cronômetro de descanso tolerante a throttling.
 *
 * Por que tick por setInterval + clock-based:
 *   setInterval em Workers também pode sofrer throttling agressivo em background
 *   (Android Chrome/iOS Safari). Em vez de confiar que N ticks = N segundos,
 *   calculamos tempo restante com Date.now() a cada tick. Assim, mesmo se o
 *   intervalo for disparado só a cada 10s, o `remaining` reportado ao main
 *   thread continua correto — e o evento `complete` dispara no primeiro tick
 *   após o prazo expirar.
 *
 * Contrato de mensagens (intencionalmente pequeno e tipado):
 *   Main -> Worker:  { type: 'start' | 'pause' | 'resume' | 'stop', ... }
 *   Worker -> Main:  { type: 'tick' | 'complete' | 'state', ... }
 */

// ------------- tipos compartilhados (copiados no Adapter) -------------

export type InboundMessage =
	| { type: 'start'; totalSeconds: number }
	| { type: 'pause' }
	| { type: 'resume' }
	| { type: 'stop' }
	| { type: 'setState'; remainingSeconds: number };

export type OutboundMessage =
	| { type: 'tick'; remainingSeconds: number; totalSeconds: number }
	| { type: 'complete'; totalSeconds: number }
	| { type: 'state'; running: boolean; paused: boolean };

// ------------- estado interno -------------

interface TimerState {
	totalMs: number;
	deadlineAt: number; // epoch ms em que deveria terminar
	pausedAt: number | null; // epoch ms em que foi pausado
	intervalId: ReturnType<typeof setInterval> | null;
}

const state: TimerState = {
	totalMs: 0,
	deadlineAt: 0,
	pausedAt: null,
	intervalId: null
};

const TICK_MS = 250; // resolução visual no main thread

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: OutboundMessage): void {
	ctx.postMessage(msg);
}

function clearTick(): void {
	if (state.intervalId !== null) {
		clearInterval(state.intervalId);
		state.intervalId = null;
	}
}

function emitTick(): void {
	const now = Date.now();
	const remainingMs = Math.max(0, state.deadlineAt - now);
	const remainingSeconds = Math.ceil(remainingMs / 1000);
	const totalSeconds = Math.round(state.totalMs / 1000);

	post({ type: 'tick', remainingSeconds, totalSeconds });

	if (remainingMs <= 0) {
		clearTick();
		post({ type: 'complete', totalSeconds });
	}
}

function start(totalSeconds: number): void {
	clearTick();
	state.totalMs = totalSeconds * 1000;
	state.deadlineAt = Date.now() + state.totalMs;
	state.pausedAt = null;
	state.intervalId = setInterval(emitTick, TICK_MS);
	emitTick();
	post({ type: 'state', running: true, paused: false });
}

function pause(): void {
	if (state.intervalId === null || state.pausedAt !== null) return;
	state.pausedAt = Date.now();
	clearTick();
	post({ type: 'state', running: true, paused: true });
}

function resume(): void {
	if (state.pausedAt === null) return;
	const pausedDuration = Date.now() - state.pausedAt;
	state.deadlineAt += pausedDuration; // empurra o deadline pelo tempo pausado
	state.pausedAt = null;
	state.intervalId = setInterval(emitTick, TICK_MS);
	emitTick();
	post({ type: 'state', running: true, paused: false });
}

function stop(): void {
	clearTick();
	state.pausedAt = null;
	state.totalMs = 0;
	state.deadlineAt = 0;
	post({ type: 'state', running: false, paused: false });
}

function setState(remainingSeconds: number): void {
	// Recalcular deadline se timer está rodando
	if (state.intervalId !== null && state.pausedAt === null) {
		state.deadlineAt = Date.now() + (remainingSeconds * 1000);
		// Emitir tick imediato para atualizar UI
		emitTick();
	} else {
		// Se não está rodando, apenas atualizar o estado interno
		state.totalMs = remainingSeconds * 1000;
		state.deadlineAt = Date.now() + state.totalMs;
	}
}

ctx.addEventListener('message', (event: MessageEvent<InboundMessage>) => {
	const msg = event.data;
	switch (msg.type) {
		case 'start':
			start(msg.totalSeconds);
			break;
		case 'pause':
			pause();
			break;
		case 'resume':
			resume();
			break;
		case 'stop':
			stop();
			break;
		case 'setState':
			setState(msg.remainingSeconds);
			break;
	}
});
