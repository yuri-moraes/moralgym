import { beforeEach, describe, expect, it } from 'vitest';
import { UpdateExerciseUseCase } from '../../../../../src/core/application/use-cases/UpdateExerciseUseCase';
import type { Exercise } from '../../../../../src/core/domain/entities/Exercise';
import type { ExerciseRepository } from '../../../../../src/core/application/ports/repositories/ExerciseRepository';

// ============================================================
// Fake — implementação in-memory que cumpre o contrato do Port
// ============================================================

class InMemoryExerciseRepository implements ExerciseRepository {
	private data: Map<string, Exercise> = new Map();

	async findById(id: string): Promise<Exercise | null> {
		return this.data.get(id) ?? null;
	}

	async findAll(): Promise<readonly Exercise[]> {
		return Array.from(this.data.values());
	}

	async findByMuscleGroup() {
		return [];
	}

	async search() {
		return [];
	}

	async save(exercise: Exercise): Promise<void> {
		this.data.set(exercise.id, exercise);
	}

	async delete(id: string): Promise<void> {
		this.data.delete(id);
	}
}

// ============================================================
// Factory helpers para criação de dados determinísticos
// ============================================================

const makeExercise = (over?: Partial<Exercise>): Exercise => ({
	id: crypto.randomUUID(),
	name: 'Supino',
	muscleGroup: 'chest',
	createdAt: new Date('2026-01-01'),
	updatedAt: new Date('2026-01-01'),
	...over
});

// ============================================================
// Setup
// ============================================================

let useCase: UpdateExerciseUseCase;
let repo: InMemoryExerciseRepository;
let now: Date;

beforeEach(() => {
	repo = new InMemoryExerciseRepository();
	now = new Date('2026-04-15');
	useCase = new UpdateExerciseUseCase({
		exerciseRepository: repo,
		clock: () => now
	});
});

// ============================================================
// Caminho feliz
// ============================================================

describe('UpdateExerciseUseCase — caminho feliz', () => {
	it('should update exercise name only', async () => {
		const original = makeExercise({ id: '1', name: 'Old Name' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', name: 'New Name' });

		expect(result.exercise.name).toBe('New Name');
		expect(result.exercise.muscleGroup).toBe('chest');
		expect(result.exercise.createdAt).toEqual(original.createdAt);
		expect(result.exercise.updatedAt).toEqual(now);
	});

	it('should update muscleGroup only', async () => {
		const original = makeExercise({ id: '1', muscleGroup: 'chest' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', muscleGroup: 'back' });

		expect(result.exercise.muscleGroup).toBe('back');
		expect(result.exercise.name).toBe('Supino');
		expect(result.exercise.createdAt).toEqual(original.createdAt);
		expect(result.exercise.updatedAt).toEqual(now);
	});

	it('should update notes only', async () => {
		const original = makeExercise({ id: '1', notes: 'Old note' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', notes: 'New note' });

		expect(result.exercise.notes).toBe('New note');
		expect(result.exercise.name).toBe('Supino');
		expect(result.exercise.createdAt).toEqual(original.createdAt);
		expect(result.exercise.updatedAt).toEqual(now);
	});

	it('should update multiple fields independently', async () => {
		const original = makeExercise({
			id: '1',
			name: 'Supino',
			muscleGroup: 'chest',
			notes: 'Old note'
		});
		await repo.save(original);

		const result = await useCase.execute({
			exerciseId: '1',
			name: 'Supino Inclinado',
			notes: 'New note'
		});

		expect(result.exercise.name).toBe('Supino Inclinado');
		expect(result.exercise.muscleGroup).toBe('chest');
		expect(result.exercise.notes).toBe('New note');
		expect(result.exercise.createdAt).toEqual(original.createdAt);
		expect(result.exercise.updatedAt).toEqual(now);
	});

	it('should preserve fields not provided in input', async () => {
		const original = makeExercise({
			id: '1',
			name: 'Supino',
			muscleGroup: 'chest',
			notes: 'Important note'
		});
		await repo.save(original);

		await useCase.execute({ exerciseId: '1', name: 'Updated' });

		const updated = await repo.findById('1');
		expect(updated?.notes).toBe('Important note');
		expect(updated?.muscleGroup).toBe('chest');
	});

	it('should trim whitespace from name and notes', async () => {
		const original = makeExercise({ id: '1' });
		await repo.save(original);

		const result = await useCase.execute({
			exerciseId: '1',
			name: '  Supino Inclinado  ',
			notes: '  New note  '
		});

		expect(result.exercise.name).toBe('Supino Inclinado');
		expect(result.exercise.notes).toBe('New note');
	});

	it('should clear notes when setting empty string', async () => {
		const original = makeExercise({ id: '1', notes: 'Old note' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', notes: '' });

		expect(result.exercise.notes).toBeUndefined();
	});

	it('should clear notes when setting whitespace-only string', async () => {
		const original = makeExercise({ id: '1', notes: 'Old note' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', notes: '   ' });

		expect(result.exercise.notes).toBeUndefined();
	});

	it('should persist updated exercise to repository', async () => {
		const original = makeExercise({ id: '1', name: 'Old' });
		await repo.save(original);

		await useCase.execute({ exerciseId: '1', name: 'Updated' });

		const persisted = await repo.findById('1');
		expect(persisted?.name).toBe('Updated');
		expect(persisted?.updatedAt).toEqual(now);
	});
});

// ============================================================
// Imutabilidade de timestamps
// ============================================================

describe('UpdateExerciseUseCase — imutabilidade de timestamps', () => {
	it('should preserve createdAt (immutable)', async () => {
		const createdAtOriginal = new Date('2026-01-01');
		const original = makeExercise({ id: '1', createdAt: createdAtOriginal });
		await repo.save(original);

		await useCase.execute({ exerciseId: '1', name: 'Updated' });

		const updated = await repo.findById('1');
		expect(updated?.createdAt).toEqual(createdAtOriginal);
		expect(updated?.createdAt).not.toEqual(now);
	});

	it('should always update updatedAt to current time', async () => {
		const original = makeExercise({ id: '1', updatedAt: new Date('2026-02-01') });
		await repo.save(original);

		await useCase.execute({ exerciseId: '1', name: 'Updated' });

		const updated = await repo.findById('1');
		expect(updated?.updatedAt).toEqual(now);
		expect(updated?.updatedAt).not.toEqual(new Date('2026-02-01'));
	});

	it('should update updatedAt even when only updating notes', async () => {
		const original = makeExercise({ id: '1', updatedAt: new Date('2026-02-01') });
		await repo.save(original);

		await useCase.execute({ exerciseId: '1', notes: 'New note' });

		const updated = await repo.findById('1');
		expect(updated?.updatedAt).toEqual(now);
	});
});

// ============================================================
// Validações
// ============================================================

describe('UpdateExerciseUseCase — validações', () => {
	beforeEach(async () => {
		const original = makeExercise({ id: '1' });
		await repo.save(original);
	});

	it('should reject non-existent exercise', async () => {
		await expect(useCase.execute({ exerciseId: 'nonexistent', name: 'New' })).rejects.toThrow(
			'não encontrado'
		);
	});

	it('should reject empty exerciseId', async () => {
		await expect(useCase.execute({ exerciseId: '', name: 'New' })).rejects.toThrow(
			'exerciseId'
		);
	});

	it('should reject whitespace-only exerciseId', async () => {
		await expect(useCase.execute({ exerciseId: '   ', name: 'New' })).rejects.toThrow(
			'exerciseId'
		);
	});

	it('should reject name with length 0 (empty after trim)', async () => {
		await expect(useCase.execute({ exerciseId: '1', name: '' })).rejects.toThrow(
			'1 caractere'
		);
	});

	it('should reject name with whitespace-only', async () => {
		await expect(useCase.execute({ exerciseId: '1', name: '   ' })).rejects.toThrow(
			'1 caractere'
		);
	});

	it('should reject name longer than 100 characters', async () => {
		const longName = 'x'.repeat(101);
		await expect(useCase.execute({ exerciseId: '1', name: longName })).rejects.toThrow(
			'100 caracteres'
		);
	});

	it('should accept name with exactly 100 characters', async () => {
		const exactName = 'x'.repeat(100);
		const result = await useCase.execute({ exerciseId: '1', name: exactName });
		expect(result.exercise.name).toBe(exactName);
	});

	it('should accept name with exactly 1 character', async () => {
		const result = await useCase.execute({ exerciseId: '1', name: 'x' });
		expect(result.exercise.name).toBe('x');
	});

	it('should reject invalid muscleGroup', async () => {
		await expect(
			useCase.execute({ exerciseId: '1', muscleGroup: 'invalid_group' as any })
		).rejects.toThrow('muscleGroup inválido');
	});

	it('should accept valid muscleGroup values', async () => {
		const validGroups = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
		for (const group of validGroups) {
			const result = await useCase.execute({
				exerciseId: '1',
				muscleGroup: group as any
			});
			expect(result.exercise.muscleGroup).toBe(group);
		}
	});

	it('should not persist when validation fails', async () => {
		const original = await repo.findById('1');
		const originalUpdatedAt = original?.updatedAt;

		await expect(useCase.execute({ exerciseId: '1', name: '' })).rejects.toThrow();

		const notChanged = await repo.findById('1');
		expect(notChanged?.updatedAt).toEqual(originalUpdatedAt);
	});
});

// ============================================================
// Media handling
// ============================================================

describe('UpdateExerciseUseCase — media handling', () => {
	it('should preserve media when not provided in input', async () => {
		const media = { type: 'image' as const, url: 'http://example.com/img.jpg' };
		const original = makeExercise({ id: '1', media });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', name: 'Updated' });

		expect(result.exercise.media).toEqual(media);
	});

	it('should handle exercise without media', async () => {
		const original = makeExercise({ id: '1' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', name: 'Updated' });

		expect(result.exercise.media).toBeUndefined();
	});
});

// ============================================================
// Edge cases
// ============================================================

describe('UpdateExerciseUseCase — edge cases', () => {
	it('should handle updating same value', async () => {
		const original = makeExercise({ id: '1', name: 'Supino' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', name: 'Supino' });

		expect(result.exercise.name).toBe('Supino');
		expect(result.exercise.updatedAt).toEqual(now);
	});

	it('should handle no fields provided (only exerciseId)', async () => {
		const original = makeExercise({ id: '1', name: 'Supino', updatedAt: new Date('2026-02-01') });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1' });

		expect(result.exercise.name).toBe('Supino');
		expect(result.exercise.updatedAt).toEqual(now);
	});

	it('should allow updating only notes to valid value', async () => {
		const original = makeExercise({ id: '1' });
		await repo.save(original);

		const result = await useCase.execute({ exerciseId: '1', notes: 'Brand new note' });

		expect(result.exercise.notes).toBe('Brand new note');
		expect(result.exercise.updatedAt).toEqual(now);
	});

	it('should handle unicode characters in name and notes', async () => {
		const original = makeExercise({ id: '1' });
		await repo.save(original);

		const result = await useCase.execute({
			exerciseId: '1',
			name: 'Supino Declinado - 体操',
			notes: '日本語メモ'
		});

		expect(result.exercise.name).toBe('Supino Declinado - 体操');
		expect(result.exercise.notes).toBe('日本語メモ');
	});
});
