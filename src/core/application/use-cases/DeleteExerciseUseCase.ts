import type { ExerciseRepository } from '../ports/repositories/ExerciseRepository';

export interface DeleteExerciseInput {
	readonly exerciseId: string;
}

interface Dependencies {
	readonly exercises: ExerciseRepository;
}

/**
 * Remove um Exercício existente.
 *
 * Responsabilidades:
 *  - Validar que o exercício existe.
 *  - Delegar ao repositório a remoção.
 *  - O repositório garante que referências em SplitExercise sejam limpar (cascade).
 */
export class DeleteExerciseUseCase {
	constructor(private readonly deps: Dependencies) {}

	async execute(input: DeleteExerciseInput): Promise<void> {
		const exercise = await this.deps.exercises.findById(input.exerciseId);
		if (!exercise) {
			throw new Error(`Exercício com ID ${input.exerciseId} não encontrado.`);
		}

		await this.deps.exercises.delete(input.exerciseId);
	}
}
