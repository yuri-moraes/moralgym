<script lang="ts">
	import type { SplitCount } from '$core/domain/entities/Routine';

	interface Props {
		value: SplitCount;
		labels: string[];
		colors: Record<string, string>;
		onchange: (count: SplitCount) => void;
	}
	const { value, labels, colors, onchange } = $props() as Props;

	const SPLIT_OPTIONS: readonly SplitCount[] = [1, 2, 3, 4, 5];
</script>

<fieldset class="space-y-3">
	<legend class="section-label">Divisão</legend>

	<div class="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Número de divisões">
		{#each SPLIT_OPTIONS as option (option)}
			<button
				type="button"
				role="radio"
				aria-checked={value === option}
				onclick={() => onchange(option)}
				class="flex flex-col items-center justify-center rounded-2xl border py-3
					text-[12px] font-bold transition-all duration-150
					{value === option
						? 'border-gym-accent bg-gym-accent/15 text-gym-accent ring-1 ring-gym-accent/30'
						: 'border-gym-border bg-gym-surface text-gym-muted active:bg-gym-surface2'}"
			>
				<span class="text-[18px] font-black leading-none">
					{option}
				</span>
				<span class="mt-0.5 opacity-70">
					{option === 1 ? 'dia' : 'dias'}
				</span>
			</button>
		{/each}
	</div>

	<!-- Preview das letras que serão criadas -->
	<div class="flex items-center gap-1.5 flex-wrap">
		{#each Array(value) as _, i}
			{@const letter = labels[i]}
			<span
				class="rounded-lg px-2 py-1 text-[12px] font-bold
					animate-fade-in {colors[letter] ?? 'bg-gym-accent/15 text-gym-accent'}"
			>
				{letter}
			</span>
		{/each}
	</div>
</fieldset>
