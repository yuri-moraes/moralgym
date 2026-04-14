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
import { DexieWorkoutLogRepository } from '../adapters/persistence/dexie/DexieWorkoutLogRepository';
import { WebWorkerRestTimer } from '../adapters/timer/WebWorkerRestTimer';

import type { MediaProcessor } from '../core/application/ports/MediaProcessor';
import type { NotificationService } from '../core/application/ports/NotificationService';
import type { RestTimer } from '../core/application/ports/RestTimer';
import type { ExerciseRepository } from '../core/application/ports/repositories/ExerciseRepository';
import type { RoutineRepository } from '../core/application/ports/repositories/RoutineRepository';
import type { WorkoutLogRepository } from '../core/application/ports/repositories/WorkoutLogRepository';

import { LogSetUseCase } from '../core/application/use-cases/LogSetUseCase';
import { StartRestTimerUseCase } from '../core/application/use-cases/StartRestTimerUseCase';

export interface AppContainer {
	// Repositórios
	readonly exercises: ExerciseRepository;
	readonly routines: RoutineRepository;
	readonly workoutLogs: WorkoutLogRepository;

	// Serviços de infraestrutura
	readonly mediaProcessor: MediaProcessor;
	readonly restTimer: RestTimer;
	readonly notifications: NotificationService;

	// Casos de uso prontos para a UI consumir
	readonly startRestTimer: StartRestTimerUseCase;
	readonly logSet: LogSetUseCase;
}

let instance: AppContainer | null = null;

export function getContainer(): AppContainer {
	if (instance) return instance;

	const exercises = new DexieExerciseRepository(db);
	const routines = new DexieRoutineRepository(db);
	const workoutLogs = new DexieWorkoutLogRepository(db);

	const mediaProcessor = new CanvasMediaProcessor();
	const restTimer = new WebWorkerRestTimer();
	const notifications = new BrowserNotificationService();

	const startRestTimer = new StartRestTimerUseCase({ restTimer, notifications });
	const logSet = new LogSetUseCase({ workoutLogs, startRestTimer });

	instance = {
		exercises,
		routines,
		workoutLogs,
		mediaProcessor,
		restTimer,
		notifications,
		startRestTimer,
		logSet
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
