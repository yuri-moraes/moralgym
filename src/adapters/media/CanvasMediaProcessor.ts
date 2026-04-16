import type {
	ImageCompressionOptions,
	MediaProcessor
} from '../../core/application/ports/MediaProcessor';
import type { ExerciseMedia } from '../../core/domain/value-objects/ExerciseMedia';

const DEFAULT_OPTIONS: ImageCompressionOptions = {
	maxWidth: 1080,
	maxHeight: 1080,
	quality: 0.82
};

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_VIDEO_BYTES = 5 * 1024 * 1024; // 5 MB

export class MediaProcessingError extends Error {
	constructor(
		message: string,
		public readonly code:
			| 'UNSUPPORTED_IMAGE'
			| 'UNSUPPORTED_VIDEO'
			| 'VIDEO_TOO_LARGE'
			| 'DECODE_FAILED'
			| 'ENCODE_FAILED'
	) {
		super(message);
		this.name = 'MediaProcessingError';
	}
}

/**
 * Adapter que comprime imagens via Canvas API para WebP e valida vídeos MP4.
 *
 * Detalhes importantes:
 * - Usa `createImageBitmap` (mais rápido e sem precisar anexar ao DOM).
 * - Preserva aspect-ratio respeitando maxWidth/maxHeight.
 * - Não rotaciona EXIF (createImageBitmap já honra `imageOrientation: 'from-image'`).
 * - Libera memória com `close()` após o encode.
 */
export class CanvasMediaProcessor implements MediaProcessor {
	/**
	 * Processa um arquivo de mídia automaticamente detectando seu tipo.
	 * Imagens são comprimidas para WebP; vídeos são validados.
	 */
	async process(file: File, options?: ImageCompressionOptions): Promise<ExerciseMedia> {
		if (file.type.startsWith('image/')) {
			return this.compressImage(file, options);
		} else if (file.type === 'video/mp4') {
			return this.validateVideo(file);
		} else {
			throw new MediaProcessingError(
				`Tipo de arquivo não suportado: ${file.type}. Use imagens (JPEG/PNG) ou vídeos MP4.`,
				'UNSUPPORTED_IMAGE'
			);
		}
	}

	async compressImage(file: File, options?: ImageCompressionOptions): Promise<ExerciseMedia> {
		if (!ACCEPTED_IMAGE_TYPES.includes(file.type as (typeof ACCEPTED_IMAGE_TYPES)[number])) {
			throw new MediaProcessingError(
				`Tipo de imagem não suportado: ${file.type}`,
				'UNSUPPORTED_IMAGE'
			);
		}

		const opts = { ...DEFAULT_OPTIONS, ...options };

		let bitmap: ImageBitmap;
		try {
			bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
		} catch (err) {
			throw new MediaProcessingError(
				`Falha ao decodificar imagem: ${(err as Error).message}`,
				'DECODE_FAILED'
			);
		}

		const { width, height } = fitWithin(bitmap.width, bitmap.height, opts.maxWidth, opts.maxHeight);

		const canvas = createCanvas(width, height);
		const ctx = canvas.getContext('2d');
		if (!ctx) {
			bitmap.close();
			throw new MediaProcessingError('Contexto 2D indisponível', 'ENCODE_FAILED');
		}
		ctx.drawImage(bitmap, 0, 0, width, height);
		bitmap.close();

		const blob = await encodeToWebP(canvas, opts.quality);
		return { blob, mimeType: 'image/webp' };
	}

	async validateVideo(file: File): Promise<ExerciseMedia> {
		if (file.type !== 'video/mp4') {
			throw new MediaProcessingError(
				`Apenas vídeos MP4 são suportados (recebido: ${file.type})`,
				'UNSUPPORTED_VIDEO'
			);
		}
		if (file.size > MAX_VIDEO_BYTES) {
			const mb = (file.size / 1024 / 1024).toFixed(1);
			throw new MediaProcessingError(
				`Vídeo excede limite de 5MB (recebido: ${mb}MB)`,
				'VIDEO_TOO_LARGE'
			);
		}
		// File é um Blob; guardamos sem re-encode.
		return { blob: file, mimeType: 'video/mp4' };
	}
}

// ------------------------------------------------------------
// Helpers privados
// ------------------------------------------------------------

type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;

function createCanvas(width: number, height: number): AnyCanvas {
	if (typeof OffscreenCanvas !== 'undefined') {
		return new OffscreenCanvas(width, height);
	}
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

function fitWithin(
	srcW: number,
	srcH: number,
	maxW: number,
	maxH: number
): { width: number; height: number } {
	const ratio = Math.min(maxW / srcW, maxH / srcH, 1);
	return { width: Math.round(srcW * ratio), height: Math.round(srcH * ratio) };
}

async function encodeToWebP(canvas: AnyCanvas, quality: number): Promise<Blob> {
	if (canvas instanceof OffscreenCanvas) {
		return canvas.convertToBlob({ type: 'image/webp', quality });
	}
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) =>
				blob
					? resolve(blob)
					: reject(new MediaProcessingError('Encode WebP falhou', 'ENCODE_FAILED')),
			'image/webp',
			quality
		);
	});
}
