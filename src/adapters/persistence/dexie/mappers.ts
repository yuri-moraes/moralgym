import type { Exercise } from '../../../core/domain/entities/Exercise';
import { isMuscleGroup, type MuscleGroup } from '../../../core/domain/value-objects/MuscleGroup';
import type { ExerciseRecord } from './database';

export function exerciseToRecord(e: Exercise): ExerciseRecord {
	return {
		id: e.id,
		name: e.name,
		nameLower: e.name.toLowerCase(),
		muscleGroup: e.muscleGroup,
		mediaBlob: e.media?.blob,
		mediaMimeType: e.media?.mimeType,
		notes: e.notes,
		createdAt: e.createdAt.getTime(),
		updatedAt: e.updatedAt.getTime()
	};
}

export function recordToExercise(r: ExerciseRecord): Exercise {
	const group: MuscleGroup = isMuscleGroup(r.muscleGroup) ? r.muscleGroup : 'other';
	return {
		id: r.id,
		name: r.name,
		muscleGroup: group,
		media:
			r.mediaBlob && r.mediaMimeType
				? { blob: r.mediaBlob, mimeType: r.mediaMimeType }
				: undefined,
		notes: r.notes,
		createdAt: new Date(r.createdAt),
		updatedAt: new Date(r.updatedAt)
	};
}
