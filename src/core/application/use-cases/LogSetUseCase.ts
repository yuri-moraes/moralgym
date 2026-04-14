import type { WorkoutLog } from '../../domain/entities/WorkoutLog';
import type { WorkoutLogRepository } from '../ports/repositories/WorkoutLogRepository';
import type { StartRestTimerUseCase } from './StartRestTimerUseCase';

export interface LogSetInput {
	readonly splitId: string;
	readonly exerciseId: string;
	readonly setNumber: number;
	readonly reps: number;
	readonly loadKg: number;
	readonly rpe?: number;
	readonly notes?: string;
	/** Se > 0, inicia o cronômetro de descanso logo após salvar. */
	readonly restSeconds?: number;
}

export interface LogSetOutput {
	readonly log: WorkoutLog;
	readonly restStarted: boolean;
}

interface Dependencies {
	readonly workoutLogs: WorkoutLogRepository;
	readonly startRestTimer: StartRestTimerUseCase;
	readonly clock?: () => Date; // injetável para testes
	readonly idFactory?: () => string;
}

/**
 * Registra uma série concluída e, se `restSeconds > 0`, enfileira o descanso.
 * Puro em relação à UI: recebe DTO, devolve DTO. Zero imports de Svelte/IDB.
 */
export class LogSetUseCase {
	private readonly clock: () => Date;
	private readonly idFactory: () => string;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
		this.idFactory = deps.idFactory ?? (() => crypto.randomUUID());
	}

	async execute(input: LogSetInput): Promise<LogSetOutput> {
		this.validate(input);

		const log: WorkoutLog = {
			id: this.idFactory(),
			splitId: input.splitId,
			exerciseId: input.exerciseId,
			performedAt: this.clock(),
			setNumber: input.setNumber,
			reps: input.reps,
			loadKg: input.loadKg,
			rpe: input.rpe,
			notes: input.notes
		};

		await this.deps.workoutLogs.save(log);

		const shouldRest = (input.restSeconds ?? 0) > 0;
		if (shouldRest) {
			this.deps.startRestTimer.execute({
				totalSeconds: input.restSeconds!,
				exerciseId: input.exerciseId
			});
		}

		return { log, restStarted: shouldRest };
	}

	private validate(input: LogSetInput): void {
		if (input.setNumber <= 0) throw new Error('setNumber deve ser >= 1');
		if (input.reps < 0) throw new Error('reps não pode ser negativo');
		if (input.loadKg < 0) throw new Error('loadKg não pode ser negativo');
		if (input.rpe !== undefined && (input.rpe < 1 || input.rpe > 10)) {
			throw new Error('rpe deve estar entre 1 e 10');
		}
	}
}
