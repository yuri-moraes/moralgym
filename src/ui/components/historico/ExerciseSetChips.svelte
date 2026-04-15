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

<div class="flex flex-wrap gap-2">
	{#each sets as set (set.setNumber)}
		<div
			class="flex items-center gap-1.5 rounded-xl border border-gym-border
				bg-gym-surface2 px-3 py-2"
		>
			<span class="text-[12px] font-bold text-gym-muted">
				{set.setNumber}.
			</span>
			<span class="text-[13px] font-bold text-gym-text">
				{set.reps} reps
			</span>
			<span class="text-gym-muted text-[12px]">·</span>
			<span class="text-[13px] font-bold text-gym-text">
				{set.loadKg} kg
			</span>
			{#if set.rpe !== undefined}
				<span class="text-gym-muted text-[12px]">·</span>
				<span
					class="text-[12px] font-bold
						{set.rpe >= 9 ? 'text-gym-amber' : 'text-gym-muted'}"
				>
					{set.rpe}
				</span>
			{/if}
		</div>
	{/each}
</div>
