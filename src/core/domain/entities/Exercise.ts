import type { MuscleGroup } from '../value-objects/MuscleGroup';
import type { ExerciseMedia } from '../value-objects/ExerciseMedia';

export interface Exercise {
	readonly id: string;
	readonly name: string;
	readonly muscleGroup: MuscleGroup;
	readonly media?: ExerciseMedia;
	readonly notes?: string;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}
