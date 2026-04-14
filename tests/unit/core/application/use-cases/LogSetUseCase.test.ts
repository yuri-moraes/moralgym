import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
	DateRange,
	WorkoutLogRepository
} from '../../../../../src/core/application/ports/repositories/WorkoutLogRepository';
import type { WorkoutLog } from '../../../../../src/core/domain/entities/WorkoutLog';
import { LogSetUseCase } from '../../../../../src/core/application/use-cases/LogSetUseCase';
import type { StartRestTimerUseCase } from '../../../../../src/core/application/use-cases/StartRestTimerUseCase';

// ============================================================
// Fakes — implementações in-memory que cumprem os contratos dos Ports.
// Propositalmente sem Dexie, sem IndexedDB, sem browser: o teste prova
// que LogSetUseCase é puro e independe de infraestrutura.
// ============================================================

class InMemoryWorkoutLogRepository implements WorkoutLogRepository {
	readonly logs: WorkoutLog[] = [];

	async findById(id: string): Promise<WorkoutLog | null> {
		return this.logs.find((l) => l.id === id) ?? null;
	}
	async findByExercise(exerciseId: string, range?: DateRange) {
		return this.logs.filter(
			(l) =>
				l.exerciseId === exerciseId &&
				(!range || (l.performedAt >= range.from && l.performedAt <= range.to))
		);
	}
	async findBySplit(splitId: string, range?: DateRange) {
		return this.logs.filter(
			(l) =>
				l.splitId === splitId &&
				(!range || (l.performedAt >= range.from && l.performedAt <= range.to))
		);
	}
	async findLastSession(exerciseId: string) {
		return this.logs.filter((l) => l.exerciseId === exerciseId);
	}
	async save(log: WorkoutLog): Promise<void> {
		this.logs.push(log);
	}
	async saveMany(batch: readonly WorkoutLog[]): Promise<void> {
		this.logs.push(...batch);
	}
	async delete(id: string): Promise<void> {
		const idx = this.logs.findIndex((l) => l.id === id);
		if (idx >= 0) this.logs.splice(idx, 1);
	}
}

// Não implementamos a classe real — o LogSetUseCase só conhece
// `execute(input)`. Um mock com `vi.fn()` basta e mantém o teste focado.
function makeStartRestTimerMock() {
	return {
		execute: vi.fn(),
		cancel: vi.fn()
	} as unknown as StartRestTimerUseCase & {
		execute: ReturnType<typeof vi.fn>;
		cancel: ReturnType<typeof vi.fn>;
	};
}

// ============================================================
// Setup determinístico
// ============================================================

const FIXED_NOW = new Date('2026-04-14T10:00:00.000Z');
const clock = () => FIXED_NOW;

let nextId = 0;
const idFactory = () => `log-${++nextId}`;

let repo: InMemoryWorkoutLogRepository;
let restTimer: ReturnType<typeof makeStartRestTimerMock>;
let useCase: LogSetUseCase;

beforeEach(() => {
	nextId = 0;
	repo = new InMemoryWorkoutLogRepository();
	restTimer = makeStartRestTimerMock();
	useCase = new LogSetUseCase({
		workoutLogs: repo,
		startRestTimer: restTimer,
		clock,
		idFactory
	});
});

// ============================================================
// Caminho feliz
// ============================================================

describe('LogSetUseCase — caminho feliz', () => {
	it('persiste a série com os metadados injetados', async () => {
		const output = await useCase.execute({
			splitId: 'split-A',
			exerciseId: 'ex-supino',
			setNumber: 1,
			reps: 10,
			loadKg: 60,
			rpe: 8,
			notes: 'Pegada média',
			restSeconds: 90
		});

		expect(output.log).toEqual({
			id: 'log-1',
			splitId: 'split-A',
			exerciseId: 'ex-supino',
			performedAt: FIXED_NOW,
			setNumber: 1,
			reps: 10,
			loadKg: 60,
			rpe: 8,
			notes: 'Pegada média'
		});
		expect(repo.logs).toHaveLength(1);
		expect(repo.logs[0]).toBe(output.log);
	});

	it('dispara o cronômetro quando restSeconds > 0', async () => {
		const output = await useCase.execute({
			splitId: 'split-A',
			exerciseId: 'ex-supino',
			setNumber: 2,
			reps: 8,
			loadKg: 70,
			restSeconds: 120
		});

		expect(output.restStarted).toBe(true);
		expect(restTimer.execute).toHaveBeenCalledTimes(1);
		expect(restTimer.execute).toHaveBeenCalledWith({
			totalSeconds: 120,
			exerciseId: 'ex-supino'
		});
	});

	it('NÃO dispara o cronômetro quando restSeconds é 0 ou ausente', async () => {
		const out1 = await useCase.execute({
			splitId: 's',
			exerciseId: 'e',
			setNumber: 1,
			reps: 5,
			loadKg: 40
		});
		const out2 = await useCase.execute({
			splitId: 's',
			exerciseId: 'e',
			setNumber: 2,
			reps: 5,
			loadKg: 40,
			restSeconds: 0
		});

		expect(out1.restStarted).toBe(false);
		expect(out2.restStarted).toBe(false);
		expect(restTimer.execute).not.toHaveBeenCalled();
	});

	it('gera IDs incrementais via idFactory injetada', async () => {
		for (let i = 1; i <= 3; i++) {
			await useCase.execute({
				splitId: 's',
				exerciseId: 'e',
				setNumber: i,
				reps: 8,
				loadKg: 50
			});
		}
		expect(repo.logs.map((l) => l.id)).toEqual(['log-1', 'log-2', 'log-3']);
	});
});

// ============================================================
// Validações de domínio
// ============================================================

describe('LogSetUseCase — validações', () => {
	const base = { splitId: 's', exerciseId: 'e', setNumber: 1, reps: 8, loadKg: 50 };

	it('rejeita setNumber <= 0', async () => {
		await expect(useCase.execute({ ...base, setNumber: 0 })).rejects.toThrow(
			/setNumber/
		);
	});

	it('rejeita reps negativo', async () => {
		await expect(useCase.execute({ ...base, reps: -1 })).rejects.toThrow(/reps/);
	});

	it('rejeita loadKg negativo', async () => {
		await expect(useCase.execute({ ...base, loadKg: -10 })).rejects.toThrow(/loadKg/);
	});

	it('aceita loadKg = 0 (exercícios com peso corporal)', async () => {
		const out = await useCase.execute({ ...base, loadKg: 0 });
		expect(out.log.loadKg).toBe(0);
		expect(repo.logs).toHaveLength(1);
	});

	it('rejeita rpe fora da faixa 1..10', async () => {
		await expect(useCase.execute({ ...base, rpe: 0 })).rejects.toThrow(/rpe/);
		await expect(useCase.execute({ ...base, rpe: 11 })).rejects.toThrow(/rpe/);
	});

	it('não persiste nada quando a validação falha', async () => {
		await expect(useCase.execute({ ...base, loadKg: -5 })).rejects.toThrow();
		expect(repo.logs).toHaveLength(0);
		expect(restTimer.execute).not.toHaveBeenCalled();
	});
});
