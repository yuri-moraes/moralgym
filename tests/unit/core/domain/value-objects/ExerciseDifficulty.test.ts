import { describe, it, expect } from 'vitest';
import { createDifficulty, validateDifficulty } from '../../../../../src/core/domain/value-objects/ExerciseDifficulty';

describe('ExerciseDifficulty', () => {
	describe('validateDifficulty', () => {
		it('accepts valid difficulties: beginner, intermediate, advanced', () => {
			expect(validateDifficulty('beginner')).toBe(true);
			expect(validateDifficulty('intermediate')).toBe(true);
			expect(validateDifficulty('advanced')).toBe(true);
		});

		it('rejects invalid difficulties', () => {
			expect(validateDifficulty('hard')).toBe(false);
			expect(validateDifficulty('easy')).toBe(false);
			expect(validateDifficulty('expert')).toBe(false);
			expect(validateDifficulty('')).toBe(false);
			expect(validateDifficulty(null)).toBe(false);
			expect(validateDifficulty(undefined)).toBe(false);
			expect(validateDifficulty(123)).toBe(false);
			expect(validateDifficulty({})).toBe(false);
		});
	});

	describe('createDifficulty', () => {
		it('creates valid difficulty levels', () => {
			expect(createDifficulty('beginner')).toBe('beginner');
			expect(createDifficulty('intermediate')).toBe('intermediate');
			expect(createDifficulty('advanced')).toBe('advanced');
		});

		it('throws error for invalid difficulties', () => {
			expect(() => createDifficulty('hard')).toThrow();
			expect(() => createDifficulty('easy')).toThrow();
			expect(() => createDifficulty('expert')).toThrow();
			expect(() => createDifficulty('')).toThrow();
			expect(() => createDifficulty(null)).toThrow();
			expect(() => createDifficulty(undefined)).toThrow();
			expect(() => createDifficulty(123)).toThrow();
		});

		it('error message includes the invalid value', () => {
			expect(() => createDifficulty('invalid')).toThrow(/Invalid difficulty level: invalid/);
		});
	});
});
