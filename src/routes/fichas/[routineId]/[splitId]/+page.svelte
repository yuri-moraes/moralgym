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
		/** Séries já logadas nesta sessão */
		logged: Array<{ setNumber: number; reps: number; loadKg: number; rpe?: number }>;
		/** Rascunho da próxima série */
		draft: SetDraft;
		/** Feedback visual ao logar */
		justLogged: boolean;
		/** Expandido/colapsado */
		expanded: boolean;
		/** Salvando */
		saving: boolean;
	}

	const MUSCLE_GROUP_LABELS: Record<string, string> = {
		chest: 'Peito', back: 'Costas', shoulders: 'Ombros',
		biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraços',
		quads: 'Quadríceps', hamstrings: 'Isquiotibiais', glutes: 'Glúteos',
		calves: 'Panturrilhas', abs: 'Abdômen', other: 'Outro'
	};

	// ── Estado de carregamento ──────────────────────────────────
	let loadState = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let split = $state<Split | null>(null);
	let errorMessage = $state<string | null>(null);
	let exerciseMap = $state<Map<string, Exercise>>(new Map());

	// Mapa de estado de UI por splitExercise.id
	let uiState = $state<Map<string, ExerciseUIState>>(new Map());

	let orderedExercises = $derived(
		split ? [...split.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : []
	);

	// ── Cronômetro de descanso (BroadcastChannel) ───────────────
	let restTimerId: ReturnType<typeof setInterval> | null = null;

	function startRestTimer(seconds: number) {
		if (typeof BroadcastChannel === 'undefined') return;
		// Limpar timer anterior
		if (restTimerId !== null) clearInterval(restTimerId);

		const bc = new BroadcastChannel('moralgym_rest_timer');
		let remaining = seconds;

		// Dispara imediatamente
		bc.postMessage({ type: 'REST_TICK', remaining });

		restTimerId = setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) {
				bc.postMessage({ type: 'REST_DONE' });
				clearInterval(restTimerId!);
				restTimerId = null;
				bc.close();
			} else {
				bc.postMessage({ type: 'REST_TICK', remaining });
			}
		}, 1_000);
	}

	// ── Helpers de UI state ─────────────────────────────────────
	function getUI(seId: string): ExerciseUIState {
		return uiState.get(seId)!;
	}

	function updateUI(seId: string, patch: Partial<ExerciseUIState>) {
		const current = uiState.get(seId)!;
		uiState.set(seId, { ...current, ...patch });
		uiState = new Map(uiState); // trigger reactivity
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

			// Iniciar cronômetro de descanso
			if (se.restSeconds > 0) {
				startRestTimer(se.restSeconds);
			}

			// Remover feedback visual após 1.2s
			setTimeout(() => updateUI(se.id, { justLogged: false }), 1_200);
		} catch (err) {
			console.error('[treino/logSet] Falha ao logar série', err);
			updateUI(se.id, { saving: false });
		}
	}

	// ── Mount ───────────────────────────────────────────────────
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

				// Resolver exercícios em paralelo
				const map = new Map<string, Exercise>();
				await Promise.all(
					foundSplit.exercises.map(async (se: SplitExercise) => {
						const ex = await exercises.findById(se.exerciseId);
						if (ex) map.set(se.exerciseId, ex);
					})
				);

				// Inicializar UI state por exercício
				const initialUI = new Map<string, ExerciseUIState>();
				for (const se of foundSplit.exercises) {
					initialUI.set(se.id, {
						logged: [],
						draft: {
							reps: se.targetRepsMin,
							loadKg: 0,
							rpe: undefined
						},
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

	// Contagem de séries concluídas do treino todo
	let totalSetsLogged = $derived(
		[...uiState.values()].reduce((acc, ui) => acc + ui.logged.length, 0)
	);
</script>

<svelte:head>
	<title>{split?.name ?? `Treino ${split?.label ?? ''}`.trim()} · MoralGym</title>
</svelte:head>

<!-- ══════════════════════════════════════════════════════════════ -->
{#if loadState === 'loading'}
	<div class="divide-y divide-[#2F3336]" aria-busy="true" aria-live="polite">
		<div class="px-4 py-4">
			<div class="h-3.5 w-16 animate-pulse rounded-full bg-[#2F3336]"></div>
			<div class="mt-2 h-6 w-40 animate-pulse rounded-full bg-[#2F3336]"></div>
		</div>
		{#each [0, 1, 2] as _}
			<div class="px-4 py-5 space-y-3">
				<div class="h-4 w-36 animate-pulse rounded-full bg-[#2F3336]"></div>
				<div class="h-14 animate-pulse rounded-2xl bg-[#2F3336]"></div>
			</div>
		{/each}
	</div>

{:else if loadState === 'error'}
	<div class="px-4 pt-6">
		<div role="alert" class="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300">
			<p class="font-semibold">Não foi possível carregar este treino.</p>
			{#if errorMessage}<p class="mt-1 text-red-300/70">{errorMessage}</p>{/if}
		</div>
	</div>

{:else if loadState === 'not-found' || !routine || !split}
	<section class="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
		<h2 class="text-[20px] font-bold text-[#E7E9EA]">Treino não encontrado</h2>
		<p class="mt-2 text-[14px] text-[#71767B]">O link pode estar incorreto ou o treino foi removido.</p>
		<a href="/fichas" class="mt-6 rounded-full border border-[#2F3336] px-6 py-3 text-[14px] font-bold text-[#E7E9EA] active:bg-[#15161A]">
			Voltar para Fichas
		</a>
	</section>

{:else}
	<div class="divide-y divide-[#2F3336]">

		<!-- ── Header do treino ──────────────────────────────── -->
		<div class="px-4 py-4">
			<a
				href="/fichas"
				class="inline-flex items-center gap-1 text-[13px] font-medium text-[#71767B]
					transition-colors active:text-[#E7E9EA]"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M15 6l-6 6 6 6" />
				</svg>
				{routine.name}
			</a>

			<div class="mt-2 flex items-center gap-3">
				<span
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
						border border-[#2F3336] bg-[#15161A] text-[18px] font-black text-[#E7E9EA]"
					aria-hidden="true"
				>
					{split.label}
				</span>
				<div class="min-w-0 flex-1">
					<h2 class="truncate text-[20px] font-bold text-[#E7E9EA]">
						{split.name ?? `Treino ${split.label}`}
					</h2>
					<p class="text-[13px] text-[#71767B]">
						{split.exercises.length} exercícios
						{#if totalSetsLogged > 0}
							· <span class="text-[#E7E9EA] font-semibold">{totalSetsLogged} séries</span> registradas
						{/if}
					</p>
				</div>
			</div>
		</div>

		<!-- ── Exercícios ────────────────────────────────────── -->
		{#if orderedExercises.length === 0}
			<div class="px-4 py-10 text-center">
				<p class="text-[14px] text-[#71767B]">Nenhum exercício neste treino ainda.</p>
				<a
					href="/fichas/{routine.id}/{split.id}/exercicios/novo"
					class="mt-4 inline-flex items-center gap-2 rounded-full bg-[#E7E9EA] px-6 py-3
						text-[14px] font-bold text-[#0B0B0D] active:scale-95 transition-transform"
				>
					Adicionar exercício
				</a>
			</div>
		{:else}
			{#each orderedExercises as se (se.id)}
				{@const ex = exerciseMap.get(se.exerciseId)}
				{@const ui = uiState.get(se.id)}
				{#if ui}
					<div class="px-4 py-5 space-y-4">

						<!-- Cabeçalho do exercício (clicável para colapsar) -->
						<button
							type="button"
							onclick={() => updateUI(se.id, { expanded: !ui.expanded })}
							class="flex w-full items-center gap-3 text-left"
							aria-expanded={ui.expanded}
						>
							<!-- Número de ordem -->
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
									bg-[#15161A] border border-[#2F3336] text-[13px] font-black text-[#71767B]"
								aria-hidden="true"
							>
								{se.orderIndex + 1}
							</span>

							<div class="min-w-0 flex-1">
								<p class="truncate text-[16px] font-bold text-[#E7E9EA]">
									{ex?.name ?? `Exercício ${se.exerciseId.slice(0, 6)}…`}
								</p>
								<p class="text-[12px] text-[#71767B]">
									{ex ? (MUSCLE_GROUP_LABELS[ex.muscleGroup] ?? ex.muscleGroup) : ''}
									· {se.targetSets}×{se.targetRepsMin === se.targetRepsMax
										? se.targetRepsMin
										: `${se.targetRepsMin}–${se.targetRepsMax}`}
									{#if se.restSeconds > 0}
										· {formatRestTime(se.restSeconds)} descanso
									{/if}
								</p>
							</div>

							<!-- Indicador de séries completas + chevron -->
							<div class="flex shrink-0 items-center gap-2">
								{#if ui.logged.length > 0}
									<span
										class="rounded-full bg-[#15161A] border border-[#2F3336]
											px-2.5 py-1 text-[12px] font-bold text-[#E7E9EA]"
									>
										{ui.logged.length}/{se.targetSets}
									</span>
								{/if}
								<svg
									class="h-5 w-5 text-[#71767B] transition-transform duration-200
										{ui.expanded ? 'rotate-90' : ''}"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M9 6l6 6-6 6" />
								</svg>
							</div>
						</button>

						<!-- Corpo expansível ──────────────────────────── -->
						{#if ui.expanded}
							<div class="space-y-3 pl-11">

								<!-- Séries já logadas -->
								{#if ui.logged.length > 0}
									<div class="space-y-1.5">
										<p class="text-[11px] font-semibold uppercase tracking-wider text-[#71767B]">
											Séries registradas
										</p>
										{#each ui.logged as s (s.setNumber)}
											<div
												class="flex items-center gap-3 rounded-xl border border-[#2F3336]
													bg-[#15161A] px-3.5 py-3"
											>
												<span class="w-5 shrink-0 text-[13px] font-bold text-[#71767B]">
													{s.setNumber}.
												</span>
												<span class="flex-1 text-[14px] font-semibold text-[#E7E9EA]">
													{s.reps} reps · {s.loadKg} kg
												</span>
												{#if s.rpe !== undefined}
													<span class="rounded-full bg-[#2F3336]/60 px-2 py-0.5 text-[11px] text-[#71767B]">
														RPE {s.rpe}
													</span>
												{/if}
												<!-- Check verde -->
												<svg class="h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
													<path d="M20 6L9 17l-5-5" />
												</svg>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Formulário da próxima série ──────────── -->
								{#if ui.logged.length < se.targetSets}
									<div class="space-y-3 rounded-2xl border border-[#2F3336] bg-[#15161A] p-4">
										<p class="text-[12px] font-semibold text-[#71767B]">
											Série {ui.logged.length + 1} de {se.targetSets}
										</p>

										<!-- Reps + Carga lado a lado -->
										<div class="grid grid-cols-2 gap-3">
											<!-- Reps -->
											<div class="space-y-1.5">
												<label
													for="reps-{se.id}"
													class="block text-[11px] font-semibold uppercase tracking-wider text-[#71767B]"
												>
													Reps
												</label>
												<div class="flex items-center rounded-xl border border-[#2F3336] bg-[#0B0B0D] overflow-hidden">
													<button
														type="button"
														onclick={() => updateDraft(se.id, { reps: Math.max(1, ui.draft.reps - 1) })}
														class="flex h-12 w-12 shrink-0 items-center justify-center
															text-[20px] font-bold text-[#71767B] active:bg-[#2F3336]
															transition-colors"
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
														class="flex-1 bg-transparent text-center text-[18px] font-black
															text-[#E7E9EA] outline-none tabular-nums"
														aria-label="Repetições"
													/>
													<button
														type="button"
														onclick={() => updateDraft(se.id, { reps: ui.draft.reps + 1 })}
														class="flex h-12 w-12 shrink-0 items-center justify-center
															text-[20px] font-bold text-[#71767B] active:bg-[#2F3336]
															transition-colors"
														aria-label="Aumentar repetições"
													>
														+
													</button>
												</div>
											</div>

											<!-- Carga (kg) -->
											<div class="space-y-1.5">
												<label
													for="load-{se.id}"
													class="block text-[11px] font-semibold uppercase tracking-wider text-[#71767B]"
												>
													Carga (kg)
												</label>
												<div class="flex items-center rounded-xl border border-[#2F3336] bg-[#0B0B0D] overflow-hidden">
													<button
														type="button"
														onclick={() => updateDraft(se.id, { loadKg: Math.max(0, ui.draft.loadKg - 2.5) })}
														class="flex h-12 w-12 shrink-0 items-center justify-center
															text-[20px] font-bold text-[#71767B] active:bg-[#2F3336]
															transition-colors"
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
														class="flex-1 bg-transparent text-center text-[18px] font-black
															text-[#E7E9EA] outline-none tabular-nums"
														aria-label="Carga em kg"
													/>
													<button
														type="button"
														onclick={() => updateDraft(se.id, { loadKg: ui.draft.loadKg + 2.5 })}
														class="flex h-12 w-12 shrink-0 items-center justify-center
															text-[20px] font-bold text-[#71767B] active:bg-[#2F3336]
															transition-colors"
														aria-label="Aumentar carga"
													>
														+
													</button>
												</div>
											</div>
										</div>

										<!-- RPE (opcional, compacto) -->
										<div class="space-y-1.5">
											<p class="text-[11px] font-semibold uppercase tracking-wider text-[#71767B]">
												RPE <span class="font-normal normal-case text-[#71767B]/60">(opcional)</span>
											</p>
											<div class="flex gap-1.5">
												{#each [6, 7, 8, 9, 10] as rpeVal (rpeVal)}
													<button
														type="button"
														onclick={() =>
															updateDraft(se.id, {
																rpe: ui.draft.rpe === rpeVal ? undefined : rpeVal
															})}
														class="flex-1 rounded-xl border py-2.5 text-[13px] font-bold
															transition-colors
															{ui.draft.rpe === rpeVal
																? 'border-[#E7E9EA] bg-[#E7E9EA] text-[#0B0B0D]'
																: 'border-[#2F3336] bg-transparent text-[#71767B] active:bg-[#2F3336]'}"
														aria-pressed={ui.draft.rpe === rpeVal}
														aria-label="RPE {rpeVal}"
													>
														{rpeVal}
													</button>
												{/each}
											</div>
										</div>

										<!-- Botão de confirmar série — grande, sweaty-hand friendly -->
										<button
											type="button"
											onclick={() => logSet(se)}
											disabled={ui.saving}
											class="relative flex w-full items-center justify-center gap-2.5 overflow-hidden
												rounded-2xl py-4 text-[16px] font-black tracking-tight
												transition-all duration-150 active:scale-[0.98]
												{ui.justLogged
													? 'bg-emerald-500 text-white'
													: 'bg-[#E7E9EA] text-[#0B0B0D]'}
												disabled:opacity-50 disabled:cursor-not-allowed"
											aria-label="Confirmar série {ui.logged.length + 1}"
										>
											{#if ui.justLogged}
												<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
													<path d="M20 6L9 17l-5-5" />
												</svg>
												Série registrada!
											{:else if ui.saving}
												<span class="animate-pulse">Salvando…</span>
											{:else}
												<svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
													<path d="M20 6L9 17l-5-5" />
												</svg>
												Concluir série {ui.logged.length + 1}
											{/if}
										</button>
									</div>
								{:else}
									<!-- Todas as séries concluídas -->
									<div
										class="flex items-center gap-2.5 rounded-2xl border border-emerald-500/20
											bg-emerald-500/5 px-4 py-3.5"
										role="status"
									>
										<svg class="h-5 w-5 shrink-0 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
											<path d="M20 6L9 17l-5-5" />
										</svg>
										<p class="text-[14px] font-semibold text-emerald-400">
											{se.targetSets} séries concluídas!
										</p>
									</div>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			{/each}

			<!-- Rodapé: adicionar exercício -->
			<div class="px-4 py-5">
				<a
					href="/fichas/{routine.id}/{split.id}/exercicios/novo"
					class="flex items-center justify-center gap-2 rounded-full border border-[#2F3336]
						py-3.5 text-[15px] font-bold text-[#E7E9EA] transition-colors active:bg-[#15161A]"
				>
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M12 5v14M5 12h14" />
					</svg>
					Adicionar exercício
				</a>
			</div>
		{/if}
	</div>
{/if}