export const MUSCLE_GROUPS = [
	'chest',
	'back',
	'shoulders',
	'biceps',
	'triceps',
	'forearms',
	'quads',
	'hamstrings',
	'glutes',
	'calves',
	'abs',
	'other'
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export function isMuscleGroup(value: unknown): value is MuscleGroup {
	return typeof value === 'string' && (MUSCLE_GROUPS as readonly string[]).includes(value);
}
