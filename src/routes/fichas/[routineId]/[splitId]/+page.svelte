<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
	import PageLoadingSkeleton from '$ui/components/shared/PageLoadingSkeleton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import WorkoutHeader from '$ui/components/treino/WorkoutHeader.svelte';
	import ExerciseCard from '$ui/components/treino/ExerciseCard.svelte';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split, SplitExercise } from '$core/domain/entities/Split';
	import type { Exercise } from '$core/domain/entities/Exercise';

	type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

	// ── Tipos locais ────────────────────────────────────────────
	interface SetDraft {
		reps: number;
		loadKg: number;
		rpe: number | undefined;
	}

	interface ExerciseUIState {
		logged: Array<{ setNumber: number; reps: number; loadKg: number; rpe?: number }>;
		draft: SetDraft;
		justLogged: boolean;
		expanded: boolean;
		saving: boolean;
	}

	const MUSCLE_GROUP_LABELS: Record<string, string> = {
		chest: 'Peito', back: 'Costas', shoulders: 'Ombros',
		biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraços',
		quads: 'Quadríceps', hamstrings: 'Isquiotibiais', glutes: 'Glúteos',
		calves: 'Panturrilhas', abs: 'Abdômen', other: 'Outro'
	};

	const SPLIT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
		A: { bg: 'bg-blue-500/15',   text: 'text-blue-400',   ring: 'ring-blue-500/30'   },
		B: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
		C: { bg: 'bg-violet-500/15',  text: 'text-violet-400',  ring: 'ring-violet-500/30'  },
		D: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   ring: 'ring-amber-500/30'   },
		E: { bg: 'bg-rose-500/15',    text: 'text-rose-400',    ring: 'ring-rose-500/30'    },
	};

	function splitColor(label: string) {
		return SPLIT_COLORS[label] ?? { bg: 'bg-gym-accent/15', text: 'text-gym-accent', ring: 'ring-gym-accent/30' };
	}

	// ── Estado ──────────────────────────────────────────────────
	let loadState = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let split = $state<Split | null>(null);
	let errorMessage = $state<string | null>(null);
	let exerciseMap = $state<Map<string, Exercise>>(new Map());
	let uiState = $state<Map<string, ExerciseUIState>>(new Map());

	let orderedExercises = $derived(
		split ? [...split.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : []
	);

	let totalSetsLogged = $derived(
		[...uiState.values()].reduce((acc, ui) => acc + ui.logged.length, 0)
	);

	let totalSetsTarget = $derived(
		orderedExercises.reduce((acc, se) => acc + se.targetSets, 0)
	);

	let allDone = $derived(
		orderedExercises.length > 0 &&
		orderedExercises.every((se) => {
			const ui = uiState.get(se.id);
			return ui && ui.logged.length >= se.targetSets;
		})
	);

	// ── Timer de descanso ───────────────────────────────────────
	let restTimerId: ReturnType<typeof setInterval> | null = null;

	function startRestTimer(seconds: number) {
		if (typeof BroadcastChannel === 'undefined') return;
		if (restTimerId !== null) clearInterval(restTimerId);

		const bc = new BroadcastChannel('moralgym_rest_timer');
		let remaining = seconds;

		bc.postMessage({ type: 'REST_TICK', remaining, total: seconds });

		restTimerId = setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) {
				bc.postMessage({ type: 'REST_DONE' });
				clearInterval(restTimerId!);
				restTimerId = null;
				bc.close();
			} else {
				bc.postMessage({ type: 'REST_TICK', remaining, total: seconds });
			}
		}, 1_000);
	}

	// ── Helpers de UI ───────────────────────────────────────────
	function getUI(seId: string): ExerciseUIState {
		return uiState.get(seId)!;
	}

	function updateUI(seId: string, patch: Partial<ExerciseUIState>) {
		const current = uiState.get(seId)!;
		uiState.set(seId, { ...current, ...patch });
		uiState = new Map(uiState);
	}

	function updateDraft(seId: string, patch: Partial<SetDraft>) {
		const current = uiState.get(seId)!;
		uiState.set(seId, { ...current, draft: { ...current.draft, ...patch } });
		uiState = new Map(uiState);
	}

	// ── Logar série ─────────────────────────────────────────────
	async function logSet(se: SplitExercise) {
		const ui = getUI(se.id);
		if (ui.saving) return;

		updateUI(se.id, { saving: true });

		try {
			const { logSet: logSetUC } = getContainer();
			const setNumber = ui.logged.length + 1;

			await logSetUC.execute({
				exerciseId: se.exerciseId,
				setNumber,
				reps: ui.draft.reps,
				loadKg: ui.draft.loadKg,
				rpe: ui.draft.rpe,
				performedAt: new Date()
			});

			const newLogged = [
				...ui.logged,
				{ setNumber, reps: ui.draft.reps, loadKg: ui.draft.loadKg, rpe: ui.draft.rpe }
			];

			updateUI(se.id, {
				logged: newLogged,
				saving: false,
				justLogged: true
			});

			if (se.restSeconds > 0) {
				startRestTimer(se.restSeconds);
			}

			setTimeout(() => updateUI(se.id, { justLogged: false }), 1_400);
		} catch (err) {
			console.error('[treino/logSet] Falha ao logar série', err);
			updateUI(se.id, { saving: false });
		}
	}

	// ── Mount ────────────────────────────────────────────────────
	onMount(() => {
		const { routineId, splitId } = $page.params;
		(async () => {
			try {
				const { routines, exercises } = getContainer();
				const foundRoutine = await routines.findById(routineId);
				if (!foundRoutine) { loadState = 'not-found'; return; }

				const allSplits = await routines.findSplits(foundRoutine.id);
				const foundSplit = allSplits.find((s: Split) => s.id === splitId) ?? null;
				if (!foundSplit) { loadState = 'not-found'; return; }

				const map = new Map<string, Exercise>();
				await Promise.all(
					foundSplit.exercises.map(async (se: SplitExercise) => {
						const ex = await exercises.findById(se.exerciseId);
						if (ex) map.set(se.exerciseId, ex);
					})
				);

				const initialUI = new Map<string, ExerciseUIState>();
				for (const se of foundSplit.exercises) {
					initialUI.set(se.id, {
						logged: [],
						draft: { reps: se.targetRepsMin, loadKg: 0, rpe: undefined },
						justLogged: false,
						expanded: true,
						saving: false
					});
				}

				routine = foundRoutine;
				split = foundSplit;
				exerciseMap = map;
				uiState = initialUI;
				loadState = 'ready';
			} catch (err) {
				console.error('[treino/split] Falha ao carregar', err);
				errorMessage = err instanceof Error ? err.message : 'Erro desconhecido.';
				loadState = 'error';
			}
		})();

		return () => {
			if (restTimerId !== null) clearInterval(restTimerId);
		};
	});

	function formatRestTime(seconds: number): string {
		if (seconds < 60) return `${seconds}s`;
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return s === 0 ? `${m}min` : `${m}min ${s}s`;
	}
</script>

<svelte:head>
	<title>{split?.name ?? `Treino ${split?.label ?? ''}`.trim()} · MoralGym</title>
</svelte:head>

<!-- ══════════════════════════════════════════════════════════════ -->
{#if loadState === 'loading'}
	<PageLoadingSkeleton rows={3} />

{:else if loadState === 'error'}
	<ErrorAlert message="Não foi possível carregar este treino." detail={errorMessage} />

{:else if loadState === 'not-found' || !routine || !split}
	<section class="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center animate-fade-in">
		<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gym-surface border border-gym-border" aria-hidden="true">
			<svg class="h-10 w-10 text-gym-muted" viewBox="0 0 24 24" fill="none"
				stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
				<circle cx="12" cy="12" r="9" />
				<path d="M9 9l6 6M15 9l-6 6" />
			</svg>
		</div>
		<h2 class="text-[20px] font-bold text-gym-text">Treino não encontrado</h2>
		<p class="mt-2 text-[14px] text-gym-muted">O link pode estar incorreto ou o treino foi removido.</p>
		<a href="/fichas" class="mt-6 btn-ghost">
			Voltar para Fichas
		</a>
	</section>

{:else}
	{@const colors = splitColor(split.label)}
	<div class="animate-fade-in">

		<WorkoutHeader
			{routine}
			{split}
			{totalSetsLogged}
			{totalSetsTarget}
			{colors}
		/>

		<!-- Divider -->
		<div class="h-px bg-gym-border mx-5"></div>

		<!-- ── Exercícios ────────────────────────────────────── -->
		{#if orderedExercises.length === 0}
			<div class="px-5 py-12 text-center">
				<p class="text-[15px] text-gym-muted">Nenhum exercício neste treino ainda.</p>
				<a
					href="/fichas/{routine.id}/{split.id}/exercicios/novo"
					class="mt-5 inline-flex items-center gap-2 rounded-2xl bg-gym-accent
						px-6 py-3.5 text-[15px] font-bold text-white
						transition-all active:scale-95 shadow-lg shadow-gym-accent/25"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M12 5v14M5 12h14" />
					</svg>
					Adicionar exercício
				</a>
			</div>
		{:else}
			<div class="px-4 pt-3 space-y-3">
				{#each orderedExercises as se (se.id)}
					{@const ex = exerciseMap.get(se.exerciseId)}
					{@const ui = uiState.get(se.id)}
					{#if ui}
						<ExerciseCard
							{se}
							ex={ex}
							{ui}
							muscleGroupLabels={MUSCLE_GROUP_LABELS}
							onUpdateUI={(patch) => updateUI(se.id, patch)}
							onUpdateDraft={(patch) => updateDraft(se.id, patch)}
							onLogSet={() => logSet(se)}
							{formatRestTime}
						/>
					{/if}
				{/each}

				<!-- Treino completo banner -->
				{#if allDone}
					<div
						class="card border-gym-success/30 bg-gym-success/5 p-5 text-center
							animate-slide-up"
					>
						<div class="mb-2 flex justify-center">
							<div class="flex h-14 w-14 items-center justify-center rounded-full bg-gym-success/20">
								<svg
									class="h-8 w-8 text-gym-success"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2.5"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M20 6L9 17l-5-5" />
								</svg>
							</div>
						</div>
						<p class="text-[18px] font-black text-gym-success">Treino concluído!</p>
						<p class="mt-1 text-[14px] text-gym-muted">
							{totalSetsLogged} séries registradas. Bom trabalho! 💪
						</p>
					</div>
				{/if}

				<!-- Rodapé: adicionar exercício -->
				<div class="pb-4">
					<a
						href="/fichas/{routine.id}/{split.id}/exercicios/novo"
						id="btn-adicionar-exercicio"
						class="btn-ghost w-full"
					>
						<svg
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M12 5v14M5 12h14" />
						</svg>
						Adicionar exercício
					</a>
				</div>
			</div>
		{/if}
	</div>
{/if}