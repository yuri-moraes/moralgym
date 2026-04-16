import type { Split } from '../../../domain/entities/Split';

/**
 * Port — contrato de persistência de Splits (dias da rotina).
 * O Core NÃO conhece IndexedDB/Dexie: depende apenas desta interface.
 * Um Adapter concreto (ex.: DexieSplitRepository) implementa este contrato.
 */
export interface SplitRepository {
	findById(id: string): Promise<Split | null>;
	findAll(): Promise<readonly Split[]>;
	findByRoutineId(routineId: string): Promise<readonly Split[]>;
	save(split: Split): Promise<void>;
	delete(id: string): Promise<void>;
}
