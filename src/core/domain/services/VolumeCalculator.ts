import type { WorkoutLog } from '../entities/WorkoutLog';

/**
 * Volume total = soma de (reps * carga) das séries válidas.
 * Serviço de domínio puro — sem I/O, 100% testável no Vitest.
 */
export function totalVolume(logs: readonly WorkoutLog[]): number {
	return logs.reduce((sum, log) => sum + log.reps * log.loadKg, 0);
}

export function volumeByExercise(logs: readonly WorkoutLog[]): Map<string, number> {
	const result = new Map<string, number>();
	for (const log of logs) {
		const current = result.get(log.exerciseId) ?? 0;
		result.set(log.exerciseId, current + log.reps * log.loadKg);
	}
	return result;
}

export function estimated1RM(reps: number, loadKg: number): number {
	if (reps <= 0 || loadKg <= 0) return 0;
	// Fórmula de Epley
	return loadKg * (1 + reps / 30);
}
