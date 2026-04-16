import type { WorkoutSession } from '../../../core/domain/entities/WorkoutSession';
import type { WorkoutSessionRepository } from '../../../core/application/ports/repositories/WorkoutSessionRepository';
import { db } from './database';
import { sessionToRecord, recordToSession } from './mappers';

export class DexieWorkoutSessionRepository implements WorkoutSessionRepository {
	async findById(id: string): Promise<WorkoutSession | null> {
		const record = await db.workoutSessions.get(id);
		return record ? recordToSession(record) : null;
	}

	async findActive(): Promise<WorkoutSession | null> {
		const record = await db.workoutSessions.where('status').equals('active').first();
		return record ? recordToSession(record) : null;
	}

	async save(session: WorkoutSession): Promise<void> {
		const record = sessionToRecord(session);
		await db.workoutSessions.put(record);
	}

	async delete(id: string): Promise<void> {
		await db.workoutSessions.delete(id);
	}
}
