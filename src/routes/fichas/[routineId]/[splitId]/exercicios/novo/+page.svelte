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

	// ── Contexto carregado ──────────────────────────────────────
	let loadState = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let split = $state<Split | null>(null);
	let allExercises = $state<readonly Exercise[]>([]);
	let loadError = $state<string | null>(null);

	// ── Campos do formulário ────────────────────────────────────
	let exerciseName = $state('');
	let muscleGroup = $state<MuscleGroup>('chest');
	let targetSets = $state(3);
	let targetRepsMin = $state(8);
	let targetRepsMax = $state(12);
	let restSeconds = $state(90);
	let exerciseNotes = $state('');

	// ── Busca de exercícios existentes ──────────────────────────
	let searchQuery = $state('');
	let selectedExercise = $state<Exercise | null>(null);

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

	function selectExercise(ex: Exercise) {
		selectedExercise = ex;
		exerciseName = ex.name;
		muscleGroup = ex.muscleGroup;
		exerciseNotes = ex.notes ?? '';
		searchQuery = '';
	}

	function clearSelection() {
		selectedExercise = null;
		exerciseName = '';
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

			// 1. Criar ou reutilizar o exercício no catálogo.
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

			// 2. Montar o novo SplitExercise.
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

			// 3. Atualizar o split com o novo exercício e salvar.
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
	<div class="space-y-4" aria-busy="true" aria-live="polite">
		<div class="h-5 w-24 animate-pulse rounded bg-white/5"></div>
		<div class="h-7 w-1/2 animate-pulse rounded bg-white/5"></div>
		<div class="space-y-3">
			{#each [0, 1, 2] as _}
				<div class="h-12 animate-pulse rounded-xl bg-white/5"></div>
			{/each}
		</div>
	</div>
{:else if loadState === 'error'}
	<div role="alert" class="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-200">
		<p class="font-semibold">Não foi possível carregar este treino.</p>
		{#if loadError}<p class="mt-1 text-red-200/80">{loadError}</p>{/if}
	</div>
{:else if loadState === 'not-found' || !routine || !split}
	<section class="flex min-h-[60vh] flex-col items-center justify-center text-center">
		<h2 class="text-lg font-semibold text-gray-100">Treino não encontrado</h2>
		<p class="mt-2 max-w-xs text-sm text-gray-400">O link pode estar incorreto ou o treino foi removido.</p>
		<a href="/fichas" class="mt-6 inline-flex items-center justify-center rounded-xl bg-white/5 px-5 py-3 text-sm font-semibold text-gray-100 transition-colors hover:bg-white/10">
			Voltar para Fichas
		</a>
	</section>
{:else}
	<section class="space-y-6">
		<!-- Breadcrumb -->
		<header>
			<a
				href="/fichas/{routine.id}/{split.id}"
				class="inline-flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M15 6l-6 6 6 6" />
				</svg>
				{split.name ?? `Treino ${split.label}`}
			</a>
			<h2 class="mt-3 text-xl font-semibold text-gray-100">Novo exercício</h2>
			<p class="mt-1 text-sm text-gray-400">Busque um exercício existente ou crie um novo.</p>
		</header>

		<form class="space-y-5" novalidate onsubmit={handleSubmit}>

			<!-- Busca de exercícios existentes -->
			{#if !selectedExercise}
				<div class="space-y-2">
					<label for="exercise-search" class="block text-xs font-medium text-gray-300">
						Buscar no catálogo
					</label>
					<label
						for="exercise-search"
						class="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3
							transition-colors focus-within:border-white/30 focus-within:bg-white/[0.05]"
					>
						<svg
							class="h-4 w-4 shrink-0 text-gray-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<circle cx="11" cy="11" r="8" />
							<path d="M21 21l-4.35-4.35" />
						</svg>
						<input
							id="exercise-search"
							type="text"
							autocomplete="off"
							bind:value={searchQuery}
							placeholder="Ex.: Supino, Agachamento..."
							class="min-w-0 flex-1 appearance-none bg-transparent text-sm text-gray-100 placeholder:text-gray-600 outline-none"
						/>
					</label>
					{#if filteredExercises.length > 0}
						<ul class="mt-1 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-[#0B0B0D]">
							{#each filteredExercises as ex (ex.id)}
								<li>
									<button
										type="button"
										onclick={() => selectExercise(ex)}
										class="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.07]"
									>
										<span class="text-sm font-medium text-gray-100">{ex.name}</span>
										<span class="ml-3 shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-gray-400">
											{MUSCLE_GROUP_LABELS[ex.muscleGroup]}
										</span>
									</button>
								</li>
							{/each}
						</ul>
					{:else if searchQuery.trim().length >= 2}
						<p class="text-xs text-gray-500 pt-1">Nenhum resultado. Preencha abaixo para criar.</p>
					{/if}
				</div>
			{/if}

			<!-- Exercício selecionado do catálogo -->
			{#if selectedExercise}
				<div class="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/5 px-4 py-3">
					<div>
						<p class="text-sm font-semibold text-gray-100">{selectedExercise.name}</p>
						<p class="text-xs text-gray-400">{MUSCLE_GROUP_LABELS[selectedExercise.muscleGroup]} · do catálogo</p>
					</div>
					<button
						type="button"
						onclick={clearSelection}
						class="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/5 hover:text-gray-200"
						aria-label="Remover seleção"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M18 6L6 18M6 6l12 12" />
						</svg>
					</button>
				</div>
			{/if}

			<!-- Dados do exercício (novo ou sobrescrita de nome) -->
			{#if !selectedExercise}
				<div class="space-y-2">
					<label for="exercise-name" class="block text-xs font-medium text-gray-300">
						Nome <span class="text-red-400" aria-hidden="true">*</span>
					</label>
					<input
						id="exercise-name"
						type="text"
						required
						maxlength="80"
						autocomplete="off"
						bind:value={exerciseName}
						placeholder="Ex.: Supino Reto com Barra"
						class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-100
							placeholder:text-gray-600 outline-none transition-colors
							focus:border-white/30 focus:bg-white/[0.05]"
					/>
				</div>

				<!-- Grupo muscular -->
				<div class="space-y-2">
					<label for="muscle-group" class="block text-xs font-medium text-gray-300">Grupo muscular</label>
					<select
						id="muscle-group"
						bind:value={muscleGroup}
						class="w-full rounded-xl border border-white/10 bg-[#0B0B0D] px-4 py-3 text-sm text-gray-100
							outline-none transition-colors focus:border-white/30"
					>
						{#each MUSCLE_GROUPS as group (group)}
							<option value={group}>{MUSCLE_GROUP_LABELS[group]}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Prescrição: Séries, Reps, Descanso -->
			<fieldset class="space-y-4">
				<legend class="text-xs font-medium text-gray-300">Prescrição</legend>

				<div class="grid grid-cols-3 gap-3">
					<!-- Séries -->
					<div class="space-y-1.5">
						<label for="target-sets" class="block text-[11px] font-medium text-gray-400">Séries</label>
						<input
							id="target-sets"
							type="number"
							min="1"
							max="20"
							bind:value={targetSets}
							class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-sm font-semibold text-gray-100
								outline-none transition-colors focus:border-white/30 focus:bg-white/[0.05]"
						/>
					</div>

					<!-- Reps Mín -->
					<div class="space-y-1.5">
						<label for="reps-min" class="block text-[11px] font-medium text-gray-400">Reps mín.</label>
						<input
							id="reps-min"
							type="number"
							min="1"
							max="100"
							bind:value={targetRepsMin}
							class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-sm font-semibold text-gray-100
								outline-none transition-colors focus:border-white/30 focus:bg-white/[0.05]"
						/>
					</div>

					<!-- Reps Máx -->
					<div class="space-y-1.5">
						<label for="reps-max" class="block text-[11px] font-medium text-gray-400">Reps máx.</label>
						<input
							id="reps-max"
							type="number"
							min="1"
							max="100"
							bind:value={targetRepsMax}
							class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-center text-sm font-semibold text-gray-100
								outline-none transition-colors focus:border-white/30 focus:bg-white/[0.05]"
						/>
					</div>
				</div>

				<!-- Preview da prescrição -->
				<p class="text-xs text-gray-500">
					→ {targetSets} séries de {targetRepsMin === targetRepsMax ? targetRepsMin : `${targetRepsMin}–${targetRepsMax}`} reps
					{#if restSeconds > 0}
						· {restSeconds < 60 ? `${restSeconds}s` : `${Math.floor(restSeconds / 60)}min${restSeconds % 60 > 0 ? ` ${restSeconds % 60}s` : ''}`} de descanso
					{/if}
				</p>

				<!-- Descanso -->
				<div class="space-y-2">
					<div class="flex items-baseline justify-between">
						<label for="rest-seconds" class="text-[11px] font-medium text-gray-400">
							Descanso entre séries
						</label>
						<span class="text-[11px] text-gray-500">
							{restSeconds === 0 ? 'Sem descanso' : restSeconds < 60 ? `${restSeconds}s` : `${Math.floor(restSeconds / 60)}min${restSeconds % 60 > 0 ? ` ${restSeconds % 60}s` : ''}`}
						</span>
					</div>
					<input
						id="rest-seconds"
						type="range"
						min="0"
						max="300"
						step="15"
						bind:value={restSeconds}
						class="w-full accent-gray-100"
					/>
					<div class="flex justify-between text-[10px] text-gray-600">
						<span>0s</span><span>1min</span><span>2min</span><span>3min</span><span>4min</span><span>5min</span>
					</div>
				</div>
			</fieldset>

			<!-- Observações do exercício (só para novo) -->
			{#if !selectedExercise}
				<div class="space-y-2">
					<label for="exercise-notes" class="block text-xs font-medium text-gray-300">
						Observações <span class="text-gray-500">(opcional)</span>
					</label>
					<textarea
						id="exercise-notes"
						rows="3"
						maxlength="500"
						bind:value={exerciseNotes}
						placeholder="Dicas de execução, variações, cuidados..."
						class="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-100
							placeholder:text-gray-600 outline-none transition-colors
							focus:border-white/30 focus:bg-white/[0.05]"
					></textarea>
				</div>
			{/if}

			<!-- Erro de save -->
			{#if saveState === 'error' && saveError}
				<div role="alert" class="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
					{saveError}
				</div>
			{/if}

			<button
				type="submit"
				disabled={!canSubmit}
				class="inline-flex w-full items-center justify-center rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-[#0B0B0D]
					transition-colors active:bg-gray-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500"
			>
				{saveState === 'saving' ? 'Salvando...' : 'Adicionar exercício'}
			</button>
		</form>
	</section>
{/if}
