/**
 * Composition Root.
 * Único ponto do app onde Ports (Core) encontram Adapters concretos.
 * UI e use-cases consomem apenas as interfaces exportadas daqui.
 *
 * Regra de ouro: este é o *ÚNICO* arquivo de toda a base que tem permissão
 * para importar simultaneamente de `core/application/ports/*`,
 * `adapters/*` e use-cases. Qualquer outro arquivo que faça isso está
 * quebrando o Hexagonal.
 */
import { CanvasMediaProcessor } from '../adapters/media/CanvasMediaProcessor';
import { BrowserNotificationService } from '../adapters/notifications/BrowserNotificationService';
import { db } from '../adapters/persistence/dexie/database';
import { DexieExerciseRepository } from '../adapters/persistence/dexie/DexieExerciseRepository';
import { DexieRoutineRepository } from '../adapters/persistence/dexie/DexieRoutineRepository';
import { DexieSplitRepository } from '../adapters/persistence/dexie/DexieSplitRepository';
import { DexieWorkoutLogRepository } from '../adapters/persistence/dexie/DexieWorkoutLogRepository';
import { DexieWorkoutSessionRepository } from '../adapters/persistence/dexie/DexieWorkoutSessionRepository';
import { WebWorkerRestTimer } from '../adapters/timer/WebWorkerRestTimer';
import { LocalBackupAdapter } from '../adapters/backup/LocalBackupAdapter';

import type { BackupService } from '../core/application/ports/BackupService';
import type { MediaProcessor } from '../core/application/ports/MediaProcessor';
import type { NotificationService } from '../core/application/ports/NotificationService';
import type { RestTimer } from '../core/application/ports/RestTimer';
import type { ExerciseRepository } from '../core/application/ports/repositories/ExerciseRepository';
import type { RoutineRepository } from '../core/application/ports/repositories/RoutineRepository';
import type { SplitRepository } from '../core/application/ports/repositories/SplitRepository';
import type { WorkoutLogRepository } from '../core/application/ports/repositories/WorkoutLogRepository';
import type { WorkoutSessionRepository } from '../core/application/ports/repositories/WorkoutSessionRepository';

import { CreateRoutineUseCase } from '../core/application/use-cases/CreateRoutineUseCase';
import { UpdateRoutineUseCase } from '../core/application/use-cases/UpdateRoutineUseCase';
import { DeleteRoutineUseCase } from '../core/application/use-cases/DeleteRoutineUseCase';
import { CreateExerciseUseCase } from '../core/application/use-cases/CreateExerciseUseCase';
import { DeleteExerciseUseCase } from '../core/application/use-cases/DeleteExerciseUseCase';
import { LogSetUseCase } from '../core/application/use-cases/LogSetUseCase';
import { StartRestTimerUseCase } from '../core/application/use-cases/StartRestTimerUseCase';
import { StartWorkoutSessionUseCase } from '../core/application/use-cases/StartWorkoutSessionUseCase';
import { FinishWorkoutSessionUseCase } from '../core/application/use-cases/FinishWorkoutSessionUseCase';
import { ExportBackupUseCase } from '../core/application/use-cases/ExportBackupUseCase';
import { ImportBackupUseCase } from '../core/application/use-cases/ImportBackupUseCase';

export interface AppContainer {
	// Repositórios
	readonly exercises: ExerciseRepository;
	readonly routines: RoutineRepository;
	readonly splits: SplitRepository;
	readonly workoutLogs: WorkoutLogRepository;
	readonly sessions: WorkoutSessionRepository;

	// Serviços de infraestrutura
	readonly mediaProcessor: MediaProcessor;
	readonly restTimer: RestTimer;
	readonly notifications: NotificationService;
	readonly backup: BackupService;

	// Casos de uso prontos para a UI consumir
	readonly startRestTimer: StartRestTimerUseCase;
	readonly logSet: LogSetUseCase;
	readonly createRoutine: CreateRoutineUseCase;
	readonly updateRoutine: UpdateRoutineUseCase;
	readonly deleteRoutine: DeleteRoutineUseCase;
	readonly createExercise: CreateExerciseUseCase;
	readonly deleteExercise: DeleteExerciseUseCase;
	readonly startWorkoutSession: StartWorkoutSessionUseCase;
	readonly finishWorkoutSession: FinishWorkoutSessionUseCase;
	readonly exportBackup: ExportBackupUseCase;
	readonly importBackup: ImportBackupUseCase;
}

let instance: AppContainer | null = null;

export function getContainer(): AppContainer {
	if (instance) return instance;

	const exercises = new DexieExerciseRepository(db);
	const routines = new DexieRoutineRepository(db);
	const splits = new DexieSplitRepository(db);
	const workoutLogs = new DexieWorkoutLogRepository(db);
	const sessions = new DexieWorkoutSessionRepository();

	const mediaProcessor = new CanvasMediaProcessor();
	const restTimer = new WebWorkerRestTimer();
	const notifications = new BrowserNotificationService();
	const backup = new LocalBackupAdapter(exercises, routines, splits, workoutLogs, sessions, db);

	const startRestTimer = new StartRestTimerUseCase({ restTimer, notifications });
	const logSet = new LogSetUseCase({ workoutLogs, startRestTimer });
	const createRoutine = new CreateRoutineUseCase({ routines });
	const updateRoutine = new UpdateRoutineUseCase({ routines });
	const deleteRoutine = new DeleteRoutineUseCase({ routines });
	const createExercise = new CreateExerciseUseCase({ exercises, mediaProcessor });
	const deleteExercise = new DeleteExerciseUseCase({ exercises });
	const startWorkoutSession = new StartWorkoutSessionUseCase({ routines, sessions });
	const finishWorkoutSession = new FinishWorkoutSessionUseCase({ sessions });
	const exportBackup = new ExportBackupUseCase({
		exercises,
		routines,
		splits,
		workoutLogs,
		sessions
	});
	const importBackup = new ImportBackupUseCase(
		exercises,
		routines,
		splits,
		workoutLogs,
		sessions,
		db
	);

	instance = {
		exercises,
		routines,
		splits,
		workoutLogs,
		sessions,
		mediaProcessor,
		restTimer,
		notifications,
		backup,
		startRestTimer,
		logSet,
		createRoutine,
		updateRoutine,
		deleteRoutine,
		createExercise,
		deleteExercise,
		startWorkoutSession,
		finishWorkoutSession,
		exportBackup,
		importBackup
	};
	return instance;
}

/**
 * Somente para testes de integração: zera o singleton para isolar estado
 * entre suítes. Em produção, nunca chamar.
 */
export function __resetContainerForTests(): void {
	instance = null;
}
