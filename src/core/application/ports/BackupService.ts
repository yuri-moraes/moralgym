import type { BackupSnapshot } from '../../domain/entities/BackupSnapshot';

export interface ExportOptions {
	readonly includeWorkoutLogs?: boolean;
	readonly prettifyJson?: boolean;
}

export interface ImportOptions {
	readonly mergeMode?: 'replace' | 'merge';
	readonly clearBeforeImport?: boolean;
}

/**
 * Port — serviço de backup e restauração de dados.
 * Responsável por exportar e importar dados da aplicação em formato JSON.
 */
export interface BackupService {
	exportAsJson(options?: ExportOptions): Promise<string>;
	importFromJson(json: string, options?: ImportOptions): Promise<BackupSnapshot>;
}
