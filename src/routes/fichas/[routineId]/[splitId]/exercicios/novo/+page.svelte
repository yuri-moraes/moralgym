<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
	import { MUSCLE_GROUPS } from '$core/domain/value-objects/MuscleGroup';
	import type { MuscleGroup } from '$core/domain/value-objects/MuscleGroup';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';
	import type { Exercise } from '$core/domain/entities/Exercise';

	type LoadState = 'loading' | 'ready' | 'not-found' | 'error';
	type SaveState = 'idle' | 'saving' | 'error';

	const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
		chest: 'Peito', back: 'Costas', shoulders: 'Ombros',
		biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebraços',
		quads: 'Quadríceps', hamstrings: 'Isquiotibiais', glutes: 'Glúteos',
		calves: 'Panturrilhas', abs: 'Abdômen', other: 'Outro'
	};

	// ── Estado ──────────────────────────────────────────────────
	let loadState = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let split = $state<Split | null>(null);
	let allExercises = $state<readonly Exercise[]>([]);
	let loadError = $state<string | null>(null);

	// ── Formulário ──────────────────────────────────────────────
	let exerciseName = $state('');
	let muscleGroup = $state<MuscleGroup>('chest');
	let targetSets = $state(3);
	let targetRepsMin = $state(8);
	let targetRepsMax = $state(12);
	let restSeconds = $state(90);
	let exerciseNotes = $state('');

	// ── Busca ───────────────────────────────────────────────────
	let searchQuery = $state('');
	let selectedExercise = $state<Exercise | null>(null);
	let showSearch = $state(false);

	let filteredExercises = $derived(
		searchQuery.trim().length < 2
			? []
			: allExercises.filter((e) =>
					e.name.toLowerCase().includes(searchQuery.toLowerCase())
				)
	);

	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);

	let canSubmit = $derived(exerciseName.trim().length > 0 && saveState !== 'saving');

	// Descrição do tempo de descanso formatada
	let restDisplay = $derived(
		restSeconds === 0
			? 'Sem descanso'
			: restSeconds < 60
				? `${restSeconds}s`
				: `${Math.floor(restSeconds / 60)}min${restSeconds % 60 > 0 ? ` ${restSeconds % 60}s` : ''}`
	);

	// Preview de prescrição
	let prescriptionPreview = $derived(
		`${targetSets} × ${targetRepsMin === targetRepsMax ? targetRepsMin : `${targetRepsMin}–${targetRepsMax}`} reps${restSeconds > 0 ? ` · ${restDisplay} descanso` : ''}`
	);

	function selectExercise(ex: Exercise) {
		selectedExercise = ex;
		exerciseName = ex.name;
		muscleGroup = ex.muscleGroup;
		exerciseNotes = ex.notes ?? '';
		searchQuery = '';
		showSearch = false;
	}

	function clearSelection() {
		selectedExercise = null;
		exerciseName = '';
		showSearch = false;
	}

	onMount(() => {
		const { routineId, splitId } = $page.params;
		(async () => {
			try {
				const { routines, exercises } = getContainer();
				const [foundRoutine, allEx] = await Promise.all([
					routines.findById(routineId),
					exercises.findAll()
				]);
				if (!foundRoutine) { loadState = 'not-found'; return; }

				const allSplits = await routines.findSplits(foundRoutine.id);
				const foundSplit = allSplits.find((s: Split) => s.id === splitId) ?? null;
				if (!foundSplit) { loadState = 'not-found'; return; }

				routine = foundRoutine;
				split = foundSplit;
				allExercises = allEx;
				loadState = 'ready';
			} catch (err) {
				console.error('[exercicios/novo] Falha ao carregar', err);
				loadError = err instanceof Error ? err.message : 'Erro desconhecido.';
				loadState = 'error';
			}
		})();
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit || !routine || !split) return;

		saveState = 'saving';
		saveError = null;

		try {
			const { routines, exercises: exerciseRepo } = getContainer();

			const now = new Date();
			let exercise: Exercise;

			if (selectedExercise) {
				exercise = selectedExercise;
			} else {
				exercise = {
					id: crypto.randomUUID(),
					name: exerciseName.trim(),
					muscleGroup,
					notes: exerciseNotes.trim() || undefined,
					createdAt: now,
					updatedAt: now
				};
				await exerciseRepo.save(exercise);
			}

			const allSplits = await routines.findSplits(routine.id);
			const targetSplit = allSplits.find((s: Split) => s.id === split!.id)!;
			const newOrderIndex = targetSplit.exercises.length;

			const newSplitExercise = {
				id: crypto.randomUUID(),
				exerciseId: exercise.id,
				orderIndex: newOrderIndex,
				targetSets,
				targetRepsMin,
				targetRepsMax: Math.max(targetRepsMin, targetRepsMax),
				restSeconds
			};

			const updatedSplit: Split = {
				...targetSplit,
				exercises: [...targetSplit.exercises, newSplitExercise],
				updatedAt: now
			};
			const updatedSplits = allSplits.map((s: Split) =>
				s.id === updatedSplit.id ? updatedSplit : s
			);

			await routines.save({ ...routine, updatedAt: now }, updatedSplits);
			await goto(`/fichas/${routine.id}/${split!.id}`, { replaceState: true });
		} catch (err) {
			console.error('[exercicios/novo] Falha ao salvar', err);
			saveError = err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.';
			saveState = 'error';
		}
	}
</script>

<svelte:head>
	<title>Novo exercício · MoralGym</title>
</svelte:head>

{#if loadState === 'loading'}
	<div class="space-y-4 p-5" aria-busy="true" aria-live="polite">
		<div class="skeleton h-4 w-24"></div>
		<div class="skeleton h-7 w-48 mt-2"></div>
		{#each [0, 1, 2] as _}
			<div class="skeleton h-14 rounded-2xl"></div>
		{/each}
	</div>

{:else if loadState === 'error'}
	<div class="px-5 pt-6 animate-slide-up">
		<div role="alert" class="rounded-2xl border border-gym-danger/20 bg-gym-danger/5 p-5 text-sm text-red-300">
			<p class="font-semibold">Não foi possível carregar este treino.</p>
			{#if loadError}<p class="mt-1 text-red-300/70">{loadError}</p>{/if}
		</div>
	</div>

{:else if loadState === 'not-found' || !routine || !split}
	<section class="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center animate-fade-in">
		<h2 class="text-[20px] font-bold text-gym-text">Treino não encontrado</h2>
		<p class="mt-2 max-w-xs text-[14px] text-gym-muted">O link pode estar incorreto ou o treino foi removido.</p>
		<a href="/fichas" class="mt-6 btn-ghost">Voltar para Fichas</a>
	</section>

{:else}
	<div class="animate-slide-up">
		<!-- ── Header ───────────────────────────────────────────── -->
		<div class="flex items-center gap-3 px-5 pt-5 pb-2">
			<a
				href="/fichas/{routine.id}/{split.id}"
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
					border border-gym-border bg-gym-surface text-gym-muted
					transition-all active:bg-gym-surface2 active:scale-95"
				aria-label="Voltar para o treino"
			>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M15 6l-6 6 6 6" />
				</svg>
			</a>
			<div class="min-w-0 flex-1">
				<p class="section-label truncate">{split.name ?? `Treino ${split.label}`}</p>
				<h1 class="text-[20px] font-black text-gym-text">Novo exercício</h1>
			</div>
		</div>

		<!-- ── Form ─────────────────────────────────────────────── -->
		<form class="space-y-6 px-5 pt-4 pb-6" novalidate onsubmit={handleSubmit}>

			<!-- Busca de exercícios -->
			{#if !selectedExercise}
				<div class="space-y-2">
					<p class="section-label">Buscar no catálogo</p>
					<label
						for="exercise-search"
						class="flex items-center gap-3 rounded-2xl border border-gym-border
							bg-gym-surface px-4 py-3.5 transition-all
							focus-within:border-gym-accent focus-within:ring-2 focus-within:ring-gym-accent/20"
					>
						<svg class="h-5 w-5 shrink-0 text-gym-muted" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="1.75" stroke-linecap="round"
							stroke-linejoin="round" aria-hidden="true">
							<circle cx="11" cy="11" r="8" />
							<path d="M21 21l-4.35-4.35" />
						</svg>
						<input
							id="exercise-search"
							type="text"
							autocomplete="off"
							bind:value={searchQuery}
							placeholder="Ex.: Supino, Agachamento..."
							class="min-w-0 flex-1 bg-transparent text-[15px] text-gym-text
								placeholder:text-gym-muted/50 outline-none"
						/>
						{#if searchQuery}
							<button
								type="button"
								onclick={() => (searchQuery = '')}
								class="shrink-0 text-gym-muted active:text-gym-text"
								aria-label="Limpar busca"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none"
									stroke="currentColor" stroke-width="2" stroke-linecap="round"
									stroke-linejoin="round" aria-hidden="true">
									<path d="M18 6L6 18M6 6l12 12" />
								</svg>
							</button>
						{/if}
					</label>

					{#if filteredExercises.length > 0}
						<ul class="card divide-y divide-gym-border overflow-hidden animate-slide-down">
							{#each filteredExercises as ex (ex.id)}
								<li>
									<button
										type="button"
										onclick={() => selectExercise(ex)}
										class="flex w-full items-center justify-between px-4 py-3.5
											text-left transition-colors active:bg-gym-surface2"
									>
										<span class="text-[15px] font-semibold text-gym-text">{ex.name}</span>
										<span class="muscle-badge ml-3 shrink-0">
											{MUSCLE_GROUP_LABELS[ex.muscleGroup]}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else if searchQuery.trim().length >= 2}
						<p class="text-[13px] text-gym-muted pt-1">
							Nenhum resultado. Preencha abaixo para criar um novo.
						</p>
					{/if}
				</div>
			{/if}

			<!-- Exercício selecionado do catálogo -->
			{#if selectedExercise}
				<div
					class="flex items-center gap-3 rounded-2xl border border-gym-accent/30
						bg-gym-accent/5 px-4 py-3.5 animate-slide-down"
				>
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
						bg-gym-accent/20">
						<svg class="h-5 w-5 text-gym-accent" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
							stroke-linejoin="round" aria-hidden="true">
							<path d="M20 6L9 17l-5-5" />
						</svg>
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-[15px] font-bold text-gym-text">{selectedExercise.name}</p>
						<p class="text-[13px] text-gym-muted">
							{MUSCLE_GROUP_LABELS[selectedExercise.muscleGroup]} · do catálogo
						</p>
					</div>
					<button
						type="button"
						onclick={clearSelection}
						class="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl
							text-gym-muted transition-colors active:bg-gym-surface2"
						aria-label="Remover seleção"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none"
							stroke="currentColor" stroke-width="2" stroke-linecap="round"
							stroke-linejoin="round" aria-hidden="true">
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}

			<!-- Nome (apenas para novo) -->
			{#if !selectedExercise}
				<div class="space-y-2">
					<label for="exercise-name" class="section-label block">
						Nome <span class="text-gym-danger normal-case" aria-hidden="true">*</span>
					</label>
					<input
						id="exercise-name"
						type="text"
						required
						maxlength="80"
						autocomplete="off"
						bind:value={exerciseName}
						placeholder="Ex.: Supino Reto com Barra"
						class="input-base"
					/>
				</div>

				<!-- Grupo muscular — chips horizontais scrolláveis -->
				<div class="space-y-2">
					<p class="section-label">Grupo muscular</p>
					<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
						{#each MUSCLE_GROUPS as group (group)}
							<button
								type="button"
								onclick={() => (muscleGroup = group)}
								class="shrink-0 rounded-xl border px-3.5 py-2.5 text-[13px] font-bold
									transition-all active:scale-95 whitespace-nowrap
									{muscleGroup === group
										? 'border-gym-accent bg-gym-accent/15 text-gym-accent'
										: 'border-gym-border bg-gym-surface text-gym-muted active:bg-gym-surface2'}"
							>
								{MUSCLE_GROUP_LABELS[group]}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Prescrição -->
			<fieldset class="space-y-4">
				<legend class="section-label">Prescrição</legend>

				<!-- Preview -->
				<div class="rounded-xl border border-gym-accent/20 bg-gym-accent/5 px-4 py-2.5">
					<p class="text-[13px] font-semibold text-gym-accent">{prescriptionPreview}</p>
				</div>

				<!-- Séries / Reps Mín / Reps Máx -->
				<div class="grid grid-cols-3 gap-3">
					<div class="space-y-2">
						<label for="target-sets" class="section-label block">Séries</label>
						<input
							id="target-sets"
							type="number"
							min="1"
							max="20"
							bind:value={targetSets}
							class="input-base text-center text-[17px] font-black px-2"
						/>
					</div>
					<div class="space-y-2">
						<label for="reps-min" class="section-label block">Reps mín.</label>
						<input
							id="reps-min"
							type="number"
							min="1"
							max="100"
							bind:value={targetRepsMin}
							class="input-base text-center text-[17px] font-black px-2"
						/>
					</div>
					<div class="space-y-2">
						<label for="reps-max" class="section-label block">Reps máx.</label>
						<input
							id="reps-max"
							type="number"
							min="1"
							max="100"
							bind:value={targetRepsMax}
							class="input-base text-center text-[17px] font-black px-2"
						/>
					</div>
				</div>

				<!-- Descanso (slider estilizado) -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<p class="section-label">Descanso entre séries</p>
						<span
							class="rounded-lg border border-gym-border bg-gym-surface
								px-2.5 py-1 text-[13px] font-bold text-gym-text"
						>
							{restDisplay}
						</span>
					</div>
					<input
						id="rest-seconds"
						type="range"
						min="0"
						max="300"
						step="15"
						bind:value={restSeconds}
						class="w-full"
						aria-label="Tempo de descanso em segundos"
					/>
					<div class="flex justify-between text-[10px] text-gym-muted/60 font-medium">
						<span>0s</span><span>1min</span><span>2min</span><span>3min</span><span>4min</span><span>5min</span>
					</div>
				</div>
			</fieldset>

			<!-- Observações (apenas para novo) -->
			{#if !selectedExercise}
				<div class="space-y-2">
					<label for="exercise-notes" class="section-label block">
						Observações <span class="font-normal normal-case text-gym-muted/60">(opcional)</span>
					</label>
					<textarea
						id="exercise-notes"
						rows="3"
						maxlength="500"
						bind:value={exerciseNotes}
						placeholder="Dicas de execução, variações, cuidados..."
						class="input-base resize-none"
					></textarea>
				</div>
			{/if}

			<!-- Erro de save -->
			{#if saveState === 'error' && saveError}
				<div role="alert"
					class="rounded-2xl border border-gym-danger/30 bg-gym-danger/5 p-4
						text-[14px] text-red-300 animate-slide-up">
					{saveError}
				</div>
			{/if}

			<!-- Submit -->
			<button
				type="submit"
				id="btn-submit-exercicio"
				disabled={!canSubmit}
				class="btn-primary shadow-lg shadow-gym-accent/20"
			>
				{#if saveState === 'saving'}
					<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
						stroke-linejoin="round" aria-hidden="true">
						<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
					</svg>
					Salvando...
				{:else}
					<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M12 5v14M5 12h14" />
					</svg>
					Adicionar exercício
				{/if}
			</button>
		</form>
	</div>
{/if}
