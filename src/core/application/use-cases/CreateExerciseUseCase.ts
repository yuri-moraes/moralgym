import type { Exercise } from '../../domain/entities/Exercise';
import type { ExerciseMedia } from '../../domain/value-objects/ExerciseMedia';
import type { MuscleGroup } from '../../domain/value-objects/MuscleGroup';
import type { ExerciseRepository } from '../ports/repositories/ExerciseRepository';
import type { MediaProcessor } from '../ports/MediaProcessor';

export interface CreateExerciseInput {
	readonly name: string;
	readonly muscleGroup: MuscleGroup;
	readonly notes?: string;
	readonly mediaFile?: File;
}

export interface CreateExerciseOutput {
	readonly exercise: Exercise;
}

interface Dependencies {
	readonly exercises: ExerciseRepository;
	readonly mediaProcessor?: MediaProcessor;
	readonly clock?: () => Date;
	readonly idFactory?: () => string;
}

/**
 * Cria um novo Exercício com suporte opcional a mídia.
 *
 * Responsabilidades:
 *  - Validar input (nome obrigatório, muscleGroup válido, etc).
 *  - Se mediaFile fornecido, processar via MediaProcessor.
 *  - Gerar IDs e timestamps.
 *  - Persister via ExerciseRepository.
 */
export class CreateExerciseUseCase {
	private readonly clock: () => Date;
	private readonly idFactory: () => string;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
		this.idFactory = deps.idFactory ?? (() => crypto.randomUUID());
	}

	async execute(input: CreateExerciseInput): Promise<CreateExerciseOutput> {
		this.validate(input);

		const now = this.clock();
		let media: ExerciseMedia | undefined;

		// Se houver arquivo, processar via MediaProcessor
		if (input.mediaFile && this.deps.mediaProcessor) {
			media = await this.deps.mediaProcessor.process(input.mediaFile);
		}

		const exercise: Exercise = {
			id: this.idFactory(),
			name: input.name.trim(),
			muscleGroup: input.muscleGroup,
			media,
			notes: input.notes?.trim() || undefined,
			createdAt: now,
			updatedAt: now
		};

		await this.deps.exercises.save(exercise);

		return { exercise };
	}

	private validate(input: CreateExerciseInput): void {
		if (!input.name || input.name.trim().length === 0) {
			throw new Error('O nome do exercício é obrigatório.');
		}
		if (input.name.trim().length > 100) {
			throw new Error('O nome do exercício deve ter até 100 caracteres.');
		}
	}
}
