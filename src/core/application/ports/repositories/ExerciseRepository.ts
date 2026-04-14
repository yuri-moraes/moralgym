import type { Exercise } from '../../../domain/entities/Exercise';
import type { MuscleGroup } from '../../../domain/value-objects/MuscleGroup';

/**
 * Port — contrato de persistência de Exercícios.
 * O Core NÃO conhece IndexedDB/Dexie: depende apenas desta interface.
 * Um Adapter concreto (ex.: DexieExerciseRepository) implementa este contrato.
 */
export interface ExerciseRepository {
	findById(id: string): Promise<Exercise | null>;
	findAll(): Promise<readonly Exercise[]>;
	findByMuscleGroup(group: MuscleGroup): Promise<readonly Exercise[]>;
	search(query: string): Promise<readonly Exercise[]>;
	save(exercise: Exercise): Promise<void>;
	delete(id: string): Promise<void>;
}
