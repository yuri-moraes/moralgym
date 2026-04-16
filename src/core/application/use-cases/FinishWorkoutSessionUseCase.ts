import type { WorkoutSession } from '../../domain/entities/WorkoutSession';
import type { WorkoutSessionRepository } from '../ports/repositories/WorkoutSessionRepository';

export interface FinishWorkoutSessionInput {
	readonly sessionId?: string;
}

export interface FinishWorkoutSessionOutput {
	readonly session: WorkoutSession;
}

interface Dependencies {
	readonly sessions: WorkoutSessionRepository;
	readonly clock?: () => Date;
}

/**
 * Finaliza uma Sessão de Treino em andamento.
 *
 * Responsabilidades:
 *  - Encontrar a sessão ativa (ou usar sessionId se fornecido).
 *  - Marcar como 'finished' com timestamp.
 *  - Persister a mudança.
 */
export class FinishWorkoutSessionUseCase {
	private readonly clock: () => Date;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
	}

	async execute(input: FinishWorkoutSessionInput): Promise<FinishWorkoutSessionOutput> {
		let session: WorkoutSession | null = null;

		if (input.sessionId) {
			session = await this.deps.sessions.findById(input.sessionId);
		} else {
			session = await this.deps.sessions.findActive();
		}

		if (!session) {
			throw new Error('Nenhuma sessão de treino ativa encontrada.');
		}

		const finishedSession: WorkoutSession = {
			...session,
			status: 'finished',
			finishedAt: this.clock()
		};

		await this.deps.sessions.save(finishedSession);

		return { session: finishedSession };
	}
}
