import type { Exercise } from '../../domain/entities/Exercise';
import type { Routine } from '../../domain/entities/Routine';
import type { Split } from '../../domain/entities/Split';
import type { WorkoutLog } from '../../domain/entities/WorkoutLog';
import type { WorkoutSession } from '../../domain/entities/WorkoutSession';
import type { BackupMetadata } from '../../domain/value-objects/BackupMetadata';
import type { BackupSnapshot } from '../../domain/entities/BackupSnapshot';
import type { ExerciseRepository } from '../ports/repositories/ExerciseRepository';
import type { RoutineRepository } from '../ports/repositories/RoutineRepository';
import type { SplitRepository } from '../ports/repositories/SplitRepository';
import type { WorkoutLogRepository } from '../ports/repositories/WorkoutLogRepository';
import type { WorkoutSessionRepository } from '../ports/repositories/WorkoutSessionRepository';

export interface ExportBackupInput {
	readonly includeWorkoutLogs?: boolean;
	readonly includeWorkoutSessions?: boolean;
}

export interface ExportBackupOutput {
	readonly json: string;
	readonly filename: string;
}

interface Dependencies {
	readonly exercises: ExerciseRepository;
	readonly routines: RoutineRepository;
	readonly splits: SplitRepository;
	readonly workoutLogs: WorkoutLogRepository;
	readonly sessions: WorkoutSessionRepository;
	readonly clock?: () => Date;
	readonly appVersion?: string;
}

/**
 * Exporta todos os dados da aplicação como um snapshot em JSON.
 *
 * Responsabilidades:
 *  - Buscar todos os dados de cada repositório.
 *  - Incluir/excluir logs e sessões condicionalmente.
 *  - Gerar metadata do backup (timestamp, versão, contagens).
 *  - Serializar para JSON (pretty-print).
 *  - Gerar filename padrão (moralgym-backup-YYYY-MM-DD.json).
 */
export class ExportBackupUseCase {
	private readonly clock: () => Date;
	private readonly appVersion: string;

	constructor(private readonly deps: Dependencies) {
		this.clock = deps.clock ?? (() => new Date());
		this.appVersion = deps.appVersion ?? '0.1.0';
	}

	async execute(input: ExportBackupInput): Promise<ExportBackupOutput> {
		const includeWorkoutLogs = input.includeWorkoutLogs ?? true;
		const includeWorkoutSessions = input.includeWorkoutSessions ?? false;

		// 1. Buscar todos os exercícios
		const exercises = await this.deps.exercises.findAll();

		// 2. Buscar todas as rotinas
		const routines = await this.deps.routines.findAll();

		// 3. Buscar todos os splits
		const splits = await this.deps.splits.findAll();

		// 4. Buscar logs/sessões condicionalmente
		const workoutLogs = includeWorkoutLogs ? await this.deps.workoutLogs.findAll() : [];

		const workoutSessions = includeWorkoutSessions
			? await this.deps.sessions.findAll()
			: [];

		// 5. Criar metadata
		const metadata: BackupMetadata = {
			exportedAt: this.clock(),
			appVersion: this.appVersion,
			exerciseCount: exercises.length,
			routineCount: routines.length,
			logCount: workoutLogs.length
		};

		// 6. Criar snapshot
		const snapshot: BackupSnapshot = {
			metadata,
			data: {
				exercises: exercises as readonly Exercise[],
				routines: routines as readonly Routine[],
				splits: splits as readonly Split[],
				workoutLogs: workoutLogs as readonly WorkoutLog[],
				workoutSessions: workoutSessions as readonly WorkoutSession[]
			}
		};

		// 7. Serializar para JSON (pretty-print)
		const json = JSON.stringify(snapshot, null, 2);

		// 8. Gerar filename (moralgym-backup-YYYY-MM-DD.json)
		const dateStr = this.clock().toISOString().split('T')[0];
		const filename = `moralgym-backup-${dateStr}.json`;

		return { json, filename };
	}
}
