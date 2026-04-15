<script lang="ts">
	import ExerciseSetChips from './ExerciseSetChips.svelte';

	interface SetRow {
		setNumber: number;
		reps: number;
		loadKg: number;
		rpe?: number;
	}

	interface ExerciseEntry {
		exerciseName: string;
		muscleGroup: string;
		sets: SetRow[];
	}

	interface DaySession {
		dateKey: string;
		label: string;
		exercises: ExerciseEntry[];
		totalSets: number;
	}

	interface Props {
		session: DaySession;
		muscleColors: Record<string, string>;
		muscleGroupLabels: Record<string, string>;
	}
	const { session, muscleColors, muscleGroupLabels } = $props() as Props;
</script>

<div class="space-y-2 animate-slide-up">
	<!-- Cabeçalho do dia -->
	<div class="flex items-center gap-3">
		<span
			class="rounded-xl px-3 py-1.5 text-[12px] font-black uppercase tracking-wide
				{session.label === 'Hoje'
					? 'bg-gym-accent/15 text-gym-accent'
					: session.label === 'Ontem'
						? 'bg-gym-surface2 border border-gym-border text-gym-muted'
						: 'bg-gym-surface border border-gym-border text-gym-muted/70'}"
		>
			{session.label}
		</span>
		<span class="text-[12px] text-gym-muted">
			{session.totalSets} {session.totalSets === 1 ? 'série' : 'séries'}
		</span>
	</div>

	<!-- Card de exercícios do dia -->
	<div class="card divide-y divide-gym-border overflow-hidden">
		{#each session.exercises as entry (entry.exerciseName)}
			<div class="p-4 space-y-3">
				<!-- Nome + badge muscular -->
				<div class="flex items-start justify-between gap-2">
					<span class="text-[15px] font-bold text-gym-text leading-snug">
						{entry.exerciseName}
					</span>
					<span
						class="shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold
							whitespace-nowrap
							{muscleColors[entry.muscleGroup] ?? 'bg-gym-surface text-gym-muted'}"
					>
						{muscleGroupLabels[entry.muscleGroup] ?? entry.muscleGroup}
					</span>
				</div>

				<!-- Chips de séries -->
				<ExerciseSetChips sets={entry.sets} />
			</div>
		{/each}
	</div>
</div>
