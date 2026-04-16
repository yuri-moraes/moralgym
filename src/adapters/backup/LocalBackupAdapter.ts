import type { BackupService, ExportOptions, ImportOptions } from '../../core/application/ports/BackupService';
import type { BackupSnapshot } from '../../core/domain/entities/BackupSnapshot';
import type { ExerciseRepository } from '../../core/application/ports/repositories/ExerciseRepository';
import type { RoutineRepository } from '../../core/application/ports/repositories/RoutineRepository';
import type { SplitRepository } from '../../core/application/ports/repositories/SplitRepository';
import type { WorkoutLogRepository } from '../../core/application/ports/repositories/WorkoutLogRepository';
import type { WorkoutSessionRepository } from '../../core/application/ports/repositories/WorkoutSessionRepository';
import { ExportBackupUseCase } from '../../core/application/use-cases/ExportBackupUseCase';
import { ImportBackupUseCase } from '../../core/application/use-cases/ImportBackupUseCase';
import type { MoralGymDatabase } from '../persistence/dexie/database';

/**
 * Adapter para o Port BackupService.
 *
 * Esta é uma implementação local que:
 *  - Delega exportação para ExportBackupUseCase.
 *  - Delega importação para ImportBackupUseCase.
 *  - Serializa/desserializa JSON.
 *  - Suporta modos de merge (replace ou merge) com transações Dexie.
 */
export class LocalBackupAdapter implements BackupService {
	private readonly exportUseCase: ExportBackupUseCase;
	private readonly importUseCase: ImportBackupUseCase;

	constructor(
		exercises: ExerciseRepository,
		routines: RoutineRepository,
		splits: SplitRepository,
		workoutLogs: WorkoutLogRepository,
		sessions: WorkoutSessionRepository,
		db: MoralGymDatabase
	) {
		this.exportUseCase = new ExportBackupUseCase({
			exercises,
			routines,
			splits,
			workoutLogs,
			sessions
		});
		this.importUseCase = new ImportBackupUseCase(
			exercises,
			routines,
			splits,
			workoutLogs,
			sessions,
			db
		);
	}

	async exportAsJson(options?: ExportOptions): Promise<string> {
		const result = await this.exportUseCase.execute({
			includeWorkoutLogs: options?.includeWorkoutLogs ?? true,
			includeWorkoutSessions: false
		});

		return result.json;
	}

	async importFromJson(json: string, options?: ImportOptions): Promise<BackupSnapshot> {
		const result = await this.importUseCase.execute({
			json,
			options
		});

		return result.snapshot;
	}
}
