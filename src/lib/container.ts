/**
 * Composition Root.
 * Único ponto do app onde Ports (Core) encontram Adapters concretos.
 * UI e use-cases consomem apenas as interfaces exportadas daqui.
 */
import { db } from '../adapters/persistence/dexie/database';
import { DexieExerciseRepository } from '../adapters/persistence/dexie/DexieExerciseRepository';

import type { ExerciseRepository } from '../core/application/ports/repositories/ExerciseRepository';

export interface AppContainer {
	readonly exercises: ExerciseRepository;
	// routines, workoutLogs, mediaProcessor, restTimer, notifications...
}

let instance: AppContainer | null = null;

export function getContainer(): AppContainer {
	if (instance) return instance;
	instance = {
		exercises: new DexieExerciseRepository(db)
	};
	return instance;
}
