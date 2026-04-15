import type { WorkoutLog } from '../../../domain/entities/WorkoutLog';

export interface DateRange {
	readonly from: Date;
	readonly to: Date;
}

/**
 * Port — histórico de execuções. Consultas por exercício/data alimentam
 * cálculos de volume, progressão de carga e estimativa de 1RM no domínio.
 */
export interface WorkoutLogRepository {
	findById(id: string): Promise<WorkoutLog | null>;
	findAll(limit?: number): Promise<readonly WorkoutLog[]>;
	findByExercise(exerciseId: string, range?: DateRange): Promise<readonly WorkoutLog[]>;
	findBySplit(splitId: string, range?: DateRange): Promise<readonly WorkoutLog[]>;
	findLastSession(exerciseId: string): Promise<readonly WorkoutLog[]>;
	save(log: WorkoutLog): Promise<void>;
	saveMany(logs: readonly WorkoutLog[]): Promise<void>;
	delete(id: string): Promise<void>;
}
