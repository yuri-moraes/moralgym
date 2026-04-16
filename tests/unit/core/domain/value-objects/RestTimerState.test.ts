import { describe, it, expect } from 'vitest';
import type { RestTimerState } from '../../../../../src/core/domain/value-objects/RestTimerState';

describe('RestTimerState', () => {
	describe('interface constraints', () => {
		it('creates valid state with all properties', () => {
			const state: RestTimerState = {
				running: true,
				paused: false,
				remainingSeconds: 30,
				totalSeconds: 60,
				elapsedSeconds: 30
			};

			expect(state.running).toBe(true);
			expect(state.paused).toBe(false);
			expect(state.remainingSeconds).toBe(30);
			expect(state.totalSeconds).toBe(60);
			expect(state.elapsedSeconds).toBe(30);
		});

		it('creates valid state with running=false', () => {
			const state: RestTimerState = {
				running: false,
				paused: true,
				remainingSeconds: 60,
				totalSeconds: 60,
				elapsedSeconds: 0
			};

			expect(state.running).toBe(false);
			expect(state.paused).toBe(true);
		});

		it('properties are readonly (TypeScript check)', () => {
			const state: RestTimerState = {
				running: true,
				paused: false,
				remainingSeconds: 30,
				totalSeconds: 60,
				elapsedSeconds: 30
			};

			// TypeScript will prevent mutation at compile time
			// This test verifies the type system is enforced
			expect(state.running).toBe(true);

			// @ts-expect-error - readonly property
			state.running = false;

			// Verify assignment didn't work (or was prevented by runtime)
			expect(state.running).toBe(true);
		});

		it('handles all valid time scenarios', () => {
			// Freshly started timer
			const fresh: RestTimerState = {
				running: true,
				paused: false,
				remainingSeconds: 60,
				totalSeconds: 60,
				elapsedSeconds: 0
			};
			expect(fresh.remainingSeconds).toBe(60);
			expect(fresh.elapsedSeconds).toBe(0);

			// Half way through
			const halfway: RestTimerState = {
				running: true,
				paused: false,
				remainingSeconds: 30,
				totalSeconds: 60,
				elapsedSeconds: 30
			};
			expect(halfway.remainingSeconds + halfway.elapsedSeconds).toBe(60);

			// Finished
			const finished: RestTimerState = {
				running: false,
				paused: false,
				remainingSeconds: 0,
				totalSeconds: 60,
				elapsedSeconds: 60
			};
			expect(finished.remainingSeconds).toBe(0);
			expect(finished.elapsedSeconds).toBe(60);
		});
	});
});
