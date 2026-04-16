/**
 * Teste de integração: fluxo completo de edição de exercício.
 * Usa Dexie com fake-indexeddb para provar que UpdateExerciseUseCase
 * persiste corretamente no banco real (via adapter).
 */
import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MoralGymDatabase } from '../../../src/adapters/persistence/dexie/database';
import { DexieExerciseRepository } from '../../../src/adapters/persistence/dexie/DexieExerciseRepository';
import { UpdateExerciseUseCase } from '../../../src/core/application/use-cases/UpdateExerciseUseCase';
import type { Exercise } from '../../../src/core/domain/entities/Exercise';

// ============================================================
// Fábrica de dados
// ============================================================

const FIXED_NOW = new Date('2026-04-14T10:00:00.000Z');

function makeExercise(overrides?: Partial<Exercise>): Exercise {
	return {
		id: crypto.randomUUID(),
		name: 'Supino Reto',
		muscleGroup: 'chest',
		createdAt: FIXED_NOW,
		updatedAt: FIXED_NOW,
		...overrides
	};
}

// ============================================================
// Setup: DB novo por teste (fake-indexeddb com nome único)
// ============================================================

let db: MoralGymDatabase;
let repo: DexieExerciseRepository;
let useCase: UpdateExerciseUseCase;
let now: Date;

beforeEach(async () => {
	db = new MoralGymDatabase(`moralgym-exercise-test-${crypto.randomUUID()}`);
	await db.open();
	repo = new DexieExerciseRepository(db);
	now = new Date('2026-04-15T12:00:00.000Z');
	useCase = new UpdateExerciseUseCase({
		exerciseRepository: repo,
		clock: () => now
	});
});

afterEach(async () => {
	await db.delete();
	db.close();
});

// ============================================================
// Cenário principal: criar, editar e validar persistência
// ============================================================

describe('ExerciseEditingFlow — integração com Dexie', () => {
	it('should create exercise and update name via Dexie', async () => {
		const exerciseId = '1';
		const original = makeExercise({ id: exerciseId, name: 'Supino Reto' });

		// 1. Salvar exercício original
		await repo.save(original);

		// 2. Verificar que foi persistido
		let persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Supino Reto');
		expect(persisted?.createdAt).toEqual(FIXED_NOW);

		// 3. Atualizar nome via use case
		const result = await useCase.execute({
			exerciseId,
			name: 'Supino Inclinado'
		});

		// 4. Validar resultado do use case
		expect(result.exercise.name).toBe('Supino Inclinado');
		expect(result.exercise.createdAt).toEqual(FIXED_NOW);
		expect(result.exercise.updatedAt).toEqual(now);

		// 5. Verificar que foi persistido no Dexie
		persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Supino Inclinado');
		expect(persisted?.createdAt).toEqual(FIXED_NOW);
		expect(persisted?.updatedAt).toEqual(now);
	});

	it('should update multiple fields independently', async () => {
		const exerciseId = '2';
		const original = makeExercise({
			id: exerciseId,
			name: 'Supino',
			muscleGroup: 'chest',
			notes: 'Original note'
		});

		await repo.save(original);

		// Update name and notes
		const result = await useCase.execute({
			exerciseId,
			name: 'Supino Inclinado',
			notes: 'Updated note'
		});

		expect(result.exercise.name).toBe('Supino Inclinado');
		expect(result.exercise.notes).toBe('Updated note');
		expect(result.exercise.muscleGroup).toBe('chest');

		// Verify in Dexie
		const persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Supino Inclinado');
		expect(persisted?.notes).toBe('Updated note');
		expect(persisted?.muscleGroup).toBe('chest');
	});

	it('should preserve fields not provided in update', async () => {
		const exerciseId = '3';
		const original = makeExercise({
			id: exerciseId,
			name: 'Supino',
			notes: 'Important note'
		});

		await repo.save(original);

		// Only update name
		await useCase.execute({ exerciseId, name: 'Updated' });

		// Verify notes were preserved
		const persisted = await repo.findById(exerciseId);
		expect(persisted?.notes).toBe('Important note');
	});

	it('should clear notes when setting empty string', async () => {
		const exerciseId = '4';
		const original = makeExercise({
			id: exerciseId,
			notes: 'Old note'
		});

		await repo.save(original);

		// Clear notes
		await useCase.execute({ exerciseId, notes: '' });

		// Verify notes were cleared
		const persisted = await repo.findById(exerciseId);
		expect(persisted?.notes).toBeUndefined();
	});

	it('should update muscleGroup', async () => {
		const exerciseId = '5';
		const original = makeExercise({
			id: exerciseId,
			muscleGroup: 'chest'
		});

		await repo.save(original);

		// Update muscle group
		const result = await useCase.execute({
			exerciseId,
			muscleGroup: 'back'
		});

		expect(result.exercise.muscleGroup).toBe('back');

		// Verify in Dexie
		const persisted = await repo.findById(exerciseId);
		expect(persisted?.muscleGroup).toBe('back');
	});

	it('should maintain createdAt immutability across updates', async () => {
		const exerciseId = '6';
		const createdAtOriginal = new Date('2026-01-15T08:00:00.000Z');
		const original = makeExercise({
			id: exerciseId,
			createdAt: createdAtOriginal
		});

		await repo.save(original);

		// Update multiple times
		await useCase.execute({ exerciseId, name: 'Update 1' });
		await useCase.execute({ exerciseId, name: 'Update 2' });

		// createdAt should never change
		const persisted = await repo.findById(exerciseId);
		expect(persisted?.createdAt).toEqual(createdAtOriginal);
		expect(persisted?.name).toBe('Update 2');
	});

	it('should update updatedAt on each modification', async () => {
		const exerciseId = '7';
		const original = makeExercise({ id: exerciseId });

		await repo.save(original);

		const times: Date[] = [];

		// First update
		now = new Date('2026-04-15T10:00:00.000Z');
		useCase = new UpdateExerciseUseCase({
			exerciseRepository: repo,
			clock: () => now
		});
		await useCase.execute({ exerciseId, name: 'Update 1' });
		times.push(now);

		// Second update
		now = new Date('2026-04-15T11:00:00.000Z');
		useCase = new UpdateExerciseUseCase({
			exerciseRepository: repo,
			clock: () => now
		});
		await useCase.execute({ exerciseId, name: 'Update 2' });
		times.push(now);

		// Verify updatedAt progresses
		const persisted = await repo.findById(exerciseId);
		expect(persisted?.updatedAt).toEqual(times[1]);
	});

	it('should sync with findAll() after update', async () => {
		const ex1 = makeExercise({ id: '1', name: 'Exercise 1' });
		const ex2 = makeExercise({ id: '2', name: 'Exercise 2' });

		await repo.save(ex1);
		await repo.save(ex2);

		// Update first exercise
		await useCase.execute({ exerciseId: '1', name: 'Exercise 1 Updated' });

		// Verify findAll reflects the update
		const all = await repo.findAll();
		expect(all).toHaveLength(2);
		expect(all.find((e) => e.id === '1')?.name).toBe('Exercise 1 Updated');
		expect(all.find((e) => e.id === '2')?.name).toBe('Exercise 2');
	});

	it('should handle sequential updates to same exercise', async () => {
		const exerciseId = '8';
		const original = makeExercise({
			id: exerciseId,
			name: 'Original',
			notes: 'Original note'
		});

		await repo.save(original);

		// Update 1
		await useCase.execute({ exerciseId, name: 'Updated 1' });
		let persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Updated 1');
		expect(persisted?.notes).toBe('Original note');

		// Update 2
		await useCase.execute({ exerciseId, notes: 'Updated note' });
		persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Updated 1');
		expect(persisted?.notes).toBe('Updated note');

		// Update 3
		await useCase.execute({ exerciseId, muscleGroup: 'back' });
		persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Updated 1');
		expect(persisted?.notes).toBe('Updated note');
		expect(persisted?.muscleGroup).toBe('back');
	});

	it('should reject update of non-existent exercise', async () => {
		await expect(
			useCase.execute({ exerciseId: 'nonexistent', name: 'Name' })
		).rejects.toThrow('não encontrado');
	});

	it('should validate through entire use case and repository chain', async () => {
		const exerciseId = '9';
		const original = makeExercise({ id: exerciseId });

		await repo.save(original);

		// Invalid name should be rejected before persistence
		await expect(useCase.execute({ exerciseId, name: '' })).rejects.toThrow();

		// Verify nothing changed
		const persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Supino Reto');
	});

	it('should work with trimming whitespace in Dexie', async () => {
		const exerciseId = '10';
		const original = makeExercise({ id: exerciseId });

		await repo.save(original);

		await useCase.execute({
			exerciseId,
			name: '  Supino Inclinado  ',
			notes: '  New note  '
		});

		const persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Supino Inclinado');
		expect(persisted?.notes).toBe('New note');
	});

	it('should handle Unicode characters and special names', async () => {
		const exerciseId = '11';
		const original = makeExercise({ id: exerciseId });

		await repo.save(original);

		await useCase.execute({
			exerciseId,
			name: 'Supino Declinado - 体操 (Calistenia)',
			notes: '日本語メモ'
		});

		const persisted = await repo.findById(exerciseId);
		expect(persisted?.name).toBe('Supino Declinado - 体操 (Calistenia)');
		expect(persisted?.notes).toBe('日本語メモ');
	});
});
