export interface BackupMetadata {
	readonly exportedAt: Date;
	readonly appVersion: string;
	readonly exerciseCount: number;
	readonly routineCount: number;
	readonly logCount: number;
	readonly userId?: string;
	readonly deviceId?: string;
}
