export type SplitCount = 1 | 2 | 3 | 4 | 5;

export interface Routine {
	readonly id: string;
	readonly name: string;
	readonly description?: string;
	readonly splitCount: SplitCount;
	readonly isActive: boolean;
	readonly createdAt: Date;
	readonly updatedAt: Date;
}
