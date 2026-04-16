export interface RestTimerState {
	readonly running: boolean;
	readonly paused: boolean;
	readonly remainingSeconds: number;
	readonly totalSeconds: number;
	readonly elapsedSeconds: number;
}
