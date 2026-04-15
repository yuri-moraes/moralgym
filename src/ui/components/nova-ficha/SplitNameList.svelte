<script lang="ts">
	interface SplitInfo {
		label: string;
		index: number;
	}

	interface Props {
		visibleSplits: SplitInfo[];
		names: string[];
		colors: Record<string, string>;
		onchange: (index: number, name: string) => void;
		placeholders: string[];
	}
	const { visibleSplits, names, colors, onchange, placeholders } = $props() as Props;
</script>

<div class="space-y-3">
	<p class="section-label">Nomes dos dias</p>
	<ul class="space-y-2.5">
		{#each visibleSplits as split (split.label)}
			<li class="flex items-center gap-3">
				<span
					class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
						text-[16px] font-black
						{colors[split.label] ?? 'bg-gym-accent/15 text-gym-accent'}"
					aria-hidden="true"
				>
					{split.label}
				</span>
				<input
					type="text"
					maxlength="40"
					autocomplete="off"
					value={names[split.index]}
					oninput={(e) => onchange(split.index, (e.target as HTMLInputElement).value)}
					aria-label={`Nome do dia ${split.label}`}
					placeholder={placeholders[split.index]}
					class="input-base"
				/>
			</li>
		{/each}
	</ul>
</div>
