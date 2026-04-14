import type { Routine } from '../../../domain/entities/Routine';
import type { Split } from '../../../domain/entities/Split';

/**
 * Port — ciclo de vida de Rotinas e seus Splits (Treino A/B/C...).
 * `save` é transacional: Routine + Splits devem persistir juntos ou falhar juntos.
 */
export interface RoutineRepository {
	findById(id: string): Promise<Routine | null>;
	findActive(): Promise<Routine | null>;
	findAll(): Promise<readonly Routine[]>;
	findSplits(routineId: string): Promise<readonly Split[]>;
	save(routine: Routine, splits: readonly Split[]): Promise<void>;
	setActive(id: string): Promise<void>;
	delete(id: string): Promise<void>;
}
