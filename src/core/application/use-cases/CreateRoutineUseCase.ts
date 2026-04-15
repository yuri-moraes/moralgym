import type { Routine, SplitCount } from '../../domain/entities/Routine';
import type { Split } from '../../domain/entities/Split';
import type { RoutineRepository } from '../ports/repositories/RoutineRepository';

export interface CreateRoutineSplitInput {
	/** Nome opcional do split. Quando ausente, a UI mostra `Treino {label}`. */
	readonly name?: string;
}

export interface CreateRoutineInput {
	readonly name: string;
	readonly description?: string;
	readonly splitCount: SplitCount;
	/**
	 * Deve ter EXATAMENTE `splitCount` itens. Ordem da lista define o
	 * `orderIndex` (0..n) e o `label` (A..E) do split.
	 */
	readonly splits: readonly CreateRoutineSplitInput[];
	/** Se verdadeiro, a rotina recém-criada vira a ativa. Default: true. */
	readonly setAsActive?: boolean;
}

export interface CreateRoutineOutput {
	readonly routine: Routine;
	readonly splits: readonly Split[];
}

interface Dependencies {
	readonly routines: RoutineRepository;
	readonly clock?: () => Date;
	readonly idFactory?: () => string;
}

/** Letras de label para até 5 splits — A, B, C, D, E. */
const SPLIT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;

/**
 * Cria uma nova Rotina com seus Splits em uma única operação transacional.
 *
 * Responsabilidades:
 *  - Validar input (nome presente, splitCount entre 1 e 5, quantidade de
 *    splits compatível com splitCount).
 *  - Gerar IDs estáveis e timestamps consistentes (todos compartilham o mesmo
 *    `now` para facilitar auditoria e ordenação).
 *  - Delegar a persistência ao `RoutineRepository.save`, que garante atomicidade.
 *  - Se `setAsActive` (default true), marcar a rotina como ativa — o repositório
 *    cuida de desativar qualquer outra rotina que já estivesse ativa.
 *
 * Por que viver no core e não na UI:
 *  - Mantém a regra de negócio (mapear `splitCount` → splits A/B/C...)
 *    coberta por testes unitários puros, sem depender de Svelte ou Dexie.
 */
export class CreateRoutineUseCase {
	private readonly clock: () => Date;
	private readonly idFactory: () => string;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
		this.idFactory = deps.idFactory ?? (() => crypto.randomUUID());
	}

	async execute(input: CreateRoutineInput): Promise<CreateRoutineOutput> {
		this.validate(input);

		const now = this.clock();
		const setAsActive = input.setAsActive ?? true;
		const routineId = this.idFactory();

		const routine: Routine = {
			id: routineId,
			name: input.name.trim(),
			description: input.description?.trim() || undefined,
			splitCount: input.splitCount,
			isActive: setAsActive,
			createdAt: now,
			updatedAt: now
		};

		const splits: Split[] = input.splits.map((s, index) => ({
			id: this.idFactory(),
			routineId,
			label: SPLIT_LABELS[index],
			name: s.name?.trim() || undefined,
			orderIndex: index,
			exercises: [],
			createdAt: now,
			updatedAt: now
		}));

		await this.deps.routines.save(routine, splits);

		// `save` persiste `isActive: true`, mas rodamos `setActive` para
		// garantir o invariante de "no máximo uma ativa por vez" caso o
		// usuário tivesse outra rotina previamente ativa.
		if (setAsActive) {
			await this.deps.routines.setActive(routineId);
		}

		return { routine, splits };
	}

	private validate(input: CreateRoutineInput): void {
		if (!input.name || input.name.trim().length === 0) {
			throw new Error('O nome da ficha é obrigatório.');
		}
		if (input.name.trim().length > 80) {
			throw new Error('O nome da ficha deve ter até 80 caracteres.');
		}
		if (input.splitCount < 1 || input.splitCount > 5) {
			throw new Error('A divisão deve ter entre 1 e 5 splits.');
		}
		if (input.splits.length !== input.splitCount) {
			throw new Error(
				`Número de splits (${input.splits.length}) não bate com splitCount (${input.splitCount}).`
			);
		}
	}
}
