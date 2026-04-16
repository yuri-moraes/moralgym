import { beforeEach, describe, expect, it } from 'vitest';
import { ExportBackupUseCase } from '../../../../src/core/application/use-cases/ExportBackupUseCase';
import { ImportBackupUseCase } from '../../../../src/core/application/use-cases/ImportBackupUseCase';
import { DexieExerciseRepository } from '../../../../src/adapters/persistence/dexie/DexieExerciseRepository';
import { DexieRoutineRepository } from '../../../../src/adapters/persistence/dexie/DexieRoutineRepository';
import { DexieSplitRepository } from '../../../../src/adapters/persistence/dexie/DexieSplitRepository';
import { DexieWorkoutLogRepository } from '../../../../src/adapters/persistence/dexie/DexieWorkoutLogRepository';
import { DexieWorkoutSessionRepository } from '../../../../src/adapters/persistence/dexie/DexieWorkoutSessionRepository';
import {
	MoralGymDatabase,
	type ExerciseRecord
} from '../../../../src/adapters/persistence/dexie/database';
import type { Exercise } from '../../../../src/core/domain/entities/Exercise';
import type { Routine } from '../../../../src/core/domain/entities/Routine';
import type { Split } from '../../../../src/core/domain/entities/Split';

/**
 * Integration tests para o fluxo de backup/restore.
 * Usa um banco in-memory (IndexedDB simulado) para testar as transações Dexie.
 */

let testDb: MoralGymDatabase;

function createTestDatabase(): MoralGymDatabase {
	return new MoralGymDatabase(`moralgym-test-${Date.now()}`);
}

async function clearDatabase(db: MoralGymDatabase) {
	return db.transaction('rw', [
		db.exercises,
		db.routines,
		db.splits,
		db.workoutLogs,
		db.workoutSessions
	], async () => {
		await db.exercises.clear();
		await db.routines.clear();
		await db.splits.clear();
		await db.workoutLogs.clear();
		await db.workoutSessions.clear();
	});
}

describe('BackupRoundTripFlow', () => {
	beforeEach(async () => {
		testDb = createTestDatabase();
		await clearDatabase(testDb);
	});

	describe('Export and Import Round-Trip (Replace Mode)', () => {
		it('should export and import with replace mode preserving all data', async () => {
			// 1. Create exercise A
			const exerciseA: Exercise = {
				id: 'ex-1',
				name: 'Bench Press',
				muscleGroup: 'chest',
				difficulty: 'intermediate',
				targetRepsMin: 8,
				targetRepsMax: 12,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			// 2. Create routine B
			const routineB: Routine = {
				id: 'rtn-1',
				name: 'Push Day',
				splitCount: 3,
				isActive: true,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			// 3. Create split C
			const splitC: Split = {
				id: 'split-1',
				routineId: 'rtn-1',
				label: 'A',
				name: 'Push (Horizontal)',
				orderIndex: 1,
				createdAt: Date.now(),
				updatedAt: Date.now()
			};

			// Save to database
			const exerciseRepo = new DexieExerciseRepository(testDb);
			const routineRepo = new DexieRoutineRepository(testDb);
			const splitRepo = new DexieSplitRepository(testDb);
			const logRepo = new DexieWorkoutLogRepository(testDb);
			const sessionRepo = new DexieWorkoutSessionRepository();

			await exerciseRepo.save(exerciseA);
			await routineRepo.save(routineB);
			await splitRepo.save(splitC);

			// 4. Export to JSON
			const exportUseCase = new ExportBackupUseCase({
				exercises: exerciseRepo,
				routines: routineRepo,
				splits: splitRepo,
				workoutLogs: logRepo,
				sessions: sessionRepo
			});

			const exportResult = await exportUseCase.execute({
				includeWorkoutLogs: true,
				includeWorkoutSessions: false
			});

			const json = exportResult.json;

			// 5. Clear database
			await clearDatabase(testDb);

			// Verify cleared
			let allEx = await exerciseRepo.findAll();
			expect(allEx).toHaveLength(0);

			// 6. Import JSON
			const importUseCase = new ImportBackupUseCase(
				exerciseRepo,
				routineRepo,
				splitRepo,
				logRepo,
				sessionRepo,
				testDb
			);

			const importResult = await importUseCase.execute({
				json,
				options: { mergeMode: 'replace', clearBeforeImport: false }
			});

			// 7. Assert: exercise A, routine B, split C exist identically
			allEx = await exerciseRepo.findAll();
			expect(allEx).toHaveLength(1);
			expect(allEx[0].id).toBe('ex-1');
			expect(allEx[0].name).toBe('Bench Press');

			const allRtn = await routineRepo.findAll();
			expect(allRtn).toHaveLength(1);
			expect(allRtn[0].id).toBe('rtn-1');
			expect(allRtn[0].name).toBe('Push Day');

			const allSplit = await splitRepo.findAll();
			expect(allSplit).toHaveLength(1);
			expect(allSplit[0].id).toBe('split-1');
			expect(allSplit[0].routineId).toBe('rtn-1');

			// Verify import counts
			expect(importResult.itemsImported.exercises).toBe(1);
			expect(importResult.itemsImported.routines).toBe(1);
			expect(importResult.itemsImported.splits).toBe(1);
		});
	});

	describe('Merge Mode Behavior', () => {
		it('should export and import merge mode keeping newer data locally', async () => {
			const exerciseRepo = new DexieExerciseRepository(testDb);
			const routineRepo = new DexieRoutineRepository(testDb);
			const splitRepo = new DexieSplitRepository(testDb);
			const logRepo = new DexieWorkoutLogRepository(testDb);
			const sessionRepo = new DexieWorkoutSessionRepository();

			const t1 = Date.now();
			const t2 = t1 + 5000;

			// 1. Create exercise {id:1, name:'Old', updatedAt: t1}
			const oldEx: Exercise = {
				id: 'ex-1',
				name: 'Old Name',
				muscleGroup: 'chest',
				difficulty: 'beginner',
				createdAt: t1,
				updatedAt: t1
			};
			await exerciseRepo.save(oldEx);

			// 2. Export to JSON
			const exportUseCase = new ExportBackupUseCase({
				exercises: exerciseRepo,
				routines: routineRepo,
				splits: splitRepo,
				workoutLogs: logRepo,
				sessions: sessionRepo
			});

			const exportResult = await exportUseCase.execute({
				includeWorkoutLogs: false,
				includeWorkoutSessions: false
			});

			const json = exportResult.json;

			// 3. Update the exercise locally {id:1, name:'New', updatedAt: t2}
			const newEx: Exercise = {
				id: 'ex-1',
				name: 'New Name',
				muscleGroup: 'chest',
				difficulty: 'intermediate',
				createdAt: t1,
				updatedAt: t2
			};
			await exerciseRepo.save(newEx);

			// 4. Import JSON in merge mode
			const importUseCase = new ImportBackupUseCase(
				exerciseRepo,
				routineRepo,
				splitRepo,
				logRepo,
				sessionRepo,
				testDb
			);

			const importResult = await importUseCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// 5. Assert: database has 'New Name' (local t2 > import t1)
			const merged = await exerciseRepo.findById('ex-1');
			expect(merged?.name).toBe('New Name');
			expect(merged?.updatedAt).toBe(t2);

			// Import should report 0 items updated (since local is newer)
			expect(importResult.itemsImported.exercises).toBe(0);
		});

		it('should merge mode update older entries from backup', async () => {
			const exerciseRepo = new DexieExerciseRepository(testDb);
			const routineRepo = new DexieRoutineRepository(testDb);
			const splitRepo = new DexieSplitRepository(testDb);
			const logRepo = new DexieWorkoutLogRepository(testDb);
			const sessionRepo = new DexieWorkoutSessionRepository();

			const t1 = Date.now();
			const t2 = t1 + 5000;

			// 1. Create exercise {id:1, name:'Old', updatedAt: t1}
			const oldEx: Exercise = {
				id: 'ex-1',
				name: 'Old Name',
				muscleGroup: 'chest',
				difficulty: 'beginner',
				createdAt: t1,
				updatedAt: t1
			};
			await exerciseRepo.save(oldEx);

			// 2. Create JSON with newer version {id:1, name:'Imported', updatedAt: t2}
			const newerEx: Exercise = {
				id: 'ex-1',
				name: 'Imported Name',
				muscleGroup: 'back',
				difficulty: 'advanced',
				createdAt: t1,
				updatedAt: t2
			};

			const snapshot = {
				metadata: {
					exportedAt: new Date(),
					appVersion: '0.1.0',
					exerciseCount: 1,
					routineCount: 0,
					logCount: 0
				},
				data: {
					exercises: [newerEx],
					routines: [],
					splits: [],
					workoutLogs: [],
					workoutSessions: []
				}
			};

			const json = JSON.stringify(snapshot);

			// 3. Import in merge mode
			const importUseCase = new ImportBackupUseCase(
				exerciseRepo,
				routineRepo,
				splitRepo,
				logRepo,
				sessionRepo,
				testDb
			);

			const importResult = await importUseCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// 4. Assert: database updated to imported version
			const merged = await exerciseRepo.findById('ex-1');
			expect(merged?.name).toBe('Imported Name');
			expect(merged?.muscleGroup).toBe('back');
			expect(merged?.updatedAt).toBe(t2);

			// Import should report 1 item updated
			expect(importResult.itemsImported.exercises).toBe(1);
		});

		it('should import new exercises in merge mode', async () => {
			const exerciseRepo = new DexieExerciseRepository(testDb);
			const routineRepo = new DexieRoutineRepository(testDb);
			const splitRepo = new DexieSplitRepository(testDb);
			const logRepo = new DexieWorkoutLogRepository(testDb);
			const sessionRepo = new DexieWorkoutSessionRepository();

			const t = Date.now();

			// 1. Create exercise {id:1} locally
			const localEx: Exercise = {
				id: 'ex-1',
				name: 'Local Exercise',
				muscleGroup: 'chest',
				difficulty: 'beginner',
				createdAt: t,
				updatedAt: t
			};
			await exerciseRepo.save(localEx);

			// 2. Create JSON with 2 exercises: {id:1} and {id:2}
			const snapshot = {
				metadata: {
					exportedAt: new Date(),
					appVersion: '0.1.0',
					exerciseCount: 2,
					routineCount: 0,
					logCount: 0
				},
				data: {
					exercises: [
						localEx,
						{
							id: 'ex-2',
							name: 'New Exercise',
							muscleGroup: 'back',
							difficulty: 'beginner',
							createdAt: t,
							updatedAt: t
						} as Exercise
					],
					routines: [],
					splits: [],
					workoutLogs: [],
					workoutSessions: []
				}
			};

			const json = JSON.stringify(snapshot);

			// 3. Import in merge mode
			const importUseCase = new ImportBackupUseCase(
				exerciseRepo,
				routineRepo,
				splitRepo,
				logRepo,
				sessionRepo,
				testDb
			);

			const importResult = await importUseCase.execute({
				json,
				options: { mergeMode: 'merge' }
			});

			// 4. Assert: database has both exercises
			const all = await exerciseRepo.findAll();
			expect(all).toHaveLength(2);
			expect(all.map((e) => e.id).sort()).toEqual(['ex-1', 'ex-2']);

			// Import count: only new one
			expect(importResult.itemsImported.exercises).toBe(1);
		});
	});

	describe('Transaction Atomicity', () => {
		it('should use Dexie transaction for consistency', async () => {
			const exerciseRepo = new DexieExerciseRepository(testDb);
			const routineRepo = new DexieRoutineRepository(testDb);
			const splitRepo = new DexieSplitRepository(testDb);
			const logRepo = new DexieWorkoutLogRepository(testDb);
			const sessionRepo = new DexieWorkoutSessionRepository();

			// Create snapshot with multiple entities
			const snapshot = {
				metadata: {
					exportedAt: new Date(),
					appVersion: '0.1.0',
					exerciseCount: 2,
					routineCount: 1,
					logCount: 0
				},
				data: {
					exercises: [
						{
							id: 'ex-1',
							name: 'Exercise 1',
							muscleGroup: 'chest',
							difficulty: 'beginner',
							createdAt: Date.now(),
							updatedAt: Date.now()
						} as Exercise,
						{
							id: 'ex-2',
							name: 'Exercise 2',
							muscleGroup: 'back',
							difficulty: 'beginner',
							createdAt: Date.now(),
							updatedAt: Date.now()
						} as Exercise
					],
					routines: [
						{
							id: 'rtn-1',
							name: 'Routine 1',
							splitCount: 2,
							isActive: true,
							createdAt: Date.now(),
							updatedAt: Date.now()
						} as Routine
					],
					splits: [],
					workoutLogs: [],
					workoutSessions: []
				}
			};

			const json = JSON.stringify(snapshot);

			const importUseCase = new ImportBackupUseCase(
				exerciseRepo,
				routineRepo,
				splitRepo,
				logRepo,
				sessionRepo,
				testDb
			);

			await importUseCase.execute({
				json,
				options: { mergeMode: 'replace', clearBeforeImport: true }
			});

			// Verify all entities were imported atomically
			const allEx = await exerciseRepo.findAll();
			const allRtn = await routineRepo.findAll();

			expect(allEx).toHaveLength(2);
			expect(allRtn).toHaveLength(1);
		});
	});
});
