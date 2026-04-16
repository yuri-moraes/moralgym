import type { RoutineRepository } from '../ports/repositories/RoutineRepository';

export interface DeleteRoutineInput {
	readonly routineId: string;
}

interface Dependencies {
	readonly routines: RoutineRepository;
}

/**
 * Remove uma Rotina e todos seus Splits associados.
 *
 * Responsabilidades:
 *  - Validar que a rotina existe.
 *  - Delegar ao repositório a remoção em cascata (rotina + splits).
 *  - O repositório garante atomicidade.
 */
export class DeleteRoutineUseCase {
	constructor(private readonly deps: Dependencies) {}

	async execute(input: DeleteRoutineInput): Promise<void> {
		const routine = await this.deps.routines.findById(input.routineId);
		if (!routine) {
			throw new Error(`Rotina com ID ${input.routineId} não encontrada.`);
		}

		await this.deps.routines.delete(input.routineId);
	}
}
