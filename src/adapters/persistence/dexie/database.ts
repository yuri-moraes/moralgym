import Dexie, { type EntityTable } from 'dexie';

// ============================================================
// Schema — DTOs de persistência.
// Propositalmente desacoplados das Entities do Domínio:
// Mappers (ver ./mappers.ts) convertem Record <-> Entity nos Repositories,
// para que migrações de schema não vazem para o Core.
// ============================================================

export interface ExerciseRecord {
	id: string;
	name: string;
	nameLower: string; // índice para busca case-insensitive
	muscleGroup: string;
	mediaBlob?: Blob;
	mediaMimeType?: 'image/webp' | 'video/mp4';
	notes?: string;
	difficulty?: 'beginner' | 'intermediate' | 'advanced';
	targetRepsMin?: number;
	targetRepsMax?: number;
	avgDurationSeconds?: number;
	createdAt: number;
	updatedAt: number;
}

export interface RoutineRecord {
	id: string;
	name: string;
	description?: string;
	splitCount: 1 | 2 | 3 | 4 | 5;
	isActive: 0 | 1; // Dexie não indexa boolean
	createdAt: number;
	updatedAt: number;
}

export interface SplitRecord {
	id: string;
	routineId: string;
	label: string; // "A", "B", "C", "D", "E"
	name?: string; // ex.: "Peito/Tríceps"
	orderIndex: number;
	createdAt: number;
	updatedAt: number;
}

export interface SplitExerciseRecord {
	id: string;
	splitId: string;
	exerciseId: string;
	orderIndex: number;
	targetSets: number;
	targetRepsMin: number;
	targetRepsMax: number;
	restSeconds: number;
}

export interface WorkoutLogRecord {
	id: string;
	splitId: string;
	exerciseId: string;
	performedAt: number; // epoch ms, UTC
	setNumber: number;
	reps: number;
	loadKg: number;
	rpe?: number;
	notes?: string;
}

export interface WorkoutSessionRecord {
	id: string;
	routineId: string;
	splitId: string;
	status: 'active' | 'finished' | 'abandoned';
	startedAt: number; // epoch ms, UTC
	finishedAt?: number; // epoch ms, UTC
}

// ============================================================
// MoralGymDatabase — Adapter concreto.
// NÃO exportar esta classe para o Core: consumir apenas via Ports.
// ============================================================

export class MoralGymDatabase extends Dexie {
	exercises!: EntityTable<ExerciseRecord, 'id'>;
	routines!: EntityTable<RoutineRecord, 'id'>;
	splits!: EntityTable<SplitRecord, 'id'>;
	splitExercises!: EntityTable<SplitExerciseRecord, 'id'>;
	workoutLogs!: EntityTable<WorkoutLogRecord, 'id'>;
	workoutSessions!: EntityTable<WorkoutSessionRecord, 'id'>;

	constructor(name = 'moralgym') {
		super(name);

		this.version(1).stores({
			exercises: 'id, nameLower, muscleGroup, updatedAt',
			routines: 'id, isActive, updatedAt',
			splits: 'id, routineId, [routineId+orderIndex]',
			splitExercises: 'id, splitId, exerciseId, [splitId+orderIndex]',
			workoutLogs:
				'id, splitId, exerciseId, performedAt, [exerciseId+performedAt], [splitId+performedAt]',
			workoutSessions: 'id, status, startedAt'
		});
	}
}

// Singleton por aba — Dexie já gerencia conexões concorrentes entre abas.
export const db = new MoralGymDatabase();
