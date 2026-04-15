<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
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
	<div class="space-y-3 p-5" aria-busy="true" aria-live="polite">
		<div class="skeleton h-4 w-32 mb-4"></div>
		<div class="skeleton h-8 w-56 mb-6"></div>
		{#each [0, 1, 2] as _}
			<div class="card p-5 space-y-3">
				<div class="skeleton h-4 w-40"></div>
				<div class="skeleton h-16 rounded-xl"></div>
			</div>
		{/each}
	</div>

{:else if loadState === 'error'}
	<div class="px-5 pt-6 animate-slide-up">
		<div role="alert" class="rounded-2xl border border-gym-danger/20 bg-gym-danger/5 p-5 text-sm text-red-300">
			<p class="font-semibold">Não foi possível carregar este treino.</p>
			{#if errorMessage}<p class="mt-1 text-red-300/70">{errorMessage}</p>{/if}
		</div>
	</div>

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

		<!-- ── Header do treino ──────────────────────────────── -->
		<div class="px-5 pt-5 pb-4">
			<a
				href="/fichas"
				class="inline-flex items-center gap-1.5 text-[13px] font-medium text-gym-muted
					transition-colors active:text-gym-text"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M15 6l-6 6 6 6" />
				</svg>
				{routine.name}
			</a>

			<div class="mt-3 flex items-center gap-4">
				<!-- Badge colorida da letra -->
				<span
					class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl
						ring-1 text-[26px] font-black
						{colors.bg} {colors.ring} {colors.text}"
					aria-hidden="true"
				>
					{split.label}
				</span>

				<div class="min-w-0 flex-1">
					<h1 class="truncate text-[22px] font-black text-gym-text">
						{split.name ?? `Treino ${split.label}`}
					</h1>
					<div class="mt-1 flex items-center gap-2 flex-wrap">
						<span class="text-[13px] text-gym-muted">
							{split.exercises.length} exercícios
						</span>
						{#if totalSetsLogged > 0}
							<span class="text-gym-muted">·</span>
							<span class="text-[13px] font-bold text-gym-success">
								{totalSetsLogged}/{totalSetsTarget} séries
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Barra de progresso geral -->
			{#if totalSetsTarget > 0}
				<div class="mt-4 space-y-1.5">
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-gym-border">
						<div
							class="h-full rounded-full bg-gym-accent transition-all duration-500"
							style="width: {Math.min(100, (totalSetsLogged / totalSetsTarget) * 100)}%"
							role="progressbar"
							aria-label="Progresso do treino"
							aria-valuenow={totalSetsLogged}
							aria-valuemax={totalSetsTarget}
						></div>
					</div>
				</div>
			{/if}
		</div>

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
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
						{@const isDone = ui.logged.length >= se.targetSets}
						<div
							class="card overflow-hidden transition-all duration-200
								{isDone ? 'border-gym-success/30' : ui.logged.length > 0 ? 'border-gym-accent/30' : ''}"
						>
							<!-- Cabeçalho do exercício -->
							<button
								type="button"
								onclick={() => updateUI(se.id, { expanded: !ui.expanded })}
								class="flex w-full items-center gap-3 p-4 text-left"
								aria-expanded={ui.expanded}
							>
								<!-- Número de ordem -->
								<span
									class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl
										bg-gym-surface2 border border-gym-border
										text-[14px] font-black text-gym-muted"
									aria-hidden="true"
								>
									{se.orderIndex + 1}
								</span>

								<div class="min-w-0 flex-1">
									<p class="truncate text-[16px] font-bold text-gym-text">
										{ex?.name ?? `Exercício ${se.exerciseId.slice(0, 6)}…`}
									</p>
									<div class="mt-0.5 flex items-center gap-1.5 flex-wrap">
										{#if ex}
											<span class="muscle-badge">
												{MUSCLE_GROUP_LABELS[ex.muscleGroup] ?? ex.muscleGroup}
											</span>
										{/if}
										<span class="text-[12px] text-gym-muted">
											{se.targetSets}×{se.targetRepsMin === se.targetRepsMax
												? se.targetRepsMin
												: `${se.targetRepsMin}–${se.targetRepsMax}`}
											{#if se.restSeconds > 0}
												· {formatRestTime(se.restSeconds)}
											{/if}
										</span>
									</div>
								</div>

								<!-- Contador + chevron -->
								<div class="flex shrink-0 items-center gap-2">
									{#if ui.logged.length > 0}
										<span
											class="rounded-lg px-2.5 py-1 text-[12px] font-bold
												{isDone
													? 'bg-gym-success/15 text-gym-success'
													: 'bg-gym-accent/15 text-gym-accent'}"
										>
											{ui.logged.length}/{se.targetSets}
										</span>
									{/if}
									<svg
										class="h-5 w-5 text-gym-muted transition-transform duration-200
											{ui.expanded ? 'rotate-90' : ''}"
										viewBox="0 0 24 24" fill="none" stroke="currentColor"
										stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
										aria-hidden="true"
									>
										<path d="M9 6l6 6-6 6" />
									</svg>
								</div>
							</button>

							<!-- Corpo expansível -->
							{#if ui.expanded}
								<div class="border-t border-gym-border px-4 pb-4 pt-3 space-y-4 animate-slide-down">

									<!-- Séries logadas -->
									{#if ui.logged.length > 0}
										<div class="space-y-2">
											<p class="section-label">Séries registradas</p>
											<div class="space-y-1.5">
												{#each ui.logged as s (s.setNumber)}
													<div
														class="flex items-center gap-3 rounded-xl
															border border-gym-border bg-gym-surface2 px-3.5 py-2.5"
													>
														<span class="w-5 shrink-0 text-[13px] font-bold text-gym-muted">
															{s.setNumber}.
														</span>
														<span class="flex-1 text-[14px] font-semibold text-gym-text">
															{s.reps} reps · {s.loadKg} kg
														</span>
														{#if s.rpe !== undefined}
															<span
																class="rounded-lg px-2 py-0.5 text-[11px] font-semibold
																	{s.rpe >= 9
																		? 'bg-gym-amber/15 text-gym-amber'
																		: 'bg-gym-surface border border-gym-border text-gym-muted'}"
															>
																RPE {s.rpe}
															</span>
														{/if}
														<!-- Check verde -->
														<svg class="h-4 w-4 shrink-0 text-gym-success"
															viewBox="0 0 24 24" fill="none" stroke="currentColor"
															stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
															aria-hidden="true">
															<path d="M20 6L9 17l-5-5" />
														</svg>
													</div>
												{/each}
											</div>
										</div>
									{/if}

									<!-- Formulário da próxima série -->
									{#if !isDone}
										<div class="space-y-4 rounded-2xl border border-gym-border bg-gym-surface2 p-4">
											<p class="text-[13px] font-bold text-gym-muted">
												Série <span class="text-gym-text">{ui.logged.length + 1}</span>
												de {se.targetSets}
											</p>

											<!-- Reps + Carga -->
											<div class="grid grid-cols-2 gap-3">
												<!-- Reps -->
												<div class="space-y-2">
													<label
														for="reps-{se.id}"
														class="section-label block"
													>
														Reps
													</label>
													<div
														class="flex items-center overflow-hidden rounded-2xl
															border border-gym-border bg-gym-bg"
													>
														<button
															type="button"
															onclick={() => updateDraft(se.id, { reps: Math.max(1, ui.draft.reps - 1) })}
															class="flex h-10 w-10 shrink-0 items-center justify-center
																text-[20px] font-bold text-gym-muted
																transition-colors active:bg-gym-surface2"
															aria-label="Diminuir repetições"
														>
															−
														</button>
														<input
															id="reps-{se.id}"
															type="number"
															min="1"
															max="999"
															bind:value={ui.draft.reps}
															oninput={(e) => updateDraft(se.id, { reps: Number((e.target as HTMLInputElement).value) })}
															class="flex-1 min-w-0 bg-transparent text-center text-[18px] font-black
																text-gym-text outline-none tabular-nums"
															aria-label="Repetições"
														/>
														<button
															type="button"
															onclick={() => updateDraft(se.id, { reps: ui.draft.reps + 1 })}
															class="flex h-10 w-10 shrink-0 items-center justify-center
																text-[20px] font-bold text-gym-muted
																transition-colors active:bg-gym-surface2"
															aria-label="Aumentar repetições"
														>
															+
														</button>
													</div>
												</div>

												<!-- Carga (kg) -->
												<div class="space-y-2">
													<label
														for="load-{se.id}"
														class="section-label block"
													>
														Carga (kg)
													</label>
													<div
														class="flex items-center overflow-hidden rounded-2xl
															border border-gym-border bg-gym-bg"
													>
														<button
															type="button"
															onclick={() => updateDraft(se.id, { loadKg: Math.max(0, ui.draft.loadKg - 2.5) })}
															class="flex h-10 w-10 shrink-0 items-center justify-center
																text-[20px] font-bold text-gym-muted
																transition-colors active:bg-gym-surface2"
															aria-label="Diminuir carga"
														>
															−
														</button>
														<input
															id="load-{se.id}"
															type="number"
															min="0"
															step="2.5"
															bind:value={ui.draft.loadKg}
															oninput={(e) => updateDraft(se.id, { loadKg: Number((e.target as HTMLInputElement).value) })}
															class="flex-1 min-w-0 bg-transparent text-center text-[18px] font-black
																text-gym-text outline-none tabular-nums"
															aria-label="Carga em kg"
														/>
														<button
															type="button"
															onclick={() => updateDraft(se.id, { loadKg: ui.draft.loadKg + 2.5 })}
															class="flex h-10 w-10 shrink-0 items-center justify-center
																text-[20px] font-bold text-gym-muted
																transition-colors active:bg-gym-surface2"
															aria-label="Aumentar carga"
														>
															+
														</button>
													</div>
												</div>
											</div>

											<!-- RPE — chips compactos -->
											<div class="space-y-2">
												<p class="section-label">
													RPE <span class="font-normal normal-case text-gym-muted/50">(opcional)</span>
												</p>
												<div class="flex gap-1.5">
													{#each [6, 7, 8, 9, 10] as rpeVal (rpeVal)}
														<button
															type="button"
															onclick={() =>
																updateDraft(se.id, {
																	rpe: ui.draft.rpe === rpeVal ? undefined : rpeVal
																})}
															class="flex-1 rounded-xl border py-2 text-[13px] font-black
																transition-all active:scale-95
																{ui.draft.rpe === rpeVal
																	? rpeVal >= 9
																		? 'border-gym-amber bg-gym-amber/20 text-gym-amber'
																		: 'border-gym-accent bg-gym-accent/20 text-gym-accent'
																	: 'border-gym-border bg-gym-bg text-gym-muted active:bg-gym-surface'}"
															aria-pressed={ui.draft.rpe === rpeVal}
															aria-label="RPE {rpeVal}"
														>
															{rpeVal}
														</button>
													{/each}
												</div>
											</div>

											<!-- Botão confirmar série — grande, fat-finger friendly -->
											<button
												type="button"
												id="btn-log-set-{se.id}"
												onclick={() => logSet(se)}
												disabled={ui.saving}
												class="relative flex w-full items-center justify-center gap-2.5
													overflow-hidden rounded-2xl py-5 text-[17px] font-black
													transition-all duration-200 active:scale-[0.98]
													disabled:cursor-not-allowed disabled:opacity-45
													{ui.justLogged
														? 'bg-gym-success text-white shadow-lg shadow-gym-success/30'
														: 'bg-gym-accent text-white shadow-lg shadow-gym-accent/30'}"
												aria-label="Confirmar série {ui.logged.length + 1}"
											>
												{#if ui.justLogged}
													<svg class="h-6 w-6 animate-pop" viewBox="0 0 24 24" fill="none"
														stroke="currentColor" stroke-width="3" stroke-linecap="round"
														stroke-linejoin="round" aria-hidden="true">
														<path d="M20 6L9 17l-5-5" />
													</svg>
													Série registrada!
												{:else if ui.saving}
													<svg class="h-6 w-6 animate-spin" viewBox="0 0 24 24" fill="none"
														stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
														stroke-linejoin="round" aria-hidden="true">
														<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
													</svg>
													Salvando…
												{:else}
													<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none"
														stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
														stroke-linejoin="round" aria-hidden="true">
														<path d="M20 6L9 17l-5-5" />
													</svg>
													Concluir série {ui.logged.length + 1}
												{/if}
											</button>
										</div>

									{:else}
										<!-- Todas as séries concluídas -->
										<div
											class="flex items-center gap-3 rounded-2xl border border-gym-success/25
												bg-gym-success/10 px-4 py-4 animate-fade-in"
											role="status"
										>
											<div class="flex h-9 w-9 shrink-0 items-center justify-center
												rounded-xl bg-gym-success/20">
												<svg class="h-5 w-5 text-gym-success" viewBox="0 0 24 24" fill="none"
													stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
													stroke-linejoin="round" aria-hidden="true">
													<path d="M20 6L9 17l-5-5" />
												</svg>
											</div>
											<p class="text-[15px] font-bold text-gym-success">
												{se.targetSets} séries concluídas!
											</p>
										</div>
									{/if}
								</div>
							{/if}
						</div>
					{/if}
				{/each}

				<!-- Treino completo banner -->
				{#if allDone}
					<div
						class="card border-gym-success/30 bg-gym-success/5 p-5 text-center
							animate-slide-up"
					>
						<div class="mb-2 flex justify-center">
							<div class="flex h-14 w-14 items-center justify-center rounded-full
								bg-gym-success/20">
								<svg class="h-8 w-8 text-gym-success" viewBox="0 0 24 24" fill="none"
									stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
									stroke-linejoin="round" aria-hidden="true">
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
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M12 5v14M5 12h14" />
						</svg>
						Adicionar exercício
					</a>
				</div>
			</div>
		{/if}
	</div>
{/if}