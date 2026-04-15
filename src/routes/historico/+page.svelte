<script lang="ts">
	import { onMount } from 'svelte';
	import { getContainer } from '$lib/container';
	import type { Exercise } from '$core/domain/entities/Exercise';

	type LoadState = 'loading' | 'ready' | 'error';

	interface SetRow {
		setNumber: number;
		reps: number;
		loadKg: number;
		rpe?: number;
	}

	interface ExerciseEntry {
		exerciseName: string;
		muscleGroup: string;
		sets: SetRow[];
	}

	interface DaySession {
		/** ISO date string sem hora — ex.: "2026-04-14" */
		dateKey: string;
		label: string; // "Hoje", "Ontem" ou "14 abr. 2026"
		exercises: ExerciseEntry[];
	}

	let loadState = $state<LoadState>('loading');
	let sessions = $state<DaySession[]>([]);
	let errorMessage = $state<string | null>(null);

	/** Formata epoch ms para chave de dia local (YYYY-MM-DD). */
	function toDayKey(date: Date): string {
		return date.toLocaleDateString('sv'); // 'sv' locale usa ISO 8601 por padrão
	}

	/** Rótulo amigável para datas recentes. */
	function dayLabel(dateKey: string): string {
		const today = toDayKey(new Date());
		const yesterday = toDayKey(new Date(Date.now() - 86_400_000));
		if (dateKey === today) return 'Hoje';
		if (dateKey === yesterday) return 'Ontem';
		// "seg., 14 abr. 2026" — compacto mas legível
		const [year, month, day] = dateKey.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	const MUSCLE_GROUP_LABELS: Record<string, string> = {
		chest: 'Peito',
		back: 'Costas',
		shoulders: 'Ombros',
		biceps: 'Bíceps',
		triceps: 'Tríceps',
		forearms: 'Antebraços',
		quads: 'Quadríceps',
		hamstrings: 'Isquiotibiais',
		glutes: 'Glúteos',
		calves: 'Panturrilhas',
		abs: 'Abdômen',
		other: 'Outro'
	};

	onMount(() => {
		(async () => {
			try {
				const { workoutLogs, exercises } = getContainer();

				const logs = await workoutLogs.findAll(500);
				if (logs.length === 0) {
					sessions = [];
					loadState = 'ready';
					return;
				}

				// Resolver nomes dos exercícios em paralelo (sem repetir IDs).
				const uniqueExerciseIds = [...new Set<string>(logs.map((l) => l.exerciseId))];
				const exerciseMap = new Map<string, Exercise>();
				await Promise.all(
					uniqueExerciseIds.map(async (id) => {
						const ex = await exercises.findById(id);
						if (ex) exerciseMap.set(id, ex);
					})
				);

				// Agrupar logs por dia, depois por exercício dentro do dia.
				// logs já chegam ordenados do mais recente para o mais antigo (findAll usa reverse()).
				const dayMap = new Map<string, Map<string, SetRow[]>>();

				for (const log of logs) {
					const dayKey = toDayKey(log.performedAt);

					if (!dayMap.has(dayKey)) {
						dayMap.set(dayKey, new Map());
					}
					const exerciseMap2 = dayMap.get(dayKey)!;

					if (!exerciseMap2.has(log.exerciseId)) {
						exerciseMap2.set(log.exerciseId, []);
					}
					exerciseMap2.get(log.exerciseId)!.push({
						setNumber: log.setNumber,
						reps: log.reps,
						loadKg: log.loadKg,
						rpe: log.rpe
					});
				}

				// Converter Map aninhado → array tipado.
				const result: DaySession[] = [];
				for (const [dateKey, exerciseEntries] of dayMap.entries()) {
					const exerciseList: ExerciseEntry[] = [];
					for (const [exerciseId, sets] of exerciseEntries.entries()) {
						const ex = exerciseMap.get(exerciseId);
						exerciseList.push({
							exerciseName: ex?.name ?? `Exercício ${exerciseId.slice(0, 8)}…`,
							muscleGroup: ex ? (MUSCLE_GROUP_LABELS[ex.muscleGroup] ?? ex.muscleGroup) : '—',
							sets: sets.sort((a, b) => a.setNumber - b.setNumber)
						});
					}
					result.push({ dateKey, label: dayLabel(dateKey), exercises: exerciseList });
				}

				// dayMap já está em ordem de inserção (mais recente primeiro, pois logs é reverse()).
				sessions = result;
				loadState = 'ready';
			} catch (err) {
				console.error('[historico] Falha ao carregar histórico', err);
				errorMessage = err instanceof Error ? err.message : 'Erro desconhecido.';
				loadState = 'error';
			}
		})();
	});
</script>

<svelte:head>
	<title>Histórico · MoralGym</title>
</svelte:head>

{#if loadState === 'loading'}
	<div class="space-y-6" aria-busy="true" aria-live="polite">
		<div class="h-5 w-24 animate-pulse rounded bg-white/5"></div>
		{#each [0, 1, 2] as _}
			<div class="space-y-3">
				<div class="h-4 w-32 animate-pulse rounded bg-white/5"></div>
				<div class="h-20 animate-pulse rounded-2xl bg-white/5"></div>
			</div>
		{/each}
	</div>
{:else if loadState === 'error'}
	<div role="alert" class="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-200">
		<p class="font-semibold">Não foi possível carregar o histórico.</p>
		{#if errorMessage}
			<p class="mt-1 text-red-200/80">{errorMessage}</p>
		{/if}
	</div>
{:else if sessions.length === 0}
	<!-- Estado vazio -->
	<section class="flex min-h-[60vh] flex-col items-center justify-center text-center">
		<div
			class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5"
			aria-hidden="true"
		>
			<svg
				class="h-10 w-10 text-gray-400"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<circle cx="12" cy="12" r="9" />
				<path d="M12 7v5l3 2" />
			</svg>
		</div>
		<h2 class="text-lg font-semibold text-gray-100">Nenhum treino registrado ainda</h2>
		<p class="mt-2 max-w-xs text-sm leading-relaxed text-gray-400">
			Quando você registrar uma série na tela de treino, ela aparecerá aqui.
		</p>
	</section>
{:else}
	<section class="space-y-8">
		<header>
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">Histórico</p>
			<h2 class="mt-1 text-xl font-semibold text-gray-100">Seus treinos</h2>
		</header>

		{#each sessions as session (session.dateKey)}
			<div class="space-y-3">
				<!-- Cabeçalho do dia -->
				<p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">{session.label}</p>

				<!-- Card de exercícios do dia -->
				<div class="rounded-2xl border border-white/5 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
					{#each session.exercises as entry (entry.exerciseName)}
						<div class="p-4 space-y-2">
							<!-- Nome + grupo muscular -->
							<div class="flex items-baseline justify-between gap-2">
								<span class="text-sm font-semibold text-gray-100 truncate">{entry.exerciseName}</span>
								<span class="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-medium text-gray-400">
									{entry.muscleGroup}
								</span>
							</div>

							<!-- Séries -->
							<div class="flex flex-wrap gap-2">
								{#each entry.sets as set (set.setNumber)}
									<div
										class="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs"
									>
										<span class="font-medium text-gray-400">{set.setNumber}.</span>
										<span class="font-semibold text-gray-100">{set.reps} reps</span>
										<span class="text-gray-500">·</span>
										<span class="font-semibold text-gray-100">{set.loadKg} kg</span>
										{#if set.rpe !== undefined}
											<span class="text-gray-500">·</span>
											<span class="text-gray-400">RPE {set.rpe}</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</section>
{/if}
