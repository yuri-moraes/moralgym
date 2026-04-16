import type { WorkoutSession } from '../../domain/entities/WorkoutSession';
import type { RoutineRepository } from '../ports/repositories/RoutineRepository';
import type { WorkoutSessionRepository } from '../ports/repositories/WorkoutSessionRepository';

export interface StartWorkoutSessionInput {
	readonly routineId: string;
	readonly splitId: string;
}

export interface StartWorkoutSessionOutput {
	readonly session: WorkoutSession;
}

interface Dependencies {
	readonly routines: RoutineRepository;
	readonly sessions: WorkoutSessionRepository;
	readonly clock?: () => Date;
	readonly idFactory?: () => string;
}

/**
 * Inicia uma nova Sessão de Treino.
 *
 * Responsabilidades:
 *  - Validar que a rotina e split existem.
 *  - Finalizar qualquer sessão anterior ativa.
 *  - Criar e persister a nova sessão.
 */
export class StartWorkoutSessionUseCase {
	private readonly clock: () => Date;
	private readonly idFactory: () => string;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
		this.idFactory = deps.idFactory ?? (() => crypto.randomUUID());
	}

	async execute(input: StartWorkoutSessionInput): Promise<StartWorkoutSessionOutput> {
		const routine = await this.deps.routines.findById(input.routineId);
		if (!routine) {
			throw new Error(`Rotina com ID ${input.routineId} não encontrada.`);
		}

		const splits = await this.deps.routines.findSplits(input.routineId);
		const splitExists = splits.some(s => s.id === input.splitId);
		if (!splitExists) {
			throw new Error(`Split com ID ${input.splitId} não encontrado.`);
		}

		// Finalizar sessão anterior se houver
		const previousSession = await this.deps.sessions.findActive();
		if (previousSession) {
			await this.deps.sessions.delete(previousSession.id);
		}

		// Criar nova sessão
		const session: WorkoutSession = {
			id: this.idFactory(),
			routineId: input.routineId,
			splitId: input.splitId,
			status: 'active',
			startedAt: this.clock()
		};

		await this.deps.sessions.save(session);

		return { session };
	}
}
