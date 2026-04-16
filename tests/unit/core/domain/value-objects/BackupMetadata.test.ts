import { describe, it, expect } from 'vitest';
import type { BackupMetadata } from '../../../../../src/core/domain/value-objects/BackupMetadata';

describe('BackupMetadata', () => {
	describe('required fields', () => {
		it('creates with all required fields', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date('2025-04-15T10:00:00Z'),
				appVersion: '1.0.0',
				exerciseCount: 10,
				routineCount: 3,
				logCount: 50
			};

			expect(metadata.exportedAt).toEqual(new Date('2025-04-15T10:00:00Z'));
			expect(metadata.appVersion).toBe('1.0.0');
			expect(metadata.exerciseCount).toBe(10);
			expect(metadata.routineCount).toBe(3);
			expect(metadata.logCount).toBe(50);
		});

		it('fields are readonly', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date(),
				appVersion: '1.0.0',
				exerciseCount: 10,
				routineCount: 3,
				logCount: 50
			};

			// @ts-expect-error - readonly property
			metadata.exerciseCount = 20;

			// Verify assignment didn't work (or was prevented by runtime)
			expect(metadata.exerciseCount).toBe(10);
		});
	});

	describe('optional fields', () => {
		it('works without optional userId and deviceId', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date(),
				appVersion: '1.0.0',
				exerciseCount: 0,
				routineCount: 0,
				logCount: 0
			};

			expect(metadata.userId).toBeUndefined();
			expect(metadata.deviceId).toBeUndefined();
		});

		it('works with optional userId', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date(),
				appVersion: '1.0.0',
				exerciseCount: 5,
				routineCount: 1,
				logCount: 20,
				userId: 'user-123'
			};

			expect(metadata.userId).toBe('user-123');
			expect(metadata.deviceId).toBeUndefined();
		});

		it('works with optional deviceId', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date(),
				appVersion: '1.0.0',
				exerciseCount: 5,
				routineCount: 1,
				logCount: 20,
				deviceId: 'device-456'
			};

			expect(metadata.deviceId).toBe('device-456');
			expect(metadata.userId).toBeUndefined();
		});

		it('works with both optional fields', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date(),
				appVersion: '2.0.0',
				exerciseCount: 15,
				routineCount: 5,
				logCount: 100,
				userId: 'user-789',
				deviceId: 'device-abc'
			};

			expect(metadata.userId).toBe('user-789');
			expect(metadata.deviceId).toBe('device-abc');
		});

		it('handles edge cases for counts', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date(),
				appVersion: '0.0.1',
				exerciseCount: 0,
				routineCount: 0,
				logCount: 0
			};

			expect(metadata.exerciseCount).toBe(0);
			expect(metadata.routineCount).toBe(0);
			expect(metadata.logCount).toBe(0);
		});

		it('handles large count values', () => {
			const metadata: BackupMetadata = {
				exportedAt: new Date(),
				appVersion: '1.0.0',
				exerciseCount: 10000,
				routineCount: 1000,
				logCount: 1000000
			};

			expect(metadata.exerciseCount).toBe(10000);
			expect(metadata.routineCount).toBe(1000);
			expect(metadata.logCount).toBe(1000000);
		});
	});
});
