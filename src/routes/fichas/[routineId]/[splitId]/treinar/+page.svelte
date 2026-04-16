<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
	import PageLoadingSkeleton from '$ui/components/shared/PageLoadingSkeleton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import BackButton from '$ui/components/shared/BackButton.svelte';
	import SpinnerButton from '$ui/components/shared/SpinnerButton.svelte';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split, SplitExercise } from '$core/domain/entities/Split';
	import type { Exercise } from '$core/domain/entities/Exercise';
	import type { WorkoutSession } from '$core/domain/entities/WorkoutSession';

	type LoadState = 'loading' | 'ready' | 'not-found' | 'error';
	type SaveState = 'idle' | 'saving' | 'error';

	interface ExerciseUIState {
		logged: Array<{ setNumber: number; reps: number; loadKg: number; rpe?: number }>;
		currentReps: number;
		currentLoadKg: number;
		currentRpe: number | undefined;
		restTimerRunning: boolean;
		restTimeRemaining: number;
	}

	// ── Estado ──────────────────────────────────────────────────
	let loadState = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let split = $state<Split | null>(null);
	let session = $state<WorkoutSession | null>(null);
	let exerciseMap = $state<Map<string, Exercise>>(new Map());
	let uiState = $state<Map<string, ExerciseUIState>>(new Map());
	let loadError = $state<string | null>(null);

	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);

	let currentExerciseIndex = $state(0);

	let orderedExercises = $derived(
		split ? [...split.exercises].sort((a, b) => a.orderIndex - b.orderIndex) : []
	);

	let currentExercise = $derived(orderedExercises[currentExerciseIndex] || null);
	let currentExerciseData = $derived(currentExercise ? exerciseMap.get(currentExercise.exerciseId) : null);

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

	onMount(() => {
		const { routineId, splitId } = $page.params;
		(async () => {
			try {
				const { routines, exercises, startWorkoutSession } = getContainer();

				// Carregar dados
				const foundRoutine = await routines.findById(routineId);
				if (!foundRoutine) {
					loadState = 'not-found';
					return;
				}

				const foundSplits = await routines.findSplits(routineId);
				const foundSplit = foundSplits.find((s: Split) => s.id === splitId);
				if (!foundSplit) {
					loadState = 'not-found';
					return;
				}

				const allExercises = await exercises.findAll();
				const exerciseMapTemp = new Map<string, Exercise>();
				allExercises.forEach(ex => exerciseMapTemp.set(ex.id, ex));

				// Iniciar sessão de treino
				const sessionResult = await startWorkoutSession.execute({
					routineId,
					splitId
				});

				routine = foundRoutine;
				split = foundSplit;
				session = sessionResult.session;
				exerciseMap = exerciseMapTemp;

				// Inicializar estado da UI
				for (const se of foundSplit.exercises) {
					if (!uiState.has(se.id)) {
						uiState.set(se.id, {
							logged: [],
							currentReps: se.targetRepsMin,
							currentLoadKg: 0,
							currentRpe: undefined,
							restTimerRunning: false,
							restTimeRemaining: 0
						});
					}
				}

				loadState = 'ready';
			} catch (err) {
				console.error('[treinar] Falha ao carregar', err);
				loadError = err instanceof Error ? err.message : 'Erro desconhecido.';
				loadState = 'error';
			}
		})();
	});

	async function logSet() {
		if (!currentExercise || saveState === 'saving') return;

		const ui = uiState.get(currentExercise.id);
		if (!ui) return;

		saveState = 'saving';
		saveError = null;

		try {
			const { logSet: logSetUseCase, finishWorkoutSession } = getContainer();

			const nextSetNumber = ui.logged.length + 1;
			await logSetUseCase.execute({
				splitId: split!.id,
				exerciseId: currentExercise.exerciseId,
				setNumber: nextSetNumber,
				reps: ui.currentReps,
				loadKg: ui.currentLoadKg,
				rpe: ui.currentRpe,
				restSeconds: currentExercise.restSeconds > 0 ? currentExercise.restSeconds : 0
			});

			// Adicionar à lista de séries logadas
			ui.logged.push({
				setNumber: nextSetNumber,
				reps: ui.currentReps,
				loadKg: ui.currentLoadKg,
				rpe: ui.currentRpe
			});

			// Se completou o exercício, ir para o próximo
			if (ui.logged.length >= currentExercise.targetSets) {
				currentExerciseIndex += 1;

				// Se era o último exercício, finalizar treino
				if (currentExerciseIndex >= orderedExercises.length && session) {
					await finishWorkoutSession.execute({ sessionId: session.id });
					await goto(`/historico`, { replaceState: true });
				}
			}

			saveState = 'idle';
		} catch (err) {
			console.error('[treinar] Falha ao salvar série', err);
			saveError = err instanceof Error ? err.message : 'Algo deu errado.';
			saveState = 'error';
		}
	}

	async function finishWorkout() {
		if (!session) return;

		try {
			const { finishWorkoutSession } = getContainer();
			await finishWorkoutSession.execute({ sessionId: session.id });
			await goto(`/historico`, { replaceState: true });
		} catch (err) {
			console.error('[treinar] Falha ao finalizar treino', err);
			saveError = err instanceof Error ? err.message : 'Algo deu errado.';
		}
	}
</script>

<svelte:head>
	<title>Treinar · MoralGym</title>
</svelte:head>

{#if loadState === 'loading'}
	<PageLoadingSkeleton rows={3} />

{:else if loadState === 'error'}
	<ErrorAlert message="Não foi possível carregar o treino." detail={loadError} />

{:else if loadState === 'not-found' || !routine || !split}
	<section class="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center animate-fade-in">
		<h2 class="text-[20px] font-bold text-gym-text">Treino não encontrado</h2>
		<p class="mt-2 max-w-xs text-[14px] text-gym-muted">O link pode estar incorreto ou o treino foi removido.</p>
		<a href="/fichas" class="mt-6 btn-ghost">Voltar para Fichas</a>
	</section>

{:else}
	<div class="animate-slide-up">
		<!-- ── Header ───────────────────────────────────────────── -->
		<div class="flex items-center gap-3 px-5 pt-5 pb-3">
			<BackButton href="/fichas/{routine.id}/{split.id}" label="Parar treino" />
			<div class="min-w-0 flex-1">
				<p class="section-label truncate">{split.name ?? `Treino ${split.label}`}</p>
				<h1 class="text-[20px] font-black text-gym-text">Executar</h1>
			</div>
		</div>

		<!-- ── Progresso ─────────────────────────────────────────── -->
		<div class="flex items-center justify-between gap-3 px-5 pb-4 text-[14px] text-gym-muted">
			<span>{totalSetsLogged}/{totalSetsTarget} séries</span>
			<div class="h-1.5 flex-1 bg-gym-surface rounded-full overflow-hidden">
				<div
					class="h-full bg-gym-accent transition-all duration-300"
					style="width: {(totalSetsLogged / totalSetsTarget) * 100}%"
				></div>
			</div>
		</div>

		<!-- ── Exercício Atual ────────────────────────────────────── -->
		{#if currentExercise && currentExerciseData}
			<div class="space-y-4 px-5 pb-6">
				<!-- Exercício -->
				<div class="bg-gym-surface rounded-lg p-4 border border-gym-accent/20">
					<p class="text-[12px] uppercase tracking-wider text-gym-muted mb-1">
						Exercício {currentExerciseIndex + 1}/{orderedExercises.length}
					</p>
					<h2 class="text-[18px] font-bold text-gym-text mb-2">{currentExerciseData.name}</h2>

					{#if currentExerciseData.media}
						<div class="mb-3 rounded-lg overflow-hidden bg-gym-bg h-48 flex items-center justify-center text-gym-muted text-[12px]">
							{#if currentExerciseData.media.mimeType === 'image/webp'}
								<img
									src={URL.createObjectURL(currentExerciseData.media.blob)}
									alt={currentExerciseData.name}
									class="w-full h-full object-cover"
								/>
							{:else}
								<video
									src={URL.createObjectURL(currentExerciseData.media.blob)}
									controls
									class="w-full h-full object-cover"
								></video>
							{/if}
						</div>
					{/if}

					<p class="text-[13px] text-gym-muted">
						{currentExercise.targetSets}×{
							currentExercise.targetRepsMin === currentExercise.targetRepsMax
								? currentExercise.targetRepsMin
								: `${currentExercise.targetRepsMin}–${currentExercise.targetRepsMax}`
						} reps · {currentExercise.restSeconds}s descanso
					</p>
				</div>

				<!-- Série atual -->
				{#if uiState.has(currentExercise.id)}
					{@const ui = uiState.get(currentExercise.id)!}
					<div class="bg-gym-surface rounded-lg p-4 border border-gym-accent/20 space-y-4">
						<p class="text-[12px] uppercase tracking-wider text-gym-muted">
							Série {ui.logged.length + 1}/{currentExercise.targetSets}
						</p>

						<div class="space-y-3">
							<!-- Reps -->
							<div>
								<label for="reps" class="text-[13px] font-medium text-gym-text block mb-2">
									Reps
								</label>
								<input
									id="reps"
									type="number"
									min="0"
									bind:value={ui.currentReps}
									class="input-base w-full"
									placeholder="0"
								/>
							</div>

							<!-- Load -->
							<div>
								<label for="load" class="text-[13px] font-medium text-gym-text block mb-2">
									Peso (kg)
								</label>
								<input
									id="load"
									type="number"
									min="0"
									step="0.5"
									bind:value={ui.currentLoadKg}
									class="input-base w-full"
									placeholder="0"
								/>
							</div>

							<!-- RPE -->
							<div>
								<label for="rpe" class="text-[13px] font-medium text-gym-text block mb-2">
									RPE <span class="font-normal text-gym-muted/60">(1-10, opcional)</span>
								</label>
								<input
									id="rpe"
									type="number"
									min="1"
									max="10"
									bind:value={ui.currentRpe}
									class="input-base w-full"
									placeholder="Deixe em branco"
								/>
							</div>
						</div>

						{#if saveError}
							<ErrorAlert message={saveError} />
						{/if}

						<SpinnerButton
							loading={saveState === 'saving'}
							disabled={saveState === 'saving'}
							id="btn-log-set"
							type="button"
							class="w-full"
							on:click={logSet}
						>
							<span slot="loading">Salvando...</span>
							<span>Salvar série</span>
						</SpinnerButton>
					</div>
				{/if}
			</div>
		{:else if allDone}
			<!-- Treino completo -->
			<div class="flex flex-col items-center justify-center gap-4 px-5 py-12 text-center">
				<div class="text-5xl">🎉</div>
				<h2 class="text-[20px] font-bold text-gym-text">Treino concluído!</h2>
				<p class="max-w-xs text-[14px] text-gym-muted">
					Você completou todas as {totalSetsTarget} séries. Ótimo trabalho!
				</p>
				<button
					class="btn-primary mt-4"
					on:click={finishWorkout}
					disabled={saveState === 'saving'}
				>
					Ver histórico
				</button>
			</div>
		{/if}
	</div>
{/if}
