// Integração real com IndexedDB em memória (via fake-indexeddb).
// Nenhum mock de Dexie — queremos provar que a transação do `save`
// limpa órfãos corretamente quando o usuário reduz A/B/C/D/E para A/B/C.
import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MoralGymDatabase } from '../../../../../src/adapters/persistence/dexie/database';
import { DexieRoutineRepository } from '../../../../../src/adapters/persistence/dexie/DexieRoutineRepository';
import type { Routine } from '../../../../../src/core/domain/entities/Routine';
import type { Split, SplitExercise } from '../../../../../src/core/domain/entities/Split';

// ============================================================
// Fábrica de dados de teste
// ============================================================

const FIXED_NOW = new Date('2026-04-14T10:00:00.000Z');

function makeSplitExercise(overrides: Partial<SplitExercise> & Pick<SplitExercise, 'id' | 'exerciseId' | 'orderIndex'>): SplitExercise {
	return {
		targetSets: 3,
		targetRepsMin: 8,
		targetRepsMax: 12,
		restSeconds: 90,
		...overrides
	};
}

function makeSplit(
	routineId: string,
	label: 'A' | 'B' | 'C' | 'D' | 'E',
	orderIndex: number,
	exercises: readonly SplitExercise[]
): Split {
	return {
		id: `split-${routineId}-${label}`,
		routineId,
		label,
		name: `Treino ${label}`,
		orderIndex,
		exercises,
		createdAt: FIXED_NOW,
		updatedAt: FIXED_NOW
	};
}

function makeRoutine(splitCount: 1 | 2 | 3 | 4 | 5): Routine {
	return {
		id: 'routine-1',
		name: 'Hipertrofia 5x',
		splitCount,
		isActive: true,
		createdAt: FIXED_NOW,
		updatedAt: FIXED_NOW
	};
}

// ============================================================
// Setup: cada teste recebe um banco novo (nome único) para que o
// fake-indexeddb não vaze estado entre casos.
// ============================================================

let db: MoralGymDatabase;
let repo: DexieRoutineRepository;

beforeEach(async () => {
	db = new MoralGymDatabase(`moralgym-test-${crypto.randomUUID()}`);
	await db.open();
	repo = new DexieRoutineRepository(db);
});

afterEach(async () => {
	await db.delete();
	db.close();
});

// ============================================================
// Cenário principal: reduzir rotina de 5 para 3 splits
// ============================================================

describe('DexieRoutineRepository.save — sincronização transacional de splits', () => {
	it('apaga splits órfãos (D/E) e seus exercícios ao reduzir A/B/C/D/E → A/B/C', async () => {
		const routineId = 'routine-1';

		// --- PASSO 1: rotina inicial com 5 splits, cada um com 2 exercícios ---
		const initialSplits: Split[] = [
			makeSplit(routineId, 'A', 0, [
				makeSplitExercise({ id: 'se-A-1', exerciseId: 'ex-supino', orderIndex: 0 }),
				makeSplitExercise({ id: 'se-A-2', exerciseId: 'ex-triceps', orderIndex: 1 })
			]),
			makeSplit(routineId, 'B', 1, [
				makeSplitExercise({ id: 'se-B-1', exerciseId: 'ex-remada', orderIndex: 0 }),
				makeSplitExercise({ id: 'se-B-2', exerciseId: 'ex-biceps', orderIndex: 1 })
			]),
			makeSplit(routineId, 'C', 2, [
				makeSplitExercise({ id: 'se-C-1', exerciseId: 'ex-agachamento', orderIndex: 0 }),
				makeSplitExercise({ id: 'se-C-2', exerciseId: 'ex-panturrilha', orderIndex: 1 })
			]),
			makeSplit(routineId, 'D', 3, [
				makeSplitExercise({ id: 'se-D-1', exerciseId: 'ex-desenvolvimento', orderIndex: 0 }),
				makeSplitExercise({ id: 'se-D-2', exerciseId: 'ex-elevacao-lateral', orderIndex: 1 })
			]),
			makeSplit(routineId, 'E', 4, [
				makeSplitExercise({ id: 'se-E-1', exerciseId: 'ex-stiff', orderIndex: 0 }),
				makeSplitExercise({ id: 'se-E-2', exerciseId: 'ex-abdominal', orderIndex: 1 })
			])
		];

		await repo.save(makeRoutine(5), initialSplits);

		// Sanidade: tudo foi persistido na primeira rodada.
		expect(await db.splits.where('routineId').equals(routineId).count()).toBe(5);
		expect(await db.splitExercises.count()).toBe(10);

		// --- PASSO 2: usuário reduz a rotina para A/B/C, mantendo os mesmos
		// IDs de splits/exercícios sobreviventes (cenário real de edição). ---
		const reducedSplits: Split[] = [
			initialSplits[0], // A
			initialSplits[1], // B
			initialSplits[2] // C
		];

		await repo.save(makeRoutine(3), reducedSplits);

		// --- ASSERÇÕES ---

		// (1) Exatamente 3 splits sobrevivem, e são A/B/C.
		const survivingSplits = await db.splits
			.where('routineId')
			.equals(routineId)
			.sortBy('orderIndex');
		expect(survivingSplits.map((s) => s.label)).toEqual(['A', 'B', 'C']);
		expect(survivingSplits.map((s) => s.id)).toEqual([
			`split-${routineId}-A`,
			`split-${routineId}-B`,
			`split-${routineId}-C`
		]);

		// (2) Splits D e E não existem mais no banco — zero vazamento.
		expect(await db.splits.get(`split-${routineId}-D`)).toBeUndefined();
		expect(await db.splits.get(`split-${routineId}-E`)).toBeUndefined();

		// (3) Exercícios que pertenciam exclusivamente a D/E também sumiram.
		for (const orphanId of ['se-D-1', 'se-D-2', 'se-E-1', 'se-E-2']) {
			expect(await db.splitExercises.get(orphanId)).toBeUndefined();
		}

		// (4) Exercícios de A/B/C foram preservados com integridade.
		const remainingExercises = await db.splitExercises.toArray();
		expect(remainingExercises).toHaveLength(6);
		const remainingIds = remainingExercises.map((e) => e.id).sort();
		expect(remainingIds).toEqual([
			'se-A-1',
			'se-A-2',
			'se-B-1',
			'se-B-2',
			'se-C-1',
			'se-C-2'
		]);

		// (5) A Routine foi atualizada com o novo splitCount.
		const persistedRoutine = await db.routines.get(routineId);
		expect(persistedRoutine?.splitCount).toBe(3);
	});

	it('também remove órfãos quando um split é deletado isoladamente (A/B/C → A/C)', async () => {
		const routineId = 'routine-1';

		const initial: Split[] = [
			makeSplit(routineId, 'A', 0, [
				makeSplitExercise({ id: 'se-A-1', exerciseId: 'ex-1', orderIndex: 0 })
			]),
			makeSplit(routineId, 'B', 1, [
				makeSplitExercise({ id: 'se-B-1', exerciseId: 'ex-2', orderIndex: 0 }),
				makeSplitExercise({ id: 'se-B-2', exerciseId: 'ex-3', orderIndex: 1 })
			]),
			makeSplit(routineId, 'C', 2, [
				makeSplitExercise({ id: 'se-C-1', exerciseId: 'ex-4', orderIndex: 0 })
			])
		];

		await repo.save(makeRoutine(3), initial);

		// Remove apenas o B e reajusta o orderIndex de C.
		const withoutB: Split[] = [
			initial[0],
			{ ...initial[2], orderIndex: 1 }
		];

		await repo.save(makeRoutine(2), withoutB);

		expect(await db.splits.get(`split-${routineId}-B`)).toBeUndefined();
		expect(await db.splitExercises.get('se-B-1')).toBeUndefined();
		expect(await db.splitExercises.get('se-B-2')).toBeUndefined();

		const survivors = await db.splits
			.where('routineId')
			.equals(routineId)
			.sortBy('orderIndex');
		expect(survivors.map((s) => s.label)).toEqual(['A', 'C']);
		expect(survivors[1]?.orderIndex).toBe(1);
	});

	it('preserva exercícios duplicados entre splits (mesmo exerciseId em A e C)', async () => {
		// Cenário real: supino reto aparece em mais de um dia de treino.
		// Quando D é removido, exercícios com o MESMO exerciseId em outros
		// splits NÃO podem ser impactados — o identificador que manda na
		// exclusão é o `id` do SplitExercise, não o `exerciseId`.
		const routineId = 'routine-1';
		const initial: Split[] = [
			makeSplit(routineId, 'A', 0, [
				makeSplitExercise({ id: 'se-A-supino', exerciseId: 'ex-supino', orderIndex: 0 })
			]),
			makeSplit(routineId, 'C', 1, [
				makeSplitExercise({ id: 'se-C-supino', exerciseId: 'ex-supino', orderIndex: 0 })
			]),
			makeSplit(routineId, 'D', 2, [
				makeSplitExercise({ id: 'se-D-supino', exerciseId: 'ex-supino', orderIndex: 0 })
			])
		];
		await repo.save(makeRoutine(3), initial);

		// Remove D.
		await repo.save(makeRoutine(2), [initial[0], initial[1]]);

		expect(await db.splitExercises.get('se-D-supino')).toBeUndefined();
		expect(await db.splitExercises.get('se-A-supino')).toBeDefined();
		expect(await db.splitExercises.get('se-C-supino')).toBeDefined();
	});
});
