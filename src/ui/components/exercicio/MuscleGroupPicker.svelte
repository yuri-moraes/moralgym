<script lang="ts">
	import type { MuscleGroup } from '$core/domain/value-objects/MuscleGroup';

	interface Props {
		selected: MuscleGroup;
		groups: readonly MuscleGroup[];
		labels: Record<MuscleGroup, string>;
		onchange: (group: MuscleGroup) => void;
	}
	const { selected, groups, labels, onchange } = $props() as Props;
</script>

<div class="space-y-2">
	<p class="section-label">Grupo muscular</p>
	<div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
		{#each groups as group (group)}
			<button
				type="button"
				onclick={() => onchange(group)}
				class="shrink-0 rounded-xl border px-3.5 py-2.5 text-[13px] font-bold
					transition-all active:scale-95 whitespace-nowrap
					{selected === group
						? 'border-gym-accent bg-gym-accent/15 text-gym-accent'
						: 'border-gym-border bg-gym-surface text-gym-muted active:bg-gym-surface2'}"
			>
				{labels[group]}
			</button>
		{/each}
	</div>
</div>
