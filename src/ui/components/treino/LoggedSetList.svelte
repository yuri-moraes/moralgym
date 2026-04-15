<script lang="ts">
	interface SetRow {
		setNumber: number;
		reps: number;
		loadKg: number;
		rpe?: number;
	}

	interface Props {
		sets: SetRow[];
	}
	const { sets } = $props() as Props;
</script>

<div class="space-y-2">
	<p class="section-label">Séries registradas</p>
	<div class="space-y-1.5">
		{#each sets as s (s.setNumber)}
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
				<svg
					class="h-4 w-4 shrink-0 text-gym-success"
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
		{/each}
	</div>
</div>
