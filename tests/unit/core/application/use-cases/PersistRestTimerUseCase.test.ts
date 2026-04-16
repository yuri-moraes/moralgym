import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RestTimer, RestTimerState } from '../../../../../src/core/application/ports/RestTimer';
import type { StoragePort } from '../../../../../src/core/application/ports/StoragePort';
import { PersistRestTimerUseCase } from '../../../../../src/core/application/use-cases/PersistRestTimerUseCase';

describe('PersistRestTimerUseCase', () => {
	let mockTimer: Partial<RestTimer>;
	let mockStorage: Partial<StoragePort>;
	let mockState: RestTimerState;

	beforeEach(() => {
		mockState = {
			running: true,
			paused: false,
			remainingSeconds: 120,
			totalSeconds: 300,
			elapsedSeconds: 180
		};

		mockTimer = {
			getState: vi.fn().mockResolvedValue(mockState),
			setState: vi.fn().mockResolvedValue(undefined)
		};

		mockStorage = {
			getItem: vi.fn().mockResolvedValue(null),
			setItem: vi.fn().mockResolvedValue(undefined),
			removeItem: vi.fn().mockResolvedValue(undefined)
		};
	});

	describe('execute() - persist state', () => {
		it('should serialize timer state to JSON', async () => {
			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await useCase.execute();

			expect(mockStorage.setItem).toHaveBeenCalled();
			const [, jsonString] = (mockStorage.setItem as any).mock.calls[0];
			const parsed = JSON.parse(jsonString);
			expect(parsed).toHaveProperty('remainingSeconds', 120);
			expect(parsed).toHaveProperty('totalSeconds', 300);
			expect(parsed).toHaveProperty('running', true);
			expect(parsed).toHaveProperty('paused', false);
		});

		it('should save with correct key', async () => {
			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await useCase.execute();

			expect(mockStorage.setItem).toHaveBeenCalledWith(
				'moralgym:rest_timer:state',
				expect.any(String)
			);
		});

		it('should include savedAt timestamp', async () => {
			const beforeTime = new Date();
			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await useCase.execute();

			const [, jsonString] = (mockStorage.setItem as any).mock.calls[0];
			const parsed = JSON.parse(jsonString);
			const savedAt = new Date(parsed.savedAt);

			expect(savedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
			expect(savedAt.getTime()).toBeLessThanOrEqual(new Date().getTime() + 1000);
		});

		it('should return persisted: true on success', async () => {
			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			const result = await useCase.execute();

			expect(result.persisted).toBe(true);
		});

		it('should handle storage errors gracefully', async () => {
			mockStorage.setItem = vi
				.fn()
				.mockRejectedValue(new Error('QuotaExceededError'));

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			const result = await useCase.execute();

			expect(result.persisted).toBe(false);
		});

		it('should not throw on storage errors', async () => {
			mockStorage.setItem = vi.fn().mockRejectedValue(new Error('Storage full'));

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await expect(useCase.execute()).resolves.toBeDefined();
		});
	});

	describe('restoreState() - retrieve and adjust', () => {
		it('should return null if no stored state', async () => {
			mockStorage.getItem = vi.fn().mockResolvedValue(null);

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			const result = await useCase.restoreState();

			expect(result).toBeNull();
		});

		it('should calculate elapsed time correctly', async () => {
			const tenSecondsAgo = new Date(Date.now() - 10000);
			const stored = {
				remainingSeconds: 120,
				totalSeconds: 300,
				running: true,
				paused: false,
				savedAt: tenSecondsAgo.toISOString()
			};

			mockStorage.getItem = vi
				.fn()
				.mockResolvedValue(JSON.stringify(stored));

			mockTimer.getState = vi
				.fn()
				.mockResolvedValue({
					...mockState,
					remainingSeconds: 110 // 120 - 10 elapsed
				});

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			const result = await useCase.restoreState();

			expect(mockTimer.setState).toHaveBeenCalledWith(110);
		});

		it('should restore timer state if running', async () => {
			const fiveSecondsAgo = new Date(Date.now() - 5000);
			const stored = {
				remainingSeconds: 120,
				totalSeconds: 300,
				running: true,
				paused: false,
				savedAt: fiveSecondsAgo.toISOString()
			};

			mockStorage.getItem = vi
				.fn()
				.mockResolvedValue(JSON.stringify(stored));

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await useCase.restoreState();

			expect(mockTimer.setState).toHaveBeenCalledWith(115); // 120 - 5
		});

		it('should not restore if timer already paused', async () => {
			const stored = {
				remainingSeconds: 120,
				totalSeconds: 300,
				running: true,
				paused: true,
				savedAt: new Date().toISOString()
			};

			mockStorage.getItem = vi
				.fn()
				.mockResolvedValue(JSON.stringify(stored));

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await useCase.restoreState();

			expect(mockTimer.setState).not.toHaveBeenCalled();
		});

		it('should handle expired timer (remaining <= 0)', async () => {
			const twoMinutesAgo = new Date(Date.now() - 120000);
			const stored = {
				remainingSeconds: 60,
				totalSeconds: 300,
				running: true,
				paused: false,
				savedAt: twoMinutesAgo.toISOString()
			};

			mockStorage.getItem = vi
				.fn()
				.mockResolvedValue(JSON.stringify(stored));

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await useCase.restoreState();

			// Should clear the persisted state if expired
			expect(mockStorage.removeItem).toHaveBeenCalledWith('moralgym:rest_timer:state');
		});

		it('should return current timer state after restoration', async () => {
			const stored = {
				remainingSeconds: 100,
				totalSeconds: 300,
				running: true,
				paused: false,
				savedAt: new Date().toISOString()
			};

			mockStorage.getItem = vi
				.fn()
				.mockResolvedValue(JSON.stringify(stored));

			const restoredState: RestTimerState = {
				running: true,
				paused: false,
				remainingSeconds: 100,
				totalSeconds: 300,
				elapsedSeconds: 200
			};

			mockTimer.getState = vi.fn().mockResolvedValue(restoredState);

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			const result = await useCase.restoreState();

			expect(result).toEqual(restoredState);
		});

		it('should handle parse errors gracefully', async () => {
			mockStorage.getItem = vi.fn().mockResolvedValue('invalid json {');

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			const result = await useCase.restoreState();

			expect(result).toBeNull();
		});
	});

	describe('clearPersistedState()', () => {
		it('should remove stored state', async () => {
			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await useCase.clearPersistedState();

			expect(mockStorage.removeItem).toHaveBeenCalledWith('moralgym:rest_timer:state');
		});

		it('should handle removal errors gracefully', async () => {
			mockStorage.removeItem = vi.fn().mockRejectedValue(new Error('Removal failed'));

			const useCase = new PersistRestTimerUseCase({
				restTimer: mockTimer as RestTimer,
				storage: mockStorage as StoragePort
			});

			await expect(useCase.clearPersistedState()).resolves.not.toThrow();
		});
	});
});
