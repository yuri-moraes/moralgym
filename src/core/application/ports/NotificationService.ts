export interface NotificationPayload {
	readonly title: string;
	readonly body?: string;
	readonly vibrate?: readonly number[];
}

export type PermissionStatus = 'granted' | 'denied' | 'default';

export interface NotificationService {
	requestPermission(): Promise<PermissionStatus>;
	getPermission(): PermissionStatus;
	notify(payload: NotificationPayload): Promise<void>;
}
