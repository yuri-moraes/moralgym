import type { SplitRepository } from '../../../core/application/ports/repositories/SplitRepository';
import type { Split, SplitExercise } from '../../../core/domain/entities/Split';
import type { MoralGymDatabase, SplitExerciseRecord, SplitRecord } from './database';

/**
 * Adapter Dexie para `SplitRepository`.
 *
 * Observações importantes:
 *  - `save` é transacional sobre as tabelas `splits` e `splitExercises`.
 *  - `delete` apaga também todos os exercícios da split.
 */
export class DexieSplitRepository implements SplitRepository {
	constructor(private readonly db: MoralGymDatabase) {}

	async findById(id: string): Promise<Split | null> {
		const splitRecord = await this.db.splits.get(id);
		if (!splitRecord) return null;

		const exercises = await this.db.splitExercises.where('splitId').equals(id).toArray();
		return recordToSplit(splitRecord, exercises);
	}

	async findAll(): Promise<readonly Split[]> {
		const [splitRecords, exerciseRecords] = await Promise.all([
			this.db.splits.orderBy('orderIndex').toArray(),
			this.db.splitExercises.toArray()
		]);

		const byId = new Map<string, SplitExerciseRecord[]>();
		for (const se of exerciseRecords) {
			const arr = byId.get(se.splitId) ?? [];
			arr.push(se);
			byId.set(se.splitId, arr);
		}

		return splitRecords.map((sr) => recordToSplit(sr, byId.get(sr.id) ?? []));
	}

	async findByRoutineId(routineId: string): Promise<readonly Split[]> {
		const [splitRecords, exerciseRecords] = await Promise.all([
			this.db.splits.where('routineId').equals(routineId).sortBy('orderIndex'),
			this.db.splitExercises
				.where('splitId')
				.anyOf(await this.splitIdsOf(routineId))
				.toArray()
		]);

		const byId = new Map<string, SplitExerciseRecord[]>();
		for (const se of exerciseRecords) {
			const arr = byId.get(se.splitId) ?? [];
			arr.push(se);
			byId.set(se.splitId, arr);
		}

		return splitRecords.map((sr) => recordToSplit(sr, byId.get(sr.id) ?? []));
	}

	async save(split: Split): Promise<void> {
		await this.db.transaction('rw', this.db.splits, this.db.splitExercises, async () => {
			await this.db.splits.put(splitToRecord(split));

			// Sincroniza exercícios da split (deleta removidos + reinsere).
			await this.db.splitExercises.where('splitId').equals(split.id).delete();
			if (split.exercises.length > 0) {
				await this.db.splitExercises.bulkPut(
					split.exercises.map((se) => splitExerciseToRecord(split.id, se))
				);
			}
		});
	}

	async delete(id: string): Promise<void> {
		await this.db.transaction('rw', this.db.splits, this.db.splitExercises, async () => {
			await this.db.splitExercises.where('splitId').equals(id).delete();
			await this.db.splits.delete(id);
		});
	}

	private async splitIdsOf(routineId: string): Promise<string[]> {
		return this.db.splits.where('routineId').equals(routineId).primaryKeys();
	}
}

// ============================================================
// Mappers locais — vivem aqui porque só este Adapter os usa.
// ============================================================

function splitToRecord(s: Split): SplitRecord {
	return {
		id: s.id,
		routineId: s.routineId,
		label: s.label,
		name: s.name,
		orderIndex: s.orderIndex,
		createdAt: s.createdAt.getTime(),
		updatedAt: s.updatedAt.getTime()
	};
}

function recordToSplit(r: SplitRecord, exercises: SplitExerciseRecord[]): Split {
	return {
		id: r.id,
		routineId: r.routineId,
		label: r.label,
		name: r.name,
		orderIndex: r.orderIndex,
		exercises: exercises
			.slice()
			.sort((a, b) => a.orderIndex - b.orderIndex)
			.map(recordToSplitExercise),
		createdAt: new Date(r.createdAt),
		updatedAt: new Date(r.updatedAt)
	};
}

function splitExerciseToRecord(splitId: string, se: SplitExercise): SplitExerciseRecord {
	return {
		id: se.id,
		splitId,
		exerciseId: se.exerciseId,
		orderIndex: se.orderIndex,
		targetSets: se.targetSets,
		targetRepsMin: se.targetRepsMin,
		targetRepsMax: se.targetRepsMax,
		restSeconds: se.restSeconds
	};
}

function recordToSplitExercise(r: SplitExerciseRecord): SplitExercise {
	return {
		id: r.id,
		exerciseId: r.exerciseId,
		orderIndex: r.orderIndex,
		targetSets: r.targetSets,
		targetRepsMin: r.targetRepsMin,
		targetRepsMax: r.targetRepsMax,
		restSeconds: r.restSeconds
	};
}
