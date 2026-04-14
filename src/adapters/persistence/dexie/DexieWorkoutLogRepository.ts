import type {
	DateRange,
	WorkoutLogRepository
} from '../../../core/application/ports/repositories/WorkoutLogRepository';
import type { WorkoutLog } from '../../../core/domain/entities/WorkoutLog';
import type { MoralGymDatabase, WorkoutLogRecord } from './database';

/**
 * Adapter Dexie para `WorkoutLogRepository`.
 *
 * Todas as queries por janela temporal usam índices compostos
 * (`[exerciseId+performedAt]`, `[splitId+performedAt]`) — fundamental
 * para manter a lista de histórico responsiva mesmo com milhares de séries.
 */
export class DexieWorkoutLogRepository implements WorkoutLogRepository {
	constructor(private readonly db: MoralGymDatabase) {}

	async findById(id: string): Promise<WorkoutLog | null> {
		const record = await this.db.workoutLogs.get(id);
		return record ? recordToLog(record) : null;
	}

	async findByExercise(
		exerciseId: string,
		range?: DateRange
	): Promise<readonly WorkoutLog[]> {
		const collection = range
			? this.db.workoutLogs
					.where('[exerciseId+performedAt]')
					.between(
						[exerciseId, range.from.getTime()],
						[exerciseId, range.to.getTime()],
						true,
						true
					)
			: this.db.workoutLogs.where('exerciseId').equals(exerciseId);

		const records = await collection.toArray();
		return records
			.sort((a: { performedAt: number; }, b: { performedAt: number; }) => a.performedAt - b.performedAt)
			.map(recordToLog);
	}

	async findBySplit(splitId: string, range?: DateRange): Promise<readonly WorkoutLog[]> {
		const collection = range
			? this.db.workoutLogs
					.where('[splitId+performedAt]')
					.between(
						[splitId, range.from.getTime()],
						[splitId, range.to.getTime()],
						true,
						true
					)
			: this.db.workoutLogs.where('splitId').equals(splitId);

		const records = await collection.toArray();
		return records
			.sort((a: { performedAt: number; }, b: { performedAt: number; }) => a.performedAt - b.performedAt)
			.map(recordToLog);
	}

	/**
	 * Retorna todas as séries da última sessão registrada para o exercício.
	 * "Sessão" = séries do mesmo dia calendário (00:00–23:59 local) da execução
	 * mais recente. Útil para exibir "como você foi na última vez" na tela
	 * do exercício.
	 */
	async findLastSession(exerciseId: string): Promise<readonly WorkoutLog[]> {
		const latest = await this.db.workoutLogs
			.where('[exerciseId+performedAt]')
			.between([exerciseId, -Infinity], [exerciseId, Infinity])
			.last();

		if (!latest) return [];

		const ref = new Date(latest.performedAt);
		const start = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();
		const end = start + 24 * 60 * 60 * 1000;

		const records = await this.db.workoutLogs
			.where('[exerciseId+performedAt]')
			.between([exerciseId, start], [exerciseId, end], true, false)
			.toArray();

		return records
			.sort((a: { setNumber: number; }, b: { setNumber: number; }) => a.setNumber - b.setNumber)
			.map(recordToLog);
	}

	async save(log: WorkoutLog): Promise<void> {
		await this.db.workoutLogs.put(logToRecord(log));
	}

	async saveMany(logs: readonly WorkoutLog[]): Promise<void> {
		if (logs.length === 0) return;
		await this.db.workoutLogs.bulkPut(logs.map(logToRecord));
	}

	async delete(id: string): Promise<void> {
		await this.db.workoutLogs.delete(id);
	}
}

function logToRecord(l: WorkoutLog): WorkoutLogRecord {
	return {
		id: l.id,
		splitId: l.splitId,
		exerciseId: l.exerciseId,
		performedAt: l.performedAt.getTime(),
		setNumber: l.setNumber,
		reps: l.reps,
		loadKg: l.loadKg,
		rpe: l.rpe,
		notes: l.notes
	};
}

function recordToLog(r: WorkoutLogRecord): WorkoutLog {
	return {
		id: r.id,
		splitId: r.splitId,
		exerciseId: r.exerciseId,
		performedAt: new Date(r.performedAt),
		setNumber: r.setNumber,
		reps: r.reps,
		loadKg: r.loadKg,
		rpe: r.rpe,
		notes: r.notes
	};
}
