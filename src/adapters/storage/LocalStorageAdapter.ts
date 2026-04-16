import type { StoragePort } from '../../core/application/ports/StoragePort';

/**
 * Adapter que implementa StoragePort delegando a localStorage do navegador.
 *
 * Nota: localStorage é síncrono, mas este adapter retorna Promises
 * para manter compatibilidade com StoragePort e permitir migração futura
 * para storage assíncrono (IndexedDB, cloud, etc).
 */
export class LocalStorageAdapter implements StoragePort {
	async getItem(key: string): Promise<string | null> {
		return localStorage.getItem(key);
	}

	async setItem(key: string, value: string): Promise<void> {
		localStorage.setItem(key, value);
	}

	async removeItem(key: string): Promise<void> {
		localStorage.removeItem(key);
	}
}
