<script lang="ts">
	import SetInputRow from './SetInputRow.svelte';
	import RpeChips from './RpeChips.svelte';
	import LoggedSetList from './LoggedSetList.svelte';
	import type { SplitExercise } from '$core/domain/entities/Split';
	import type { Exercise } from '$core/domain/entities/Exercise';

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

	interface Props {
		se: SplitExercise;
		ex?: Exercise;
		ui: ExerciseUIState;
		muscleGroupLabels: Record<string, string>;
		onUpdateUI: (patch: Partial<ExerciseUIState>) => void;
		onUpdateDraft: (patch: Partial<SetDraft>) => void;
		onLogSet: () => void;
		formatRestTime: (seconds: number) => string;
	}
	const { se, ex, ui, muscleGroupLabels, onUpdateUI, onUpdateDraft, onLogSet, formatRestTime } =
		$props() as Props;

	const isDone = $derived(ui.logged.length >= se.targetSets);
</script>

<div
	class="card overflow-hidden transition-all duration-200
		{isDone ? 'border-gym-success/30' : ui.logged.length > 0 ? 'border-gym-accent/30' : ''}"
>
	<!-- Cabeçalho do exercício -->
	<button
		type="button"
		onclick={() => onUpdateUI({ expanded: !ui.expanded })}
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
						{muscleGroupLabels[ex.muscleGroup] ?? ex.muscleGroup}
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
						{isDone ? 'bg-gym-success/15 text-gym-success' : 'bg-gym-accent/15 text-gym-accent'}"
				>
					{ui.logged.length}/{se.targetSets}
				</span>
			{/if}
			<svg
				class="h-5 w-5 text-gym-muted transition-transform duration-200
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

	<!-- Corpo expansível -->
	{#if ui.expanded}
		<div class="border-t border-gym-border px-4 pb-4 pt-3 space-y-4 animate-slide-down">
			<!-- Séries logadas -->
			{#if ui.logged.length > 0}
				<LoggedSetList sets={ui.logged} />
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
						<SetInputRow
							label="Reps"
							value={ui.draft.reps}
							min={1}
							max={999}
							step={1}
							id="reps-{se.id}"
							decrementAriaLabel="Diminuir repetições"
							incrementAriaLabel="Aumentar repetições"
							onchange={(value) => onUpdateDraft({ reps: value })}
							oninput={(value) => onUpdateDraft({ reps: value })}
						/>

						<SetInputRow
							label="Carga (kg)"
							value={ui.draft.loadKg}
							min={0}
							max={999}
							step={2.5}
							id="load-{se.id}"
							decrementAriaLabel="Diminuir carga"
							incrementAriaLabel="Aumentar carga"
							onchange={(value) => onUpdateDraft({ loadKg: value })}
							oninput={(value) => onUpdateDraft({ loadKg: value })}
						/>
					</div>

					<!-- RPE — chips compactos -->
					<RpeChips
						selected={ui.draft.rpe}
						onselect={(rpe) => onUpdateDraft({ rpe })}
					/>

					<!-- Botão confirmar série — grande, fat-finger friendly -->
					<button
						type="button"
						id="btn-log-set-{se.id}"
						onclick={onLogSet}
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
							<svg
								class="h-6 w-6 animate-pop"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M20 6L9 17l-5-5" />
							</svg>
							Série registrada!
						{:else if ui.saving}
							<svg
								class="h-6 w-6 animate-spin"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2.5"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path
									d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
								/>
							</svg>
							Salvando…
						{:else}
							<svg
								class="h-6 w-6"
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
					<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gym-success/20">
						<svg
							class="h-5 w-5 text-gym-success"
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
					<p class="text-[15px] font-bold text-gym-success">
						{se.targetSets} séries concluídas!
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
