import type { RoutineRepository } from '../../../core/application/ports/repositories/RoutineRepository';
import type { Routine, SplitCount } from '../../../core/domain/entities/Routine';
import type { Split, SplitExercise } from '../../../core/domain/entities/Split';
import type {
	MoralGymDatabase,
	RoutineRecord,
	SplitExerciseRecord,
	SplitRecord
} from './database';

/**
 * Adapter Dexie para `RoutineRepository`.
 *
 * Observações importantes:
 *  - `save` é transacional sobre as tabelas `routines`, `splits` e
 *    `splitExercises`. Splits removidos no Domain são apagados junto —
 *    evitamos registros órfãos se o usuário, por exemplo, reduzir um A/B/C
 *    para A/B.
 *  - `setActive` também roda em transação para manter o invariante
 *    "no máximo uma rotina ativa por vez".
 *  - `delete` varre e apaga splits + split_exercises da rotina.
 */
export class DexieRoutineRepository implements RoutineRepository {
	constructor(private readonly db: MoralGymDatabase) {}

	async findById(id: string): Promise<Routine | null> {
		const record = await this.db.routines.get(id);
		return record ? recordToRoutine(record) : null;
	}

	async findActive(): Promise<Routine | null> {
		const record = await this.db.routines.where('isActive').equals(1).first();
		return record ? recordToRoutine(record) : null;
	}

	async findAll(): Promise<readonly Routine[]> {
		const records = await this.db.routines.orderBy('updatedAt').reverse().toArray();
		return records.map(recordToRoutine);
	}

	async findSplits(routineId: string): Promise<readonly Split[]> {
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

	async save(routine: Routine, splits: readonly Split[]): Promise<void> {
		await this.db.transaction(
			'rw',
			this.db.routines,
			this.db.splits,
			this.db.splitExercises,
			async () => {
				await this.db.routines.put(routineToRecord(routine));

				// Sincroniza splits: reescreve o conjunto da rotina para
				// refletir exatamente o estado do domínio (inclui deleções).
				const existingSplits = await this.db.splits
					.where('routineId')
					.equals(routine.id)
					.primaryKeys();
				const keepIds = new Set(splits.map((s) => s.id));
				const toDelete = existingSplits.filter((id) => !keepIds.has(id));

				if (toDelete.length > 0) {
					await this.db.splitExercises.where('splitId').anyOf(toDelete).delete();
					await this.db.splits.bulkDelete(toDelete);
				}

				await this.db.splits.bulkPut(splits.map(splitToRecord));

				// Sincroniza exercícios de cada split (deleta removidos + reinsere).
				for (const split of splits) {
					await this.db.splitExercises.where('splitId').equals(split.id).delete();
					if (split.exercises.length > 0) {
						await this.db.splitExercises.bulkPut(
							split.exercises.map((se) => splitExerciseToRecord(split.id, se))
						);
					}
				}
			}
		);
	}

	async setActive(id: string): Promise<void> {
		await this.db.transaction('rw', this.db.routines, async () => {
			await this.db.routines.where('isActive').equals(1).modify({ isActive: 0 });
			await this.db.routines.update(id, { isActive: 1, updatedAt: Date.now() });
		});
	}

	async delete(id: string): Promise<void> {
		await this.db.transaction(
			'rw',
			this.db.routines,
			this.db.splits,
			this.db.splitExercises,
			async () => {
				const splitIds = await this.splitIdsOf(id);
				if (splitIds.length > 0) {
					await this.db.splitExercises.where('splitId').anyOf(splitIds).delete();
					await this.db.splits.bulkDelete(splitIds);
				}
				await this.db.routines.delete(id);
			}
		);
	}

	private async splitIdsOf(routineId: string): Promise<string[]> {
		return this.db.splits.where('routineId').equals(routineId).primaryKeys();
	}
}

// ============================================================
// Mappers locais — vivem aqui porque só este Adapter os usa.
// ============================================================

function routineToRecord(r: Routine): RoutineRecord {
	return {
		id: r.id,
		name: r.name,
		description: r.description,
		splitCount: r.splitCount,
		isActive: r.isActive ? 1 : 0,
		createdAt: r.createdAt.getTime(),
		updatedAt: r.updatedAt.getTime()
	};
}

function recordToRoutine(r: RoutineRecord): Routine {
	return {
		id: r.id,
		name: r.name,
		description: r.description,
		splitCount: r.splitCount as SplitCount,
		isActive: r.isActive === 1,
		createdAt: new Date(r.createdAt),
		updatedAt: new Date(r.updatedAt)
	};
}

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
