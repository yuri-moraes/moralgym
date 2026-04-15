<script lang="ts">
	import type { Exercise } from '$core/domain/entities/Exercise';

	interface Props {
		allExercises: readonly Exercise[];
		searchQuery: string;
		selectedExercise?: Exercise;
		muscleGroupLabels: Record<string, string>;
		onsearch: (query: string) => void;
		onselect: (exercise: Exercise) => void;
		onclear: () => void;
	}
	const {
		allExercises,
		searchQuery,
		selectedExercise,
		muscleGroupLabels,
		onsearch,
		onselect,
		onclear
	} = $props() as Props;

	const filteredExercises = $derived(
		searchQuery.trim().length < 2
			? []
			: allExercises.filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);
</script>

{#if !selectedExercise}
	<div class="space-y-2">
		<p class="section-label">Buscar no catálogo</p>
		<label
			for="exercise-search"
			class="flex items-center gap-3 rounded-2xl border border-gym-border
				bg-gym-surface px-4 py-3.5 transition-all
				focus-within:border-gym-accent focus-within:ring-2 focus-within:ring-gym-accent/20"
		>
			<svg
				class="h-5 w-5 shrink-0 text-gym-muted"
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
				value={searchQuery}
				oninput={(e) => onsearch((e.target as HTMLInputElement).value)}
				placeholder="Ex.: Supino, Agachamento..."
				class="min-w-0 flex-1 bg-transparent text-[15px] text-gym-text
					placeholder:text-gym-muted/50 outline-none"
			/>
			{#if searchQuery}
				<button
					type="button"
					onclick={() => onsearch('')}
					class="shrink-0 text-gym-muted active:text-gym-text"
					aria-label="Limpar busca"
				>
					<svg
						class="h-4 w-4"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
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
							onclick={() => onselect(ex)}
							class="flex w-full items-center justify-between px-4 py-3.5
								text-left transition-colors active:bg-gym-surface2"
						>
							<span class="text-[15px] font-semibold text-gym-text">{ex.name}</span>
							<span class="muscle-badge ml-3 shrink-0">
								{muscleGroupLabels[ex.muscleGroup]}
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
{:else}
	<div
		class="flex items-center gap-3 rounded-2xl border border-gym-accent/30
			bg-gym-accent/5 px-4 py-3.5 animate-slide-down"
	>
		<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gym-accent/20">
			<svg
				class="h-5 w-5 text-gym-accent"
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
		<div class="min-w-0 flex-1">
			<p class="truncate text-[15px] font-bold text-gym-text">{selectedExercise.name}</p>
			<p class="text-[13px] text-gym-muted">
				{muscleGroupLabels[selectedExercise.muscleGroup]} · do catálogo
			</p>
		</div>
		<button
			type="button"
			onclick={onclear}
			class="shrink-0 flex h-8 w-8 items-center justify-center rounded-xl
				text-gym-muted transition-colors active:bg-gym-surface2"
			aria-label="Remover seleção"
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M18 6L6 18M6 6l12 12" />
			</svg>
		</button>
	</div>
{/if}
