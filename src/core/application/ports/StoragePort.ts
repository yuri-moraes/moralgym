/**
 * Port — abstração de armazenamento chave-valor assíncrono.
 * Adapter concreto pode ser localStorage, sessionStorage, IndexedDB, ou cloud storage.
 */
export interface StoragePort {
	getItem(key: string): Promise<string | null>;
	setItem(key: string, value: string): Promise<void>;
	removeItem(key: string): Promise<void>;
}
