import type { ExerciseMedia } from '../../domain/value-objects/ExerciseMedia';

export interface ImageCompressionOptions {
	readonly maxWidth: number;
	readonly maxHeight: number;
	readonly quality: number; // 0..1
}

/**
 * Port — processamento de mídia client-side.
 * Adapter concreto usa Canvas API para comprimir JPG/PNG -> WebP.
 * Vídeos .mp4 passam direto (validados por tamanho/duração).
 */
export interface MediaProcessor {
	process(file: File, options?: ImageCompressionOptions): Promise<ExerciseMedia>;
	compressImage(file: File, options?: ImageCompressionOptions): Promise<ExerciseMedia>;
	validateVideo(file: File): Promise<ExerciseMedia>;
}
