<script lang="ts">
	interface Props {
		selected?: number;
		onselect: (rpe: number | undefined) => void;
	}
	const { selected, onselect } = $props() as Props;

	function toggleRpe(rpe: number) {
		onselect(selected === rpe ? undefined : rpe);
	}
</script>

<div class="space-y-2">
	<p class="section-label">
		RPE <span class="font-normal normal-case text-gym-muted/50">(opcional)</span>
	</p>
	<div class="flex gap-1.5">
		{#each [6, 7, 8, 9, 10] as rpeVal (rpeVal)}
			<button
				type="button"
				onclick={() => toggleRpe(rpeVal)}
				class="flex-1 rounded-xl border py-2 text-[13px] font-black
					transition-all active:scale-95
					{selected === rpeVal
						? rpeVal >= 9
							? 'border-gym-amber bg-gym-amber/20 text-gym-amber'
							: 'border-gym-accent bg-gym-accent/20 text-gym-accent'
						: 'border-gym-border bg-gym-bg text-gym-muted active:bg-gym-surface'}"
				aria-pressed={selected === rpeVal}
				aria-label="RPE {rpeVal}"
			>
				{rpeVal}
			</button>
		{/each}
	</div>
</div>
