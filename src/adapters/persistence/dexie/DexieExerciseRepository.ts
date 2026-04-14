import type { ExerciseRepository } from '../../../core/application/ports/repositories/ExerciseRepository';
import type { Exercise } from '../../../core/domain/entities/Exercise';
import type { MuscleGroup } from '../../../core/domain/value-objects/MuscleGroup';
import type { MoralGymDatabase } from './database';
import { exerciseToRecord, recordToExercise } from './mappers';

/**
 * Adapter Dexie para o Port ExerciseRepository.
 * O Core só conhece a interface; esta classe encapsula todo acesso ao IndexedDB.
 */
export class DexieExerciseRepository implements ExerciseRepository {
	constructor(private readonly db: MoralGymDatabase) {}

	async findById(id: string): Promise<Exercise | null> {
		const record = await this.db.exercises.get(id);
		return record ? recordToExercise(record) : null;
	}

	async findAll(): Promise<readonly Exercise[]> {
		const records = await this.db.exercises.orderBy('nameLower').toArray();
		return records.map(recordToExercise);
	}

	async findByMuscleGroup(group: MuscleGroup): Promise<readonly Exercise[]> {
		const records = await this.db.exercises.where('muscleGroup').equals(group).toArray();
		return records.map(recordToExercise);
	}

	async search(query: string): Promise<readonly Exercise[]> {
		const q = query.trim().toLowerCase();
		if (!q) return this.findAll();
		const records = await this.db.exercises
			.where('nameLower')
			.startsWithIgnoreCase(q)
			.toArray();
		return records.map(recordToExercise);
	}

	async save(exercise: Exercise): Promise<void> {
		await this.db.exercises.put(exerciseToRecord(exercise));
	}

	async delete(id: string): Promise<void> {
		await this.db.exercises.delete(id);
	}
}
