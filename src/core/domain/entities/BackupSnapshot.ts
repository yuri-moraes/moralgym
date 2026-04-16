import type { BackupMetadata } from '../value-objects/BackupMetadata';
import type { Exercise } from './Exercise';
import type { Routine } from './Routine';
import type { Split } from './Split';
import type { WorkoutLog } from './WorkoutLog';
import type { WorkoutSession } from './WorkoutSession';

export interface BackupSnapshotData {
	readonly exercises: Exercise[];
	readonly routines: Routine[];
	readonly splits: Split[];
	readonly workoutLogs: WorkoutLog[];
	readonly workoutSessions: WorkoutSession[];
}

export interface BackupSnapshot {
	readonly metadata: BackupMetadata;
	readonly data: BackupSnapshotData;
}
