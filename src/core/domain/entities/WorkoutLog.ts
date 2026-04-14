export interface WorkoutLog {
	readonly id: string;
	readonly splitId: string;
	readonly exerciseId: string;
	readonly performedAt: Date;
	readonly setNumber: number;
	readonly reps: number;
	readonly loadKg: number;
	readonly rpe?: number;
	readonly notes?: string;
}
