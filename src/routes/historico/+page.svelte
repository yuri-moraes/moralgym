<script lang="ts">
	import { onMount } from 'svelte';
	import { getContainer } from '$lib/container';
	import PageLoadingSkeleton from '$ui/components/shared/PageLoadingSkeleton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import EmptyState from '$ui/components/shared/EmptyState.svelte';
	import DaySessionCard from '$ui/components/historico/DaySessionCard.svelte';
	import type { Exercise } from '$core/domain/entities/Exercise';

	type LoadState = 'loading' | 'ready' | 'error';

	interface SetRow {
		setNumber: number;
		reps: number;
		loadKg: number;
		rpe?: number;
	}

	interface ExerciseEntry {
		exerciseId: string;
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
							exerciseId,
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
	<PageLoadingSkeleton rows={3} />

{:else if loadState === 'error'}
	<ErrorAlert message="Não foi possível carregar o histórico." detail={errorMessage} />

{:else if sessions.length === 0}
	<EmptyState
		title="Nenhum treino ainda"
		description="Quando você registrar uma série na tela de treino, ela aparecerá aqui."
		ctaHref="/fichas"
		ctaLabel="Ir para Fichas"
	>
		<svg
			class="h-14 w-14 text-gym-accent"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			slot="icon"
		>
			<circle cx="12" cy="12" r="9" />
			<path d="M12 7v5l3 2" />
		</svg>
	</EmptyState>

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
				<DaySessionCard
					{session}
					muscleColors={MUSCLE_COLORS}
					muscleGroupLabels={MUSCLE_GROUP_LABELS}
				/>
			{/each}
		</div>
	</div>
{/if}
