export type WorkoutSessionStatus = 'active' | 'finished' | 'abandoned';

export interface WorkoutSession {
	readonly id: string;
	readonly routineId: string;
	readonly splitId: string;
	readonly status: WorkoutSessionStatus;
	readonly startedAt: Date;
	readonly finishedAt?: Date;
}
