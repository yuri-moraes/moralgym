import type { Exercise } from '../../domain/entities/Exercise';
import type { Routine } from '../../domain/entities/Routine';
import type { Split } from '../../domain/entities/Split';
import type { WorkoutLog } from '../../domain/entities/WorkoutLog';
import type { WorkoutSession } from '../../domain/entities/WorkoutSession';
import type { BackupSnapshot } from '../../domain/entities/BackupSnapshot';
import type { ExerciseRepository } from '../ports/repositories/ExerciseRepository';
import type { RoutineRepository } from '../ports/repositories/RoutineRepository';
import type { SplitRepository } from '../ports/repositories/SplitRepository';
import type { WorkoutLogRepository } from '../ports/repositories/WorkoutLogRepository';
import type { WorkoutSessionRepository } from '../ports/repositories/WorkoutSessionRepository';
import type { MoralGymDatabase } from '../../../adapters/persistence/dexie/database';

export type MergeMode = 'replace' | 'merge';

export interface ImportOptions {
	readonly mergeMode?: MergeMode;
	readonly clearBeforeImport?: boolean;
}

export interface ItemsImported {
	readonly exercises: number;
	readonly routines: number;
	readonly splits: number;
	readonly workoutLogs: number;
	readonly workoutSessions: number;
}

export interface ImportBackupInput {
	readonly json: string;
	readonly options?: ImportOptions;
}

export interface ImportBackupOutput {
	readonly snapshot: BackupSnapshot;
	readonly itemsImported: ItemsImported;
}

/**
 * ImportBackupUseCase: importa dados de backup em JSON para a aplicação.
 *
 * Responsabilidades:
 *  - Parse e validação de JSON.
 *  - Validação de compatibilidade de versão (v0.x).
 *  - Suporte a dois modos: replace (limpar + inserir) e merge (atualizar se mais recente).
 *  - Uso de transações Dexie para atomicidade.
 *  - Validação de domínio para cada entity.
 */
export class ImportBackupUseCase {
	constructor(
		private readonly exerciseRepository: ExerciseRepository,
		private readonly routineRepository: RoutineRepository,
		private readonly splitRepository: SplitRepository,
		private readonly workoutLogRepository: WorkoutLogRepository,
		private readonly workoutSessionRepository: WorkoutSessionRepository,
		private readonly db: MoralGymDatabase
	) {}

	async execute(input: ImportBackupInput): Promise<ImportBackupOutput> {
		// 1. Parse JSON
		let snapshot: BackupSnapshot;
		try {
			const parsed = JSON.parse(input.json);
			snapshot = this.validateSnapshot(parsed);
		} catch (e) {
			throw new Error(
				`Backup inválido: JSON não é válido. ${e instanceof Error ? e.message : String(e)}`
			);
		}

		// 2. Validar appVersion (aceitar v0.x)
		const versionMatch = snapshot.metadata.appVersion.match(/^0\.(\d+)/);
		if (!versionMatch) {
			throw new Error(
				`Backup de versão ${snapshot.metadata.appVersion} não é compatível. ` +
					'Esperado versão 0.x'
			);
		}

		// 3. Decidir fluxo (replace vs merge)
		const mergeMode = input.options?.mergeMode ?? 'replace';

		if (mergeMode === 'replace') {
			return this.importReplace(snapshot, input.options?.clearBeforeImport ?? true);
		} else {
			return this.importMerge(snapshot);
		}
	}

	private validateSnapshot(parsed: unknown): BackupSnapshot {
		const snapshot = parsed as BackupSnapshot;

		if (!snapshot.metadata) {
			throw new Error('Backup inválido: metadata ausente');
		}

		if (!snapshot.metadata.appVersion) {
			throw new Error('Backup inválido: appVersion ausente');
		}

		if (!snapshot.data) {
			throw new Error('Backup inválido: data ausente');
		}

		if (!Array.isArray(snapshot.data.exercises)) {
			throw new Error('Backup inválido: exercises não é um array');
		}

		if (!Array.isArray(snapshot.data.routines)) {
			throw new Error('Backup inválido: routines não é um array');
		}

		if (!Array.isArray(snapshot.data.splits)) {
			throw new Error('Backup inválido: splits não é um array');
		}

		if (!Array.isArray(snapshot.data.workoutLogs)) {
			throw new Error('Backup inválido: workoutLogs não é um array');
		}

		return snapshot;
	}

	private async importReplace(
		snapshot: BackupSnapshot,
		clearBefore: boolean
	): Promise<ImportBackupOutput> {
		try {
			await this.db.transaction('rw', [
				this.db.exercises,
				this.db.routines,
				this.db.splits,
				this.db.workoutLogs,
				this.db.workoutSessions
			], async () => {
				// 1. Clear existing (se clearBefore=true)
				if (clearBefore) {
					await this.db.exercises.clear();
					await this.db.routines.clear();
					await this.db.splits.clear();
					await this.db.workoutLogs.clear();
					await this.db.workoutSessions.clear();
				}

				// 2. Insert new data
				for (const exercise of snapshot.data.exercises) {
					await this.exerciseRepository.save(exercise as Exercise);
				}

				for (const routine of snapshot.data.routines) {
					await this.routineRepository.save(routine as Routine);
				}

				for (const split of snapshot.data.splits) {
					await this.splitRepository.save(split as Split);
				}

				for (const log of snapshot.data.workoutLogs) {
					await this.workoutLogRepository.save(log as WorkoutLog);
				}

				if (snapshot.data.workoutSessions) {
					for (const session of snapshot.data.workoutSessions) {
						await this.workoutSessionRepository.save(session as WorkoutSession);
					}
				}
			});

			return {
				snapshot,
				itemsImported: {
					exercises: snapshot.data.exercises.length,
					routines: snapshot.data.routines.length,
					splits: snapshot.data.splits.length,
					workoutLogs: snapshot.data.workoutLogs.length,
					workoutSessions: snapshot.data.workoutSessions?.length ?? 0
				}
			};
		} catch (e) {
			throw new Error(
				`Erro ao importar backup (replace): ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}

	private async importMerge(snapshot: BackupSnapshot): Promise<ImportBackupOutput> {
		try {
			const existing = {
				exercises: await this.exerciseRepository.findAll(),
				routines: await this.routineRepository.findAll(),
				splits: await this.splitRepository.findAll(),
				workoutLogs: await this.workoutLogRepository.findAll(),
				workoutSessions: await this.workoutSessionRepository.findAll()
			};

			await this.db.transaction('rw', [
				this.db.exercises,
				this.db.routines,
				this.db.splits,
				this.db.workoutLogs,
				this.db.workoutSessions
			], async () => {
				// Merge exercises
				for (const newEx of snapshot.data.exercises) {
					const newExercise = newEx as Exercise;
					const existingEx = existing.exercises.find((e) => e.id === newExercise.id);
					if (!existingEx || newExercise.updatedAt > existingEx.updatedAt) {
						await this.exerciseRepository.save(newExercise);
					}
				}

				// Merge routines
				for (const newRtn of snapshot.data.routines) {
					const newRoutine = newRtn as Routine;
					const existingRtn = existing.routines.find((r) => r.id === newRoutine.id);
					if (!existingRtn || newRoutine.updatedAt > existingRtn.updatedAt) {
						await this.routineRepository.save(newRoutine);
					}
				}

				// Merge splits
				for (const newSplit of snapshot.data.splits) {
					const split = newSplit as Split;
					const existingSplit = existing.splits.find((s) => s.id === split.id);
					if (!existingSplit || split.updatedAt > existingSplit.updatedAt) {
						await this.splitRepository.save(split);
					}
				}

				// Merge workoutLogs (nunca sobrescreve, append)
				for (const newLog of snapshot.data.workoutLogs) {
					const log = newLog as WorkoutLog;
					const existingLog = existing.workoutLogs.find((l) => l.id === log.id);
					if (!existingLog) {
						await this.workoutLogRepository.save(log);
					}
				}

				// Merge workoutSessions (nunca sobrescreve, append)
				if (snapshot.data.workoutSessions) {
					for (const newSession of snapshot.data.workoutSessions) {
						const session = newSession as WorkoutSession;
						const existingSession = existing.workoutSessions.find(
							(s) => s.id === session.id
						);
						if (!existingSession) {
							await this.workoutSessionRepository.save(session);
						}
					}
				}
			});

			return {
				snapshot,
				itemsImported: {
					exercises: snapshot.data.exercises.length,
					routines: snapshot.data.routines.length,
					splits: snapshot.data.splits.length,
					workoutLogs: snapshot.data.workoutLogs.length,
					workoutSessions: snapshot.data.workoutSessions?.length ?? 0
				}
			};
		} catch (e) {
			throw new Error(
				`Erro ao importar backup (merge): ${e instanceof Error ? e.message : String(e)}`
			);
		}
	}
}
