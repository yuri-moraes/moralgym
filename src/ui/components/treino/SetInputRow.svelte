<script lang="ts">
	interface Props {
		label: string;
		value: number;
		min?: number;
		max?: number;
		step?: number;
		id: string;
		decrementAriaLabel?: string;
		incrementAriaLabel?: string;
		onchange: (value: number) => void;
		oninput?: (value: number) => void;
	}
	const {
		label,
		value,
		min = 0,
		max = 999,
		step = 1,
		id,
		decrementAriaLabel = 'Diminuir',
		incrementAriaLabel = 'Aumentar',
		onchange,
		oninput
	} = $props() as Props;

	function handleDecrement() {
		const newValue = Math.max(min, value - step);
		onchange(newValue);
	}

	function handleIncrement() {
		const newValue = value + step;
		if (max !== undefined) {
			onchange(Math.min(max, newValue));
		} else {
			onchange(newValue);
		}
	}

	function handleInput(e: Event) {
		const newValue = Number((e.target as HTMLInputElement).value);
		if (oninput) oninput(newValue);
		else onchange(newValue);
	}
</script>

<div class="space-y-2">
	<label for={id} class="section-label block">
		{label}
	</label>
	<div
		class="flex items-center overflow-hidden rounded-2xl
			border border-gym-border bg-gym-bg"
	>
		<button
			type="button"
			onclick={handleDecrement}
			class="flex h-10 w-10 shrink-0 items-center justify-center
				text-[20px] font-bold text-gym-muted
				transition-colors active:bg-gym-surface2"
			aria-label={decrementAriaLabel}
		>
			−
		</button>
		<input
			{id}
			type="number"
			{min}
			{max}
			{value}
			oninput={handleInput}
			class="flex-1 min-w-0 bg-transparent text-center text-[18px] font-black
				text-gym-text outline-none tabular-nums"
			aria-label={label}
		/>
		<button
			type="button"
			onclick={handleIncrement}
			class="flex h-10 w-10 shrink-0 items-center justify-center
				text-[20px] font-bold text-gym-muted
				transition-colors active:bg-gym-surface2"
			aria-label={incrementAriaLabel}
		>
			+
		</button>
	</div>
</div>
