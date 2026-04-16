import type { Exercise } from '../../../core/domain/entities/Exercise';
import type { WorkoutSession } from '../../../core/domain/entities/WorkoutSession';
import { isMuscleGroup, type MuscleGroup } from '../../../core/domain/value-objects/MuscleGroup';
import type { ExerciseRecord, WorkoutSessionRecord } from './database';

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

export function sessionToRecord(s: WorkoutSession): WorkoutSessionRecord {
	return {
		id: s.id,
		routineId: s.routineId,
		splitId: s.splitId,
		status: s.status,
		startedAt: s.startedAt.getTime(),
		finishedAt: s.finishedAt?.getTime()
	};
}

export function recordToSession(r: WorkoutSessionRecord): WorkoutSession {
	return {
		id: r.id,
		routineId: r.routineId,
		splitId: r.splitId,
		status: r.status,
		startedAt: new Date(r.startedAt),
		finishedAt: r.finishedAt ? new Date(r.finishedAt) : undefined
	};
}
