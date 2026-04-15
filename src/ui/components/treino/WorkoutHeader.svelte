<script lang="ts">
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	interface Props {
		routine: Routine;
		split: Split;
		totalSetsLogged: number;
		totalSetsTarget: number;
		colors: { bg: string; text: string; ring: string };
	}
	const { routine, split, totalSetsLogged, totalSetsTarget, colors } = $props() as Props;
</script>

<div class="px-5 pt-5 pb-4">
	<a
		href="/fichas"
		class="inline-flex items-center gap-1.5 text-[13px] font-medium text-gym-muted
			transition-colors active:text-gym-text"
	>
		<svg
			class="h-4 w-4"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M15 6l-6 6 6 6" />
		</svg>
		{routine.name}
	</a>

	<div class="mt-3 flex items-center gap-4">
		<!-- Badge colorida da letra -->
		<span
			class="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl
				ring-1 text-[26px] font-black
				{colors.bg} {colors.ring} {colors.text}"
			aria-hidden="true"
		>
			{split.label}
		</span>

		<div class="min-w-0 flex-1">
			<h1 class="truncate text-[22px] font-black text-gym-text">
				{split.name ?? `Treino ${split.label}`}
			</h1>
			<div class="mt-1 flex items-center gap-2 flex-wrap">
				<span class="text-[13px] text-gym-muted">
					{split.exercises.length} exercícios
				</span>
				{#if totalSetsLogged > 0}
					<span class="text-gym-muted">·</span>
					<span class="text-[13px] font-bold text-gym-success">
						{totalSetsLogged}/{totalSetsTarget} séries
					</span>
				{/if}
			</div>
		</div>
	</div>

	<!-- Barra de progresso geral -->
	{#if totalSetsTarget > 0}
		<div class="mt-4 space-y-1.5">
			<div class="h-1.5 w-full overflow-hidden rounded-full bg-gym-border">
				<div
					class="h-full rounded-full bg-gym-accent transition-all duration-500"
					style="width: {Math.min(100, (totalSetsLogged / totalSetsTarget) * 100)}%"
					role="progressbar"
					aria-label="Progresso do treino"
					aria-valuenow={totalSetsLogged}
					aria-valuemax={totalSetsTarget}
				></div>
			</div>
		</div>
	{/if}
</div>
