import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BackupSnapshot } from '../../../../../src/core/domain/entities/BackupSnapshot';
import { ImportBackupUseCase } from '../../../../../src/core/application/use-cases/ImportBackupUseCase';
import type { ExerciseRepository } from '../../../../../src/core/application/ports/repositories/ExerciseRepository';
import type { RoutineRepository } from '../../../../../src/core/application/ports/repositories/RoutineRepository';
import type { SplitRepository } from '../../../../../src/core/application/ports/repositories/SplitRepository';
import type { WorkoutLogRepository } from '../../../../../src/core/application/ports/repositories/WorkoutLogRepository';
import type { WorkoutSessionRepository } from '../../../../../src/core/application/ports/repositories/WorkoutSessionRepository';
import type { Exercise } from '../../../../../src/core/domain/entities/Exercise';
import type { Routine } from '../../../../../src/core/domain/entities/Routine';
import type { Split } from '../../../../../src/core/domain/entities/Split';
import type { WorkoutLog } from '../../../../../src/core/domain/entities/WorkoutLog';
import type { WorkoutSession } from '../../../../../src/core/domain/entities/WorkoutSession';

// ============================================================
// Mock Database
// ============================================================

class MockMoralGymDatabase {
	exercises: any[] = [];
	routines: any[] = [];
	splits: any[] = [];
	workoutLogs: any[] = [];
	workoutSessions: any[] = [];

	async transaction(mode: string, stores: any, callback: () => Promise<void>) {
		await callback();
	}
}

// ============================================================
// Fakes — implementações in-memory
// ============================================================

class InMemoryExerciseRepository implements ExerciseRepository {
	private exercises: Exercise[] = [];

	async findAll(): Promise<Exercise[]> {
		return this.exercises;
	}

	async findById(id: string): Promise<Exercise | null> {
		return this.exercises.find((e) => e.id === id) ?? null;
	}

	async findByMuscleGroup(): Promise<Exercise[]> {
		return [];
	}

	async save(exercise: Exercise): Promise<void> {
		const idx = this.exercises.findIndex((e) => e.id === exercise.id);
		if (idx >= 0) {
			this.exercises[idx] = exercise;
		} else {
			this.exercises.push(exercise);
		}
	}

	async delete(id: string): Promise<void> {
		const idx = this.exercises.findIndex((e) => e.id === id);
		if (idx >= 0) this.exercises.splice(idx, 1);
	}
}

class InMemoryRoutineRepository implements RoutineRepository {
	private routines: Routine[] = [];

	async findAll(): Promise<Routine[]> {
		return this.routines;
	}

	async findById(id: string): Promise<Routine | null> {
		return this.routines.find((r) => r.id === id) ?? null;
	}

	async save(routine: Routine): Promise<void> {
		const idx = this.routines.findIndex((r) => r.id === routine.id);
		if (idx >= 0) {
			this.routines[idx] = routine;
		} else {
			this.routines.push(routine);
		}
	}

	async delete(id: string): Promise<void> {
		const idx = this.routines.findIndex((r) => r.id === id);
		if (idx >= 0) this.routines.splice(idx, 1);
	}

	async findActive(): Promise<Routine[]> {
		return [];
	}
}

class InMemorySplitRepository implements SplitRepository {
	private splits: Split[] = [];

	async findAll(): Promise<Split[]> {
		return this.splits;
	}

	async findById(id: string): Promise<Split | null> {
		return this.splits.find((s) => s.id === id) ?? null;
	}

	async findByRoutine(routineId: string): Promise<Split[]> {
		return this.splits.filter((s) => s.routineId === routineId);
	}

	async save(split: Split): Promise<void> {
		const idx = this.splits.findIndex((s) => s.id === split.id);
		if (idx >= 0) {
			this.splits[idx] = split;
		} else {
			this.splits.push(split);
		}
	}

	async delete(id: string): Promise<void> {
		const idx = this.splits.findIndex((s) => s.id === id);
		if (idx >= 0) this.splits.splice(idx, 1);
	}
}

class InMemoryWorkoutLogRepository implements WorkoutLogRepository {
	private logs: WorkoutLog[] = [];

	async findAll(): Promise<WorkoutLog[]> {
		return this.logs;
	}

	async findById(id: string): Promise<WorkoutLog | null> {
		return this.logs.find((l) => l.id === id) ?? null;
	}

	async findByExercise(): Promise<WorkoutLog[]> {
		return [];
	}

	async findBySplit(): Promise<WorkoutLog[]> {
		return [];
	}

	async findLastSession(): Promise<WorkoutLog[]> {
		return [];
	}

	async save(log: WorkoutLog): Promise<void> {
		const idx = this.logs.findIndex((l) => l.id === log.id);
		if (idx >= 0) {
			this.logs[idx] = log;
		} else {
			this.logs.push(log);
		}
	}

	async saveMany(batch: readonly WorkoutLog[]): Promise<void> {
		for (const log of batch) {
			await this.save(log);
		}
	}

	async delete(id: string): Promise<void> {
		const idx = this.logs.findIndex((l) => l.id === id);
		if (idx >= 0) this.logs.splice(idx, 1);
	}
}

class InMemoryWorkoutSessionRepository implements WorkoutSessionRepository {
	private sessions: WorkoutSession[] = [];

	async findAll(): Promise<WorkoutSession[]> {
		return this.sessions;
	}

	async findById(id: string): Promise<WorkoutSession | null> {
		return this.sessions.find((s) => s.id === id) ?? null;
	}

	async save(session: WorkoutSession): Promise<void> {
		const idx = this.sessions.findIndex((s) => s.id === session.id);
		if (idx >= 0) {
			this.sessions[idx] = session;
		} else {
			this.sessions.push(session);
		}
	}

	async update(session: WorkoutSession): Promise<void> {
		const idx = this.sessions.findIndex((s) => s.id === session.id);
		if (idx >= 0) {
			this.sessions[idx] = session;
		}
	}

	async delete(id: string): Promise<void> {
		const idx = this.sessions.findIndex((s) => s.id === id);
		if (idx >= 0) this.sessions.splice(idx, 1);
	}

	async findByRoutine(): Promise<WorkoutSession[]> {
		return [];
	}

	async findActive(): Promise<WorkoutSession | null> {
		return null;
	}
}

// ============================================================
// Fixtures
// ============================================================

function createMockExercise(overrides?: Partial<Exercise>): Exercise {
	return {
		id: '1',
		name: 'Bench Press',
		muscleGroup: 'chest',
		difficulty: 'intermediate',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		...overrides
	};
}

function createMockRoutine(overrides?: Partial<Routine>): Routine {
	return {
		id: '1',
		name: 'Push Day',
		splitCount: 3,
		isActive: true,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		...overrides
	};
}

function createMockSplit(overrides?: Partial<Split>): Split {
	return {
		id: '1',
		routineId: '1',
		label: 'A',
		orderIndex: 1,
		createdAt: Date.now(),
		updatedAt: Date.now(),
		...overrides
	};
}

function createMockBackupSnapshot(): BackupSnapshot {
	return {
		metadata: {
			exportedAt: new Date(),
			appVersion: '0.1.0',
			exerciseCount: 0,
			routineCount: 0,
			logCount: 0
		},
		data: {
			exercises: [],
			routines: [],
			splits: [],
			workoutLogs: [],
			workoutSessions: []
		}
	};
}

// ============================================================
// Tests
// ============================================================

describe('ImportBackupUseCase', () => {
	let exerciseRepository: InMemoryExerciseRepository;
	let routineRepository: InMemoryRoutineRepository;
	let splitRepository: InMemorySplitRepository;
	let workoutLogRepository: InMemoryWorkoutLogRepository;
	let workoutSessionRepository: InMemoryWorkoutSessionRepository;
	let db: MockMoralGymDatabase;
	let useCase: ImportBackupUseCase;

	beforeEach(() => {
		exerciseRepository = new InMemoryExerciseRepository();
		routineRepository = new InMemoryRoutineRepository();
		splitRepository = new InMemorySplitRepository();
		workoutLogRepository = new InMemoryWorkoutLogRepository();
		workoutSessionRepository = new InMemoryWorkoutSessionRepository();
		db = new MockMoralGymDatabase();
		useCase = new ImportBackupUseCase(
			exerciseRepository,
			routineRepository,
			splitRepository,
			workoutLogRepository,
			workoutSessionRepository,
			db as any
		);
	});

	describe('JSON Parsing', () => {
		it('should parse valid JSON snapshot', async () => {
			const snapshot = createMockBackupSnapshot();
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({ json });

			expect(result.snapshot.metadata.appVersion).toBe('0.1.0');
			expect(result.itemsImported.exercises).toBe(0);
		});

		it('should reject invalid JSON', async () => {
			const json = 'not json {invalid';

			await expect(useCase.execute({ json })).rejects.toThrow('Backup inválido');
		});

		it('should reject missing metadata', async () => {
			const json = JSON.stringify({ data: {} });

			await expect(useCase.execute({ json })).rejects.toThrow(
				'Backup inválido: metadata ausente'
			);
		});

		it('should reject missing appVersion', async () => {
			const json = JSON.stringify({
				metadata: { exportedAt: new Date() },
				data: {}
			});

			await expect(useCase.execute({ json })).rejects.toThrow(
				'Backup inválido: appVersion ausente'
			);
		});

		it('should reject missing data', async () => {
			const json = JSON.stringify({
				metadata: { appVersion: '0.1.0' }
			});

			await expect(useCase.execute({ json })).rejects.toThrow('Backup inválido: data ausente');
		});

		it('should reject if exercises is not an array', async () => {
			const json = JSON.stringify({
				metadata: { appVersion: '0.1.0' },
				data: { exercises: 'not an array' }
			});

			await expect(useCase.execute({ json })).rejects.toThrow(
				'Backup inválido: exercises não é um array'
			);
		});

		it('should reject if routines is not an array', async () => {
			const json = JSON.stringify({
				metadata: { appVersion: '0.1.0' },
				data: { exercises: [], routines: {} }
			});

			await expect(useCase.execute({ json })).rejects.toThrow(
				'Backup inválido: routines não é um array'
			);
		});
	});

	describe('Version Validation', () => {
		it('should accept compatible version 0.x', async () => {
			const snapshot = createMockBackupSnapshot();
			snapshot.metadata.appVersion = '0.1.0';
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({ json });

			expect(result.snapshot.metadata.appVersion).toBe('0.1.0');
		});

		it('should reject incompatible version', async () => {
			const snapshot = createMockBackupSnapshot();
			snapshot.metadata.appVersion = '1.0.0';
			const json = JSON.stringify(snapshot);

			await expect(useCase.execute({ json })).rejects.toThrow('não é compatível');
		});

		it('should reject version without major.minor', async () => {
			const snapshot = createMockBackupSnapshot();
			snapshot.metadata.appVersion = 'invalid';
			const json = JSON.stringify(snapshot);

			await expect(useCase.execute({ json })).rejects.toThrow('não é compatível');
		});
	});

	describe('Replace Mode', () => {
		it('should replace: clear and insert exercises', async () => {
			// Setup: 1 existing exercise
			const existing = createMockExercise({ id: 'old-id' });
			await exerciseRepository.save(existing);

			// Import: 2 exercises in replace mode
			const snapshot = createMockBackupSnapshot();
			snapshot.data.exercises = [
				createMockExercise({ id: 'new-1' }),
				createMockExercise({ id: 'new-2' })
			] as Exercise[];
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({
				json,
				options: { mergeMode: 'replace', clearBeforeImport: true }
			});

			// Assert: database has exactly 2 exercises (old cleared)
			const all = await exerciseRepository.findAll();
			expect(all).toHaveLength(2);
			expect(all.map((e) => e.id).sort()).toEqual(['new-1', 'new-2']);
			expect(result.itemsImported.exercises).toBe(2);
		});

		it('should count items correctly in replace mode', async () => {
			const snapshot = createMockBackupSnapshot();
			snapshot.data.exercises = [createMockExercise(), createMockExercise()] as Exercise[];
			snapshot.data.routines = [createMockRoutine()] as Routine[];
			snapshot.data.splits = [createMockSplit()] as Split[];

			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({
				json,
				options: { mergeMode: 'replace' }
			});

			expect(result.itemsImported).toEqual({
				exercises: 2,
				routines: 1,
				splits: 1,
				workoutLogs: 0,
				workoutSessions: 0
			});
		});
	});

	describe('Merge Mode', () => {
		it('should merge: keep newer by updatedAt', async () => {
			const t1 = Date.now();
			const t2 = t1 + 1000;

			// Setup: exercise {id:1, updatedAt: t1}
			const oldEx = createMockExercise({ id: '1', updatedAt: t1 });
			await exerciseRepository.save(oldEx);

			// Import: {id:1, updatedAt: t2} in merge mode
			const snapshot = createMockBackupSnapshot();
			snapshot.data.exercises = [
				createMockExercise({ id: '1', name: 'New Name', updatedAt: t2 })
			] as Exercise[];
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// Assert: database has 'New Name' (t2 > t1)
			const merged = await exerciseRepository.findById('1');
			expect(merged?.name).toBe('New Name');
			expect(merged?.updatedAt).toBe(t2);
			expect(result.itemsImported.exercises).toBe(1);
		});

		it('should merge: skip older entries', async () => {
			const t1 = Date.now();
			const t2 = t1 + 1000;

			// Setup: exercise {id:1, updatedAt: t2}
			const newerEx = createMockExercise({ id: '1', name: 'Current', updatedAt: t2 });
			await exerciseRepository.save(newerEx);

			// Import: {id:1, updatedAt: t1} in merge mode
			const snapshot = createMockBackupSnapshot();
			snapshot.data.exercises = [
				createMockExercise({ id: '1', name: 'Old', updatedAt: t1 })
			] as Exercise[];
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// Assert: database keeps 'Current' (skip older)
			const merged = await exerciseRepository.findById('1');
			expect(merged?.name).toBe('Current');
			expect(merged?.updatedAt).toBe(t2);
			expect(result.itemsImported.exercises).toBe(0);
		});

		it('should merge: import new entries', async () => {
			// Setup: exercise {id:1}
			const existing = createMockExercise({ id: '1' });
			await exerciseRepository.save(existing);

			// Import: new exercise {id:2}
			const snapshot = createMockBackupSnapshot();
			snapshot.data.exercises = [
				createMockExercise({ id: '1' }),
				createMockExercise({ id: '2', name: 'New Exercise' })
			] as Exercise[];
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// Assert: database has 2 exercises
			const all = await exerciseRepository.findAll();
			expect(all).toHaveLength(2);
			expect(result.itemsImported.exercises).toBe(1); // Only new one counted
		});

		it('should merge routines by updatedAt', async () => {
			const t1 = Date.now();
			const t2 = t1 + 1000;

			// Setup: routine {id:1, updatedAt: t1}
			const oldRtn = createMockRoutine({ id: '1', updatedAt: t1 });
			await routineRepository.save(oldRtn);

			// Import: {id:1, updatedAt: t2} in merge mode
			const snapshot = createMockBackupSnapshot();
			snapshot.data.routines = [
				createMockRoutine({ id: '1', name: 'Updated', updatedAt: t2 })
			] as Routine[];
			const json = JSON.stringify(snapshot);

			await useCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			const merged = await routineRepository.findById('1');
			expect(merged?.name).toBe('Updated');
		});

		it('should merge splits by updatedAt', async () => {
			const t1 = Date.now();
			const t2 = t1 + 1000;

			// Setup
			const oldSplit = createMockSplit({ id: '1', updatedAt: t1 });
			await splitRepository.save(oldSplit);

			// Import
			const snapshot = createMockBackupSnapshot();
			snapshot.data.splits = [
				createMockSplit({ id: '1', name: 'Updated', updatedAt: t2 })
			] as Split[];
			const json = JSON.stringify(snapshot);

			await useCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			const merged = await splitRepository.findById('1');
			expect(merged?.name).toBe('Updated');
		});

		it('should never overwrite workoutLogs (append only)', async () => {
			// Setup: log {id: '1'}
			const existingLog: WorkoutLog = {
				id: '1',
				splitId: 's1',
				exerciseId: 'e1',
				performedAt: Date.now(),
				setNumber: 1,
				reps: 10,
				loadKg: 20
			};
			await workoutLogRepository.save(existingLog);

			// Import: same log {id: '1'} - should be skipped
			const snapshot = createMockBackupSnapshot();
			snapshot.data.workoutLogs = [
				{
					id: '1',
					splitId: 's1',
					exerciseId: 'e1',
					performedAt: Date.now() + 1000,
					setNumber: 2,
					reps: 15,
					loadKg: 25
				} as WorkoutLog
			];
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// Assert: log unchanged, count = 0
			const all = await workoutLogRepository.findAll();
			expect(all).toHaveLength(1);
			expect(result.itemsImported.workoutLogs).toBe(0);
		});

		it('should never overwrite workoutSessions (append only)', async () => {
			// Setup: session {id: '1'}
			const existingSession: WorkoutSession = {
				id: '1',
				routineId: 'r1',
				splitId: 's1',
				status: 'active',
				startedAt: Date.now()
			};
			await workoutSessionRepository.save(existingSession);

			// Import: same session {id: '1'} - should be skipped
			const snapshot = createMockBackupSnapshot();
			snapshot.data.workoutSessions = [
				{
					id: '1',
					routineId: 'r2',
					splitId: 's2',
					status: 'finished',
					startedAt: Date.now() + 1000
				} as WorkoutSession
			];
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// Assert: session unchanged, count = 0
			const all = await workoutSessionRepository.findAll();
			expect(all).toHaveLength(1);
			expect(result.itemsImported.workoutSessions).toBe(0);
		});
	});

	describe('Full Round-Trip', () => {
		it('should return correct snapshot reference', async () => {
			const snapshot = createMockBackupSnapshot();
			snapshot.data.exercises = [createMockExercise()] as Exercise[];
			const json = JSON.stringify(snapshot);

			const result = await useCase.execute({ json });

			expect(result.snapshot).toEqual(snapshot);
		});
	});
});
