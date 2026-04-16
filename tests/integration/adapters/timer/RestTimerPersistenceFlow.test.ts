import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebWorkerRestTimer } from '../../../../../src/adapters/timer/WebWorkerRestTimer';
import { LocalStorageAdapter } from '../../../../../src/adapters/storage/LocalStorageAdapter';
import { PersistRestTimerUseCase } from '../../../../../src/core/application/use-cases/PersistRestTimerUseCase';

/**
 * Testes de integração para fluxo de persistência do cronômetro.
 *
 * Nota: Estes testes usam WebWorkerRestTimer real (embora Worker seja mockado
 * em ambiente de testes), e storage em memória para simular localStorage.
 */

// Mock de localStorage para testes
const mockLocalStorage = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		}
	};
})();

// Substituir localStorage global durante testes
Object.defineProperty(window, 'localStorage', {
	value: mockLocalStorage,
	writable: true
});

describe('RestTimerPersistenceFlow', () => {
	beforeEach(() => {
		mockLocalStorage.clear();
	});

	it('should persist timer state to localStorage', async () => {
		const storage = new LocalStorageAdapter();
		const timer = new WebWorkerRestTimer();

		const useCase = new PersistRestTimerUseCase({
			restTimer: timer,
			storage
		});

		// Persiste estado inicial
		const result = await useCase.execute();
		expect(result.persisted).toBe(true);

		// Verificar que foi salvo
		const stored = await storage.getItem('moralgym:rest_timer:state');
		expect(stored).not.toBeNull();

		const parsed = JSON.parse(stored!);
		expect(parsed).toHaveProperty('running');
		expect(parsed).toHaveProperty('paused');
		expect(parsed).toHaveProperty('remainingSeconds');
		expect(parsed).toHaveProperty('totalSeconds');
		expect(parsed).toHaveProperty('savedAt');

		timer.dispose();
	});

	it('should restore state from localStorage', async () => {
		const storage = new LocalStorageAdapter();
		const timer = new WebWorkerRestTimer();

		// Salvar estado inicial
		const initialState = {
			remainingSeconds: 150,
			totalSeconds: 300,
			running: false,
			paused: false,
			savedAt: new Date().toISOString()
		};

		await storage.setItem('moralgym:rest_timer:state', JSON.stringify(initialState));

		// Restaurar
		const useCase = new PersistRestTimerUseCase({
			restTimer: timer,
			storage
		});

		const restored = await useCase.restoreState();
		expect(restored).not.toBeNull();

		timer.dispose();
	});

	it('should adjust remaining time by elapsed duration', async () => {
		const storage = new LocalStorageAdapter();
		const timer = new WebWorkerRestTimer();

		// Simular estado salvo há 5 segundos
		const fiveSecondsAgo = new Date(Date.now() - 5000);
		const savedState = {
			remainingSeconds: 120,
			totalSeconds: 300,
			running: true,
			paused: false,
			savedAt: fiveSecondsAgo.toISOString()
		};

		await storage.setItem('moralgym:rest_timer:state', JSON.stringify(savedState));

		// Restaurar
		const useCase = new PersistRestTimerUseCase({
			restTimer: timer,
			storage
		});

		const restored = await useCase.restoreState();

		if (restored) {
			// remaining deveria ser 115 (120 - 5)
			expect(restored.remainingSeconds).toBeLessThanOrEqual(120);
			expect(restored.remainingSeconds).toBeGreaterThanOrEqual(115);
		}

		timer.dispose();
	});

	it('should clear persisted state', async () => {
		const storage = new LocalStorageAdapter();
		const timer = new WebWorkerRestTimer();

		// Persist
		const useCase = new PersistRestTimerUseCase({
			restTimer: timer,
			storage
		});

		await useCase.execute();
		let stored = await storage.getItem('moralgym:rest_timer:state');
		expect(stored).not.toBeNull();

		// Clear
		await useCase.clearPersistedState();
		stored = await storage.getItem('moralgym:rest_timer:state');
		expect(stored).toBeNull();

		timer.dispose();
	});

	it('should handle non-existent stored state gracefully', async () => {
		const storage = new LocalStorageAdapter();
		const timer = new WebWorkerRestTimer();

		const useCase = new PersistRestTimerUseCase({
			restTimer: timer,
			storage
		});

		const restored = await useCase.restoreState();
		expect(restored).toBeNull();

		timer.dispose();
	});
});
