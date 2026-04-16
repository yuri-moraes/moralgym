import type { Exercise } from '../../domain/entities/Exercise';
import type { ExerciseMedia } from '../../domain/value-objects/ExerciseMedia';
import type { MuscleGroup } from '../../domain/value-objects/MuscleGroup';
import type { ExerciseRepository } from '../ports/repositories/ExerciseRepository';
import type { MediaProcessor } from '../ports/MediaProcessor';
import { isMuscleGroup } from '../../domain/value-objects/MuscleGroup';

export interface UpdateExerciseInput {
	readonly exerciseId: string;
	readonly name?: string; // 1-100 chars, opcional
	readonly muscleGroup?: MuscleGroup; // opcional
	readonly notes?: string; // opcional
	readonly mediaFile?: File; // opcional, substitui anterior
}

export interface UpdateExerciseOutput {
	readonly exercise: Exercise;
}

interface Dependencies {
	readonly exercises: ExerciseRepository;
	readonly mediaProcessor?: MediaProcessor;
	readonly clock?: () => Date;
}

/**
 * Atualiza um Exercício existente com suporte opcional a substituição de mídia.
 *
 * Responsabilidades:
 *  - Validar input (exerciseId obrigatório, campos opcionais válidos).
 *  - Buscar exercício existente no repositório.
 *  - Se mediaFile fornecido, processar via MediaProcessor.
 *  - Merge parcial: manter campos não fornecidos do exercício anterior.
 *  - createdAt é imutável; updatedAt é sempre renovado.
 *  - Persister via ExerciseRepository.
 */
export class UpdateExerciseUseCase {
	private readonly clock: () => Date;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
	}

	async execute(input: UpdateExerciseInput): Promise<UpdateExerciseOutput> {
		this.validate(input);

		// Buscar exercício existente
		const existing = await this.deps.exercises.findById(input.exerciseId);
		if (!existing) {
			throw new Error(`Exercício com ID ${input.exerciseId} não encontrado.`);
		}

		const now = this.clock();
		let media: ExerciseMedia | undefined = existing.media;

		// Se houver arquivo, processar via MediaProcessor
		if (input.mediaFile && this.deps.mediaProcessor) {
			media = await this.deps.mediaProcessor.process(input.mediaFile);
		}

		// Merge parcial: sobrescrever apenas campos fornecidos
		const updated: Exercise = {
			id: existing.id,
			name: input.name !== undefined ? input.name.trim() : existing.name,
			muscleGroup: input.muscleGroup ?? existing.muscleGroup,
			notes: input.notes !== undefined ? (input.notes.trim() || undefined) : existing.notes,
			media,
			createdAt: existing.createdAt, // IMUTÁVEL
			updatedAt: now // SEMPRE renovado
		};

		await this.deps.exercises.save(updated);

		return { exercise: updated };
	}

	private validate(input: UpdateExerciseInput): void {
		if (!input.exerciseId || !input.exerciseId.trim()) {
			throw new Error('exerciseId é obrigatório.');
		}

		if (input.name !== undefined) {
			const trimmed = input.name.trim();
			if (trimmed.length === 0) {
				throw new Error('O nome do exercício deve ter pelo menos 1 caractere.');
			}
			if (trimmed.length > 100) {
				throw new Error('O nome do exercício deve ter até 100 caracteres.');
			}
		}

		if (input.muscleGroup !== undefined && !isMuscleGroup(input.muscleGroup)) {
			throw new Error('muscleGroup inválido.');
		}
	}
}
