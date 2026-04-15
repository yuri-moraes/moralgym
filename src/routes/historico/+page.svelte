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
		dateKey: string;
		label: string;
		exercises: ExerciseEntry[];
		totalSets: number;
	}

	const MUSCLE_GROUP_LABELS: Record<string, string> = {
		chest: 'Peito', back: 'Costas', shoulders: 'Ombros',
		biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraços',
		quads: 'Quadríceps', hamstrings: 'Isquiotibiais', glutes: 'Glúteos',
		calves: 'Panturrilhas', abs: 'Abdômen', other: 'Outro'
	};

	// Cor do badge por grupo muscular
	const MUSCLE_COLORS: Record<string, string> = {
		chest:      'bg-blue-500/15 text-blue-400',
		back:       'bg-emerald-500/15 text-emerald-400',
		shoulders:  'bg-violet-500/15 text-violet-400',
		biceps:     'bg-amber-500/15 text-amber-400',
		triceps:    'bg-rose-500/15 text-rose-400',
		forearms:   'bg-orange-500/15 text-orange-400',
		quads:      'bg-cyan-500/15 text-cyan-400',
		hamstrings: 'bg-teal-500/15 text-teal-400',
		glutes:     'bg-pink-500/15 text-pink-400',
		calves:     'bg-indigo-500/15 text-indigo-400',
		abs:        'bg-lime-500/15 text-lime-400',
		other:      'bg-gym-surface text-gym-muted',
	};

	let loadState = $state<LoadState>('loading');
	let sessions = $state<DaySession[]>([]);
	let totalSetsAll = $derived(sessions.reduce((a, s) => a + s.totalSets, 0));
	let errorMessage = $state<string | null>(null);

	function toDayKey(date: Date): string {
		return date.toLocaleDateString('sv');
	}

	function dayLabel(dateKey: string): string {
		const today = toDayKey(new Date());
		const yesterday = toDayKey(new Date(Date.now() - 86_400_000));
		if (dateKey === today) return 'Hoje';
		if (dateKey === yesterday) return 'Ontem';
		const [year, month, day] = dateKey.split('-').map(Number);
		return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
			weekday: 'short',
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

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

				const uniqueExerciseIds = [...new Set<string>(logs.map((l) => l.exerciseId))];
				const exerciseMap = new Map<string, Exercise>();
				await Promise.all(
					uniqueExerciseIds.map(async (id) => {
						const ex = await exercises.findById(id);
						if (ex) exerciseMap.set(id, ex);
					})
				);

				const dayMap = new Map<string, Map<string, SetRow[]>>();

				for (const log of logs) {
					const dayKey = toDayKey(log.performedAt);
					if (!dayMap.has(dayKey)) dayMap.set(dayKey, new Map());
					const exerciseMap2 = dayMap.get(dayKey)!;
					if (!exerciseMap2.has(log.exerciseId)) exerciseMap2.set(log.exerciseId, []);
					exerciseMap2.get(log.exerciseId)!.push({
						setNumber: log.setNumber,
						reps: log.reps,
						loadKg: log.loadKg,
						rpe: log.rpe
					});
				}

				const result: DaySession[] = [];
				for (const [dateKey, exerciseEntries] of dayMap.entries()) {
					const exerciseList: ExerciseEntry[] = [];
					let totalSets = 0;
					for (const [exerciseId, sets] of exerciseEntries.entries()) {
						const ex = exerciseMap.get(exerciseId);
						exerciseList.push({
							exerciseName: ex?.name ?? `Exercício ${exerciseId.slice(0, 8)}…`,
							muscleGroup: ex?.muscleGroup ?? 'other',
							sets: sets.sort((a, b) => a.setNumber - b.setNumber)
						});
						totalSets += sets.length;
					}
					result.push({ dateKey, label: dayLabel(dateKey), exercises: exerciseList, totalSets });
				}

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
	<div class="space-y-6 p-5" aria-busy="true" aria-live="polite">
		<div class="skeleton h-4 w-24"></div>
		<div class="skeleton h-8 w-48"></div>
		{#each [0, 1, 2] as _}
			<div class="space-y-3">
				<div class="skeleton h-3.5 w-32"></div>
				<div class="card p-4 space-y-3">
					<div class="skeleton h-4 w-40"></div>
					<div class="skeleton h-3 w-24"></div>
					<div class="flex gap-2">
						<div class="skeleton h-8 w-24 rounded-xl"></div>
						<div class="skeleton h-8 w-24 rounded-xl"></div>
					</div>
				</div>
			</div>
		{/each}
	</div>

{:else if loadState === 'error'}
	<div class="px-5 pt-6 animate-slide-up">
		<div role="alert" class="rounded-2xl border border-gym-danger/20 bg-gym-danger/5 p-5 text-sm text-red-300">
			<p class="font-semibold">Não foi possível carregar o histórico.</p>
			{#if errorMessage}<p class="mt-1 text-red-300/70">{errorMessage}</p>{/if}
		</div>
	</div>

{:else if sessions.length === 0}
	<!-- Estado vazio -->
	<section class="flex min-h-[75vh] flex-col items-center justify-center px-8 text-center animate-fade-in">
		<div class="relative mb-8" aria-hidden="true">
			<div class="absolute inset-0 rounded-full bg-gym-accent/10 blur-xl scale-125"></div>
			<div class="relative flex h-28 w-28 items-center justify-center rounded-full
				bg-gradient-to-br from-gym-accent/20 to-gym-accent-2/10
				border border-gym-accent/20">
				<svg class="h-14 w-14 text-gym-accent" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
					<circle cx="12" cy="12" r="9" />
					<path d="M12 7v5l3 2" />
				</svg>
			</div>
		</div>

		<h1 class="text-[24px] font-black text-gym-text">Nenhum treino ainda</h1>
		<p class="mt-3 max-w-xs text-[15px] leading-relaxed text-gym-muted">
			Quando você registrar uma série na tela de treino, ela aparecerá aqui.
		</p>

		<a
			href="/fichas"
			class="mt-8 inline-flex items-center gap-2.5 rounded-2xl bg-gym-accent
				px-8 py-4 text-[16px] font-bold text-white
				transition-all active:scale-[0.97] shadow-lg shadow-gym-accent/25"
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M6.5 6.5v11" />
				<path d="M17.5 6.5v11" />
				<path d="M3 9.5v5" />
				<path d="M21 9.5v5" />
				<path d="M6.5 12h11" />
			</svg>
			Ir para Fichas
		</a>
	</section>

{:else}
	<div class="animate-fade-in">
		<!-- ── Header ─────────────────────────────────────────── -->
		<div class="px-5 pt-5 pb-4">
			<p class="section-label mb-1">Histórico</p>
			<h1 class="text-[24px] font-black text-gym-text">Seus treinos</h1>
			<p class="mt-1 text-[13px] text-gym-muted">
				{totalSetsAll} {totalSetsAll === 1 ? 'série registrada' : 'séries registradas'}
			</p>
		</div>

		<!-- ── Feed por dia ──────────────────────────────────── -->
		<div class="space-y-6 px-4 pb-4">
			{#each sessions as session (session.dateKey)}
				<div class="space-y-2 animate-slide-up">
					<!-- Cabeçalho do dia -->
					<div class="flex items-center gap-3">
						<span
							class="rounded-xl px-3 py-1.5 text-[12px] font-black uppercase tracking-wide
								{session.label === 'Hoje'
									? 'bg-gym-accent/15 text-gym-accent'
									: session.label === 'Ontem'
										? 'bg-gym-surface2 border border-gym-border text-gym-muted'
										: 'bg-gym-surface border border-gym-border text-gym-muted/70'}"
						>
							{session.label}
						</span>
						<span class="text-[12px] text-gym-muted">
							{session.totalSets} {session.totalSets === 1 ? 'série' : 'séries'}
						</span>
					</div>

					<!-- Card de exercícios do dia -->
					<div class="card divide-y divide-gym-border overflow-hidden">
						{#each session.exercises as entry (entry.exerciseName)}
							<div class="p-4 space-y-3">
								<!-- Nome + badge muscular -->
								<div class="flex items-start justify-between gap-2">
									<span class="text-[15px] font-bold text-gym-text leading-snug">
										{entry.exerciseName}
									</span>
									<span
										class="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold
											whitespace-nowrap
											{MUSCLE_COLORS[entry.muscleGroup] ?? 'bg-gym-surface text-gym-muted'}"
									>
										{MUSCLE_GROUP_LABELS[entry.muscleGroup] ?? entry.muscleGroup}
									</span>
								</div>

								<!-- Chips de séries -->
								<div class="flex flex-wrap gap-2">
									{#each entry.sets as set (set.setNumber)}
										<div
											class="flex items-center gap-1.5 rounded-xl border border-gym-border
												bg-gym-surface2 px-3 py-2"
										>
											<span class="text-[12px] font-bold text-gym-muted">
												{set.setNumber}.
											</span>
											<span class="text-[13px] font-bold text-gym-text">
												{set.reps} reps
											</span>
											<span class="text-gym-muted text-[12px]">·</span>
											<span class="text-[13px] font-bold text-gym-text">
												{set.loadKg} kg
											</span>
											{#if set.rpe !== undefined}
												<span class="text-gym-muted text-[12px]">·</span>
												<span
													class="text-[12px] font-bold
														{set.rpe >= 9 ? 'text-gym-amber' : 'text-gym-muted'}"
												>
													{set.rpe}
												</span>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{/if}
