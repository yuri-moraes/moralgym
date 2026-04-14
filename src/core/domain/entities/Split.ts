export interface SplitExercise {
	readonly id: string;
	readonly exerciseId: string;
	readonly orderIndex: number;
	readonly targetSets: number;
	readonly targetRepsMin: number;
	readonly targetRepsMax: number;
	readonly restSeconds: number;
}

export interface Split {
	readonly id: string;
	readonly routineId: string;
	readonly label: string;
	readonly name?: string;
	readonly orderIndex: number;
	readonly exercises: readonly SplitExercise[];
	readonly createdAt: Date;
	readonly updatedAt: Date;
}
