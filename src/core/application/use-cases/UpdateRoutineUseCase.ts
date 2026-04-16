import type { Routine, SplitCount } from '../../domain/entities/Routine';
import type { Split } from '../../domain/entities/Split';
import type { RoutineRepository } from '../ports/repositories/RoutineRepository';

export interface UpdateRoutineInput {
	readonly routineId: string;
	readonly name?: string;
	readonly description?: string;
	readonly splitCount?: SplitCount;
}

export interface UpdateRoutineOutput {
	readonly routine: Routine;
	readonly splits: readonly Split[];
}

interface Dependencies {
	readonly routines: RoutineRepository;
	readonly clock?: () => Date;
	readonly idFactory?: () => string;
}

const SPLIT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Atualiza uma Rotina existente: nome, descrição e/ou splitCount.
 *
 * Responsabilidades:
 *  - Carregar a rotina atual e seus splits.
 *  - Validar inputs (nome obrigatório se alterado, splitCount 1-5, etc).
 *  - Se splitCount muda, reconstruir splits mantendo exercícios dos existentes.
 *  - Delegar persistência ao `RoutineRepository.save`.
 *  - Manter o timestamp `updatedAt`.
 */
export class UpdateRoutineUseCase {
	private readonly clock: () => Date;
	private readonly idFactory: () => string;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
		this.idFactory = deps.idFactory ?? (() => crypto.randomUUID());
	}

	async execute(input: UpdateRoutineInput): Promise<UpdateRoutineOutput> {
		const routine = await this.deps.routines.findById(input.routineId);
		if (!routine) {
			throw new Error(`Rotina com ID ${input.routineId} não encontrada.`);
		}

		const now = this.clock();
		const currentSplits = await this.deps.routines.findSplits(input.routineId);

		// Preparar dados atualizados (fallback para valores atuais)
		const newName = input.name !== undefined ? input.name.trim() : routine.name;
		const newDescription = input.description !== undefined ? input.description.trim() || undefined : routine.description;
		const newSplitCount = input.splitCount ?? routine.splitCount;

		// Validação
		this.validate({
			name: newName,
			description: newDescription,
			splitCount: newSplitCount
		});

		// Construir rotina atualizada
		const updatedRoutine: Routine = {
			...routine,
			name: newName,
			description: newDescription,
			splitCount: newSplitCount,
			updatedAt: now
		};

		// Reconstruir splits se splitCount mudou
		const updatedSplits: Split[] = this.reconcileSplits(
			currentSplits,
			newSplitCount,
			now,
			input.routineId
		);

		await this.deps.routines.save(updatedRoutine, updatedSplits);

		return { routine: updatedRoutine, splits: updatedSplits };
	}

	private reconcileSplits(
		currentSplits: readonly Split[],
		newSplitCount: SplitCount,
		now: Date,
		routineId: string
	): Split[] {
		// Se o splitCount não mudou, preservar splits como estão
		if (currentSplits.length === newSplitCount) {
			return currentSplits.map(s => ({ ...s, updatedAt: now }));
		}

		// Se aumentou: criar novos splits
		if (newSplitCount > currentSplits.length) {
			const newSplits: Split[] = [...currentSplits];
			for (let i = currentSplits.length; i < newSplitCount; i++) {
				newSplits.push({
					id: this.idFactory(),
					routineId,
					label: SPLIT_LABELS[i],
					orderIndex: i,
					exercises: [],
					createdAt: now,
					updatedAt: now
				});
			}
			return newSplits;
		}

		// Se diminuiu: truncar e manter apenas os que cabem
		return currentSplits.slice(0, newSplitCount).map((s, index) => ({
			...s,
			label: SPLIT_LABELS[index],
			orderIndex: index,
			updatedAt: now
		}));
	}

	private validate(input: {
		name: string;
		description?: string;
		splitCount: SplitCount;
	}): void {
		if (!input.name || input.name.length === 0) {
			throw new Error('O nome da ficha é obrigatório.');
		}
		if (input.name.length > 80) {
			throw new Error('O nome da ficha deve ter até 80 caracteres.');
		}
		if (input.splitCount < 1 || input.splitCount > 5) {
			throw new Error('A divisão deve ter entre 1 e 5 splits.');
		}
	}
}
