<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split, SplitExercise } from '$core/domain/entities/Split';
	import type { Exercise } from '$core/domain/entities/Exercise';

	type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

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

	let state = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let split = $state<Split | null>(null);
	let errorMessage = $state<string | null>(null);
	/** Mapa exerciseId → Exercise para resolver nomes na template. */
	let exerciseMap = $state<Map<string, Exercise>>(new Map());

	/** Exercícios do split ordenados por orderIndex. */
	let orderedExercises = $derived(
		split ? [...split.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : []
	);

	function formatRestTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return s === 0 ? `${m}min` : `${m}min ${s}s`;
	}

	onMount(() => {
		// Capturamos os params uma única vez no mount — navegar para outro
		// [routineId]/[splitId] remonta o componente pelo router do SvelteKit.
		const { routineId, splitId } = $page.params;
		(async () => {
			try {
				const { routines, exercises } = getContainer();
				const foundRoutine = await routines.findById(routineId);
				if (!foundRoutine) {
					state = 'not-found';
					return;
				}
				const allSplits = await routines.findSplits(foundRoutine.id);
				const foundSplit = allSplits.find((s: Split) => s.id === splitId) ?? null;
				if (!foundSplit) {
					state = 'not-found';
					return;
				}

				// Resolver exercícios em paralelo para exibir nome e grupo muscular.
				const map = new Map<string, Exercise>();
				await Promise.all(
					foundSplit.exercises.map(async (se: SplitExercise) => {
						const ex = await exercises.findById(se.exerciseId);
						if (ex) map.set(se.exerciseId, ex);
					})
				);

				routine = foundRoutine;
				split = foundSplit;
				exerciseMap = map;
				state = 'ready';
			} catch (err) {
				console.error('[fichas/split] Falha ao carregar split', err);
				errorMessage =
					err instanceof Error ? err.message : 'Erro desconhecido ao carregar.';
				state = 'error';
			}
		})();
	});
</script>

<svelte:head>
	<title
		>{split?.name ?? `Split ${split?.label ?? ''}`.trim()} · MoralGym</title
	>
</svelte:head>

{#if state === 'loading'}
	<div class="space-y-4" aria-busy="true" aria-live="polite">
		<div class="h-5 w-24 animate-pulse rounded bg-white/5"></div>
		<div class="h-7 w-2/3 animate-pulse rounded bg-white/5"></div>
		<div class="h-20 animate-pulse rounded-2xl bg-white/5"></div>
		<div class="h-20 animate-pulse rounded-2xl bg-white/5"></div>
	</div>
{:else if state === 'error'}
	<div
		role="alert"
		class="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-200"
	>
		<p class="font-semibold">Não foi possível carregar este treino.</p>
		{#if errorMessage}
			<p class="mt-1 text-red-200/80">{errorMessage}</p>
		{/if}
	</div>
{:else if state === 'not-found' || !routine || !split}
	<section class="flex min-h-[60vh] flex-col items-center justify-center text-center">
		<h2 class="text-lg font-semibold text-gray-100">Treino não encontrado</h2>
		<p class="mt-2 max-w-xs text-sm text-gray-400">
			Esse split pode ter sido removido ou o link está incorreto.
		</p>
		<a
			href="/fichas"
			class="mt-6 inline-flex items-center justify-center rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10"
		>
			Voltar para Fichas
		</a>
	</section>
{:else}
	<section class="space-y-6">
		<header>
			<a
				href="/fichas"
				class="inline-flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.75"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M15 6l-6 6 6 6" />
				</svg>
				{routine.name}
			</a>
			<div class="mt-3 flex items-center gap-3">
				<span
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/5 text-base font-bold text-gray-100"
					aria-hidden="true"
				>
					{split.label}
				</span>
				<div class="min-w-0 flex-1">
					<h2 class="truncate text-xl font-semibold text-gray-100">
						{split.name ?? `Treino ${split.label}`}
					</h2>
					<p class="mt-0.5 text-xs text-gray-500">
						{split.exercises.length}
						{split.exercises.length === 1 ? 'exercício' : 'exercícios'}
					</p>
				</div>
			</div>
		</header>

		{#if orderedExercises.length === 0}
			<div
				class="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center"
			>
				<p class="text-sm text-gray-400">Nenhum exercício por aqui ainda. Que tal começar?</p>
			</div>
		{:else}
			<ul class="space-y-3">
				{#each orderedExercises as se (se.id)}
					{@const ex = exerciseMap.get(se.exerciseId)}
					<li class="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
						<!-- Cabeçalho do exercício -->
						<div class="flex items-start justify-between gap-2">
							<div class="min-w-0 flex-1">
								<p class="font-semibold text-sm text-gray-100 truncate">
									{ex?.name ?? `Exercício ${se.exerciseId.slice(0, 8)}…`}
								</p>
								{#if ex}
									<p class="mt-0.5 text-xs text-gray-500">
										{MUSCLE_GROUP_LABELS[ex.muscleGroup] ?? ex.muscleGroup}
									</p>
								{/if}
							</div>
							<!-- Badge de ordem -->
							<span
								class="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-gray-400"
								aria-hidden="true"
							>
								{se.orderIndex + 1}
							</span>
						</div>

						<!-- Metas da série -->
						<div class="flex flex-wrap gap-2">
							<span class="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs">
								<span class="text-gray-500">Séries</span>
								<span class="font-semibold text-gray-100">{se.targetSets}</span>
							</span>
							<span class="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs">
								<span class="text-gray-500">Reps</span>
								<span class="font-semibold text-gray-100">
									{se.targetRepsMin === se.targetRepsMax
										? se.targetRepsMin
										: `${se.targetRepsMin}–${se.targetRepsMax}`}
								</span>
							</span>
							{#if se.restSeconds > 0}
								<span class="inline-flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs">
									<span class="text-gray-500">Descanso</span>
									<span class="font-semibold text-gray-100">{formatRestTime(se.restSeconds)}</span>
								</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		<a
			href={`/fichas/${routine.id}/${split.id}/exercicios/novo`}
			class="inline-flex w-full items-center justify-center rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-[#0B0B0D] transition-colors active:bg-gray-300"
		>
			Adicionar exercício
		</a>
	</section>
{/if}
