import { describe, it, expect } from 'vitest';
import {
	totalVolume,
	volumeByExercise,
	estimated1RM
} from '../../../src/core/domain/services/VolumeCalculator';
import type { WorkoutLog } from '../../../src/core/domain/entities/WorkoutLog';

const log = (over: Partial<WorkoutLog>): WorkoutLog => ({
	id: crypto.randomUUID(),
	splitId: 's',
	exerciseId: 'e1',
	performedAt: new Date(),
	setNumber: 1,
	reps: 10,
	loadKg: 50,
	...over
});

describe('VolumeCalculator', () => {
	it('soma reps*carga em todas as séries', () => {
		const logs = [log({ reps: 10, loadKg: 50 }), log({ reps: 8, loadKg: 60 })];
		expect(totalVolume(logs)).toBe(500 + 480);
	});

	it('agrupa volume por exercício', () => {
		const logs = [
			log({ exerciseId: 'a', reps: 10, loadKg: 50 }),
			log({ exerciseId: 'b', reps: 5, loadKg: 100 })
		];
		const result = volumeByExercise(logs);
		expect(result.get('a')).toBe(500);
		expect(result.get('b')).toBe(500);
	});

	it('estima 1RM pela fórmula de Epley', () => {
		expect(estimated1RM(10, 100)).toBeCloseTo(133.33, 2);
		expect(estimated1RM(0, 100)).toBe(0);
	});
});
