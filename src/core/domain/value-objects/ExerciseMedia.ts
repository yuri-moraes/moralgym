export type MediaMimeType = 'image/webp' | 'video/mp4';

export interface ExerciseMedia {
	readonly blob: Blob;
	readonly mimeType: MediaMimeType;
}

export function isVideo(media: ExerciseMedia): boolean {
	return media.mimeType === 'video/mp4';
}
