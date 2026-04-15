<script lang="ts">
	import type { Split } from '$core/domain/entities/Split';

	interface Props {
		split: Split;
		routineId: string;
		colors: { bg: string; text: string; ring: string };
	}
	const { split, routineId, colors } = $props() as Props;
</script>

<a
	href="/fichas/{routineId}/{split.id}"
	id="split-card-{split.label}"
	class="group card flex w-full items-center gap-4 p-4
		transition-all duration-200
		hover:border-gym-border2 active:scale-[0.99] active:bg-gym-surface2"
	aria-label="Abrir {split.name ?? `Treino ${split.label}`}"
>
	<!-- Badge da letra -->
	<span
		class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl
			ring-1 {colors.bg} {colors.ring} {colors.text}
			text-[22px] font-black transition-transform duration-200
			group-active:scale-95"
		aria-hidden="true"
	>
		{split.label}
	</span>

	<!-- Info do split -->
	<div class="min-w-0 flex-1">
		<p class="truncate text-[17px] font-bold text-gym-text">
			{split.name ?? `Treino ${split.label}`}
		</p>
		<p class="mt-0.5 text-[13px] text-gym-muted">
			{split.exercises.length}
			{split.exercises.length === 1 ? 'exercício' : 'exercícios'}
		</p>
	</div>

	<!-- Chevron -->
	<svg
		class="h-5 w-5 shrink-0 text-gym-muted transition-transform duration-200
			group-hover:translate-x-0.5 group-active:translate-x-1"
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
</a>
