export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export function validateDifficulty(value: unknown): value is DifficultyLevel {
	return typeof value === 'string' && ['beginner', 'intermediate', 'advanced'].includes(value);
}

export function createDifficulty(value: unknown): DifficultyLevel {
	if (!validateDifficulty(value)) {
		throw new Error(`Invalid difficulty level: ${value}. Must be 'beginner', 'intermediate', or 'advanced'.`);
	}
	return value;
}
