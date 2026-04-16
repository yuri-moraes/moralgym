<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
	import { MUSCLE_GROUPS } from '$core/domain/value-objects/MuscleGroup';
	import PageLoadingSkeleton from '$ui/components/shared/PageLoadingSkeleton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import BackButton from '$ui/components/shared/BackButton.svelte';
	import SpinnerButton from '$ui/components/shared/SpinnerButton.svelte';
	import ExerciseSearchBox from '$ui/components/exercicio/ExerciseSearchBox.svelte';
	import MuscleGroupPicker from '$ui/components/exercicio/MuscleGroupPicker.svelte';
	import PrescriptionFields from '$ui/components/exercicio/PrescriptionFields.svelte';
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
	let mediaFile = $state<File | null>(null);
	let mediaPreview = $state<string>('');

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

	function handleMediaChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		mediaFile = file;

		// Criar preview
		const reader = new FileReader();
		reader.onload = (e) => {
			mediaPreview = e.target?.result as string;
		};
		reader.readAsDataURL(file);
	}

	function clearMedia() {
		mediaFile = null;
		mediaPreview = '';
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
			const { routines, createExercise } = getContainer();

			const now = new Date();
			let exercise: Exercise;

			if (selectedExercise) {
				exercise = selectedExercise;
			} else {
				const result = await createExercise.execute({
					name: exerciseName.trim(),
					muscleGroup,
					notes: exerciseNotes.trim() || undefined,
					mediaFile: mediaFile || undefined
				});
				exercise = result.exercise;
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
	<PageLoadingSkeleton rows={2} />

{:else if loadState === 'error'}
	<ErrorAlert message="Não foi possível carregar este treino." detail={loadError} />

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
			<BackButton href="/fichas/{routine.id}/{split.id}" label="Voltar para o treino" />
			<div class="min-w-0 flex-1">
				<p class="section-label truncate">{split.name ?? `Treino ${split.label}`}</p>
				<h1 class="text-[20px] font-black text-gym-text">Novo exercício</h1>
			</div>
		</div>

		<!-- ── Form ─────────────────────────────────────────────── -->
		<form class="space-y-6 px-5 pt-4 pb-6" novalidate onsubmit={handleSubmit}>

			<!-- Busca de exercícios -->
			<ExerciseSearchBox
				{allExercises}
				{searchQuery}
				{selectedExercise}
				muscleGroupLabels={MUSCLE_GROUP_LABELS}
				onsearch={(query) => (searchQuery = query)}
				onselect={selectExercise}
				onclear={clearSelection}
			/>

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
				<MuscleGroupPicker
					selected={muscleGroup}
					groups={MUSCLE_GROUPS}
					labels={MUSCLE_GROUP_LABELS}
					onchange={(group) => (muscleGroup = group)}
				/>
			{/if}

			<!-- Prescrição -->
			<PrescriptionFields
				{targetSets}
				{targetRepsMin}
				{targetRepsMax}
				{restSeconds}
				{prescriptionPreview}
				onchange={(field, value) => {
					if (field === 'targetSets') targetSets = value;
					else if (field === 'targetRepsMin') targetRepsMin = value;
					else if (field === 'targetRepsMax') targetRepsMax = value;
					else if (field === 'restSeconds') restSeconds = value;
				}}
			/>

			<!-- Mídia (imagem ou vídeo) -->
			{#if !selectedExercise}
				<fieldset class="space-y-2 border-0 p-0">
					<legend class="section-label block">
						Mídia <span class="font-normal normal-case text-gym-muted/60">(opcional: imagem ou vídeo MP4)</span>
					</legend>

					{#if mediaPreview}
						<div class="relative w-full h-48 bg-gym-surface rounded-lg overflow-hidden mb-3">
							{#if mediaFile?.type.startsWith('image/')}
								<img src={mediaPreview} alt="Preview da imagem" class="w-full h-full object-cover" />
							{:else if mediaFile?.type === 'video/mp4'}
								<!-- svelte-ignore a11y_media_has_caption -->
								<video src={mediaPreview} controls class="w-full h-full object-cover"></video>
							{/if}
							<button
								type="button"
								class="absolute top-2 right-2 p-1 rounded-lg bg-gym-danger/80 text-white hover:bg-gym-danger"
								onclick={clearMedia}
								aria-label="Remover mídia"
							>
								<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<line x1="18" y1="6" x2="6" y2="18" />
									<line x1="6" y1="6" x2="18" y2="18" />
								</svg>
							</button>
						</div>
					{:else}
						<input
							type="file"
							id="exercise-media-upload"
							accept="image/jpeg,image/png,image/webp,video/mp4"
							onchange={handleMediaChange}
							class="hidden"
							aria-label="Upload de mídia do exercício"
						/>
						<label
							for="exercise-media-upload"
							class="flex items-center justify-center gap-2 h-32 rounded-lg border-2 border-dashed border-gym-muted/30 cursor-pointer hover:border-gym-accent/50 transition-colors"
						>
							<div class="text-center">
								<svg class="h-6 w-6 mx-auto mb-1 text-gym-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="17 8 12 3 7 8" />
									<line x1="12" y1="3" x2="12" y2="15" />
								</svg>
								<p class="text-[13px] font-medium text-gym-text">Clique para enviar</p>
								<p class="text-[12px] text-gym-muted">PNG, JPEG, WebP ou MP4</p>
							</div>
						</label>
					{/if}
				</fieldset>
			{/if}

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
				<ErrorAlert message={saveError} />
			{/if}

			<!-- Submit -->
			<SpinnerButton
				loading={saveState === 'saving'}
				disabled={!canSubmit}
				id="btn-submit-exercicio"
				type="submit"
			>
				<span slot="loading">Salvando...</span>
				<span>Adicionar exercício</span>
			</SpinnerButton>
		</form>
	</div>
{/if}
