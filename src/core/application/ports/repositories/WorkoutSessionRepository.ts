import type { WorkoutSession } from '../../../domain/entities/WorkoutSession';

/**
 * Port — ciclo de vida de Sessões de Treino (estado da execução ao vivo).
 */
export interface WorkoutSessionRepository {
	findById(id: string): Promise<WorkoutSession | null>;
	findActive(): Promise<WorkoutSession | null>;
	save(session: WorkoutSession): Promise<void>;
	delete(id: string): Promise<void>;
}
