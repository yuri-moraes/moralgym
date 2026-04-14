/**
 * Converte segundos em mm:ss. Usado pelo cronômetro de descanso.
 */
export function formatRest(seconds: number): string {
	const safe = Math.max(0, Math.floor(seconds));
	const m = Math.floor(safe / 60);
	const s = safe % 60;
	return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatSessionDuration(startedAt: Date, endedAt: Date): string {
	const diffMs = endedAt.getTime() - startedAt.getTime();
	const totalSec = Math.max(0, Math.floor(diffMs / 1000));
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
}
