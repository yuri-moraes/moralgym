// Integração real com IndexedDB em memória (via fake-indexeddb).
// Foco: provar que `findLastSession` respeita o recorte de DIA CALENDÁRIO
// LOCAL (00:00–23:59) — séries feitas antes da meia-noite NÃO podem vazar
// para dentro da "última sessão" quando o usuário volta a treinar logo
// depois da virada do dia.
import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MoralGymDatabase } from '../../../../../src/adapters/persistence/dexie/database';
import { DexieWorkoutLogRepository } from '../../../../../src/adapters/persistence/dexie/DexieWorkoutLogRepository';
import type { WorkoutLog } from '../../../../../src/core/domain/entities/WorkoutLog';

// ============================================================
// Fábrica de WorkoutLog
// ============================================================

function makeLog(overrides: Partial<WorkoutLog> & Pick<WorkoutLog, 'id' | 'performedAt'>): WorkoutLog {
	return {
		splitId: 'split-A',
		exerciseId: 'ex-supino',
		setNumber: 1,
		reps: 10,
		loadKg: 60,
		...overrides
	};
}

// ============================================================
// Setup: banco isolado por teste (evita vazamento entre cases)
// ============================================================

let db: MoralGymDatabase;
let repo: DexieWorkoutLogRepository;

beforeEach(async () => {
	db = new MoralGymDatabase(`moralgym-test-${crypto.randomUUID()}`);
	await db.open();
	repo = new DexieWorkoutLogRepository(db);
});

afterEach(async () => {
	await db.delete();
	db.close();
});

// ============================================================
// findLastSession — recorte por dia calendário local
// ============================================================

describe('DexieWorkoutLogRepository.findLastSession — recorte por dia calendário local', () => {
	it('ignora séries do dia anterior mesmo quando separadas por poucos minutos (23:50 → 00:15)', async () => {
		// IMPORTANTE: usamos o construtor local de Date (year, monthIndex, day, hour, minute)
		// para que o teste seja INDEPENDENTE do fuso horário do runner.
		// O método findLastSession calcula o boundary via getFullYear/getMonth/getDate,
		// que também são locais — então as contas batem em qualquer TZ.

		// --- DIA 1 (2026-04-13) às 23:50 → 3 séries (madrugada entrando no dia 14)
		const day1_2350 = new Date(2026, 3, 13, 23, 50, 0); // abril = mês 3
		const day1Logs: WorkoutLog[] = [
			makeLog({ id: 'd1-s1', performedAt: day1_2350, setNumber: 1, reps: 10, loadKg: 60 }),
			makeLog({
				id: 'd1-s2',
				performedAt: new Date(2026, 3, 13, 23, 55, 0),
				setNumber: 2,
				reps: 9,
				loadKg: 60
			}),
			makeLog({
				id: 'd1-s3',
				performedAt: new Date(2026, 3, 13, 23, 58, 0),
				setNumber: 3,
				reps: 8,
				loadKg: 60
			})
		];

		// --- DIA 2 (2026-04-14) às 00:15 → 2 séries (essas DEVEM aparecer)
		const day2Logs: WorkoutLog[] = [
			makeLog({
				id: 'd2-s1',
				performedAt: new Date(2026, 3, 14, 0, 15, 0),
				setNumber: 1,
				reps: 12,
				loadKg: 62.5
			}),
			makeLog({
				id: 'd2-s2',
				performedAt: new Date(2026, 3, 14, 0, 20, 0),
				setNumber: 2,
				reps: 11,
				loadKg: 62.5
			})
		];

		// --- DECOY: outro exercício no mesmo dia 2 (deve ser filtrado pelo exerciseId)
		const decoy: WorkoutLog = makeLog({
			id: 'decoy-1',
			exerciseId: 'ex-remada',
			performedAt: new Date(2026, 3, 14, 0, 25, 0),
			setNumber: 1,
			reps: 10,
			loadKg: 40
		});

		// Inserção em ordem intencionalmente embaralhada — o repo não pode
		// depender da ordem de inserção, só dos timestamps.
		await repo.saveMany([day2Logs[1], day1Logs[0], decoy, day2Logs[0], day1Logs[2], day1Logs[1]]);

		// --- ASSERÇÃO PRINCIPAL ---
		const session = await repo.findLastSession('ex-supino');

		// (1) Devolve EXATAMENTE as 2 séries do dia 2 — nenhuma do dia 1, nenhum decoy.
		expect(session).toHaveLength(2);
		expect(session.map((s) => s.id)).toEqual(['d2-s1', 'd2-s2']);

		// (2) Ordenadas por setNumber crescente (contrato do repo).
		expect(session.map((s) => s.setNumber)).toEqual([1, 2]);

		// (3) Carga/reps preservados.
		expect(session[0]?.loadKg).toBe(62.5);
		expect(session[0]?.reps).toBe(12);
		expect(session[1]?.reps).toBe(11);

		// (4) Nenhum log do dia 1 escapou para a sessão, mesmo estando a
		// apenas 25 minutos cronológicos de distância.
		const ids = session.map((s) => s.id);
		expect(ids).not.toContain('d1-s1');
		expect(ids).not.toContain('d1-s2');
		expect(ids).not.toContain('d1-s3');

		// (5) O decoy de outro exercício também ficou de fora.
		expect(ids).not.toContain('decoy-1');
	});

	it('retorna array vazio quando o exercício nunca foi executado', async () => {
		await repo.save(
			makeLog({
				id: 'outro-1',
				exerciseId: 'ex-remada',
				performedAt: new Date(2026, 3, 14, 10, 0, 0)
			})
		);

		const session = await repo.findLastSession('ex-supino');
		expect(session).toEqual([]);
	});

	it('quando só há séries do dia 1, findLastSession deve retornar todas elas (comportamento simétrico)', async () => {
		// Contra-prova do teste principal: garante que o corte não é
		// "sempre ignore o mais antigo" — ele ignora só quando há algo mais novo.
		await repo.saveMany([
			makeLog({ id: 's1', performedAt: new Date(2026, 3, 13, 23, 50, 0), setNumber: 1 }),
			makeLog({ id: 's2', performedAt: new Date(2026, 3, 13, 23, 55, 0), setNumber: 2 }),
			makeLog({ id: 's3', performedAt: new Date(2026, 3, 13, 23, 58, 0), setNumber: 3 })
		]);

		const session = await repo.findLastSession('ex-supino');
		expect(session.map((s) => s.id)).toEqual(['s1', 's2', 's3']);
	});
});
