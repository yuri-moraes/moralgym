import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RestTimer, RestTimerState } from '../../../../../src/core/application/ports/RestTimer';
import { UpdateRestTimerSecondsUseCase } from '../../../../../src/core/application/use-cases/UpdateRestTimerSecondsUseCase';

describe('UpdateRestTimerSecondsUseCase', () => {
	let mockTimer: Partial<RestTimer>;

	beforeEach(() => {
		const mockState: RestTimerState = {
			running: true,
			paused: false,
			remainingSeconds: 60,
			totalSeconds: 300,
			elapsedSeconds: 240
		};

		mockTimer = {
			setState: vi.fn().mockResolvedValue(undefined),
			getState: vi.fn().mockResolvedValue(mockState)
		};
	});

	describe('input validation', () => {
		it('should reject 0 seconds', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			await expect(useCase.execute({ newSeconds: 0 })).rejects.toThrow(
				/entre 1 e 3600/
			);
		});

		it('should reject negative seconds', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			await expect(useCase.execute({ newSeconds: -10 })).rejects.toThrow(
				/entre 1 e 3600/
			);
		});

		it('should reject > 3600 seconds', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			await expect(useCase.execute({ newSeconds: 3601 })).rejects.toThrow(
				/entre 1 e 3600/
			);
		});

		it('should reject non-integer seconds', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			await expect(useCase.execute({ newSeconds: 60.5 })).rejects.toThrow(
				/entre 1 e 3600/
			);
		});

		it('should accept 1 second (minimum)', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			const result = await useCase.execute({ newSeconds: 1 });
			expect(result).toBeDefined();
		});

		it('should accept 3600 seconds (maximum)', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			const result = await useCase.execute({ newSeconds: 3600 });
			expect(result).toBeDefined();
		});
	});

	describe('execution', () => {
		it('should call restTimer.setState() with new seconds', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			await useCase.execute({ newSeconds: 120 });
			expect(mockTimer.setState).toHaveBeenCalledWith(120);
			expect(mockTimer.setState).toHaveBeenCalledTimes(1);
		});

		it('should call restTimer.getState() after setState()', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			await useCase.execute({ newSeconds: 60 });
			expect(mockTimer.getState).toHaveBeenCalled();
		});

		it('should return updated timer state', async () => {
			const expectedState: RestTimerState = {
				running: true,
				paused: false,
				remainingSeconds: 120,
				totalSeconds: 300,
				elapsedSeconds: 180
			};

			mockTimer.getState = vi.fn().mockResolvedValue(expectedState);

			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			const result = await useCase.execute({ newSeconds: 120 });

			expect(result.state).toEqual(expectedState);
		});
	});

	describe('boundary conditions', () => {
		it('should handle valid range 1-3600 inclusive', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });

			// Min
			let result = await useCase.execute({ newSeconds: 1 });
			expect(result).toBeDefined();

			// Mid
			result = await useCase.execute({ newSeconds: 1800 });
			expect(result).toBeDefined();

			// Max
			result = await useCase.execute({ newSeconds: 3600 });
			expect(result).toBeDefined();
		});

		it('should reject float numbers', async () => {
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });
			await expect(useCase.execute({ newSeconds: 30.1 })).rejects.toThrow();
			await expect(useCase.execute({ newSeconds: 60.9 })).rejects.toThrow();
		});
	});

	describe('error handling', () => {
		it('should propagate setState() errors', async () => {
			mockTimer.setState = vi
				.fn()
				.mockRejectedValue(new Error('Worker communication failed'));
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });

			await expect(useCase.execute({ newSeconds: 60 })).rejects.toThrow(
				'Worker communication failed'
			);
		});

		it('should propagate getState() errors', async () => {
			mockTimer.getState = vi
				.fn()
				.mockRejectedValue(new Error('State retrieval failed'));
			const useCase = new UpdateRestTimerSecondsUseCase({ restTimer: mockTimer as RestTimer });

			await expect(useCase.execute({ newSeconds: 60 })).rejects.toThrow(
				'State retrieval failed'
			);
		});
	});
});
