#!/usr/bin/env node
/**
 * MoralGym — gerador de ícones PWA a partir do `logo.svg`.
 *
 * Gera em `static/icons/`:
 *   - pwa-192x192.png           — ícone Android/iOS padrão
 *   - pwa-512x512.png           — alta resolução para splash e lojas
 *   - maskable-icon-512x512.png — respeita safe-area de 80% (Android adaptativo)
 *
 * Dependência: `sharp` (somente em dev).
 *   npm i -D sharp
 *
 * Uso:
 *   node scripts/generate-icons.mjs
 *
 * Por que `sharp` e não Canvas/HTML? Saída determinística, sem navegador,
 * suporta rasterização SVG nativa via librsvg e aceita aliasing fino em
 * ícones pequenos (o 192×192 é onde a maioria dos geradores web falha).
 * Em CI, basta rodar este script antes do build e o resultado é
 * byte-idêntico entre máquinas.
 */
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SRC = resolve(ROOT, 'static/icons/logo.svg');
const OUT = resolve(ROOT, 'static/icons');

const BACKGROUND = '#0B0B0D'; // = manifest.background_color / theme_color

async function render({ file, size, padding = 0 }) {
	// `padding` em frações (0.0 = sem padding, 0.2 = safe-area maskable).
	const inner = Math.round(size * (1 - padding * 2));
	const offset = Math.round((size - inner) / 2);

	// Renderiza o SVG sobre uma base opaca do tamanho final — essencial
	// para maskable, onde o Android pode recortar arredondando.
	const buffer = await sharp(SRC)
		.resize(inner, inner, { fit: 'contain', background: BACKGROUND })
		.png()
		.toBuffer();

	await sharp({
		create: {
			width: size,
			height: size,
			channels: 4,
			background: BACKGROUND
		}
	})
		.composite([{ input: buffer, top: offset, left: offset }])
		.png({ compressionLevel: 9 })
		.toFile(resolve(OUT, file));

	console.log(`✓ ${file} (${size}×${size}${padding ? `, padding ${padding * 100}%` : ''})`);
}

async function main() {
	await mkdir(OUT, { recursive: true });
	await render({ file: 'pwa-192x192.png', size: 192 });
	await render({ file: 'pwa-512x512.png', size: 512 });
	// Maskable: Android recorta até 20% das bordas em formatos adaptativos;
	// padding de 10% deixa o glifo inteiro dentro da safe-area garantida.
	await render({ file: 'maskable-icon-512x512.png', size: 512, padding: 0.1 });
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
