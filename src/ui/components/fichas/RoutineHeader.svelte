<script lang="ts">
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	interface Props {
		routine: Routine;
		splits: readonly Split[];
	}
	const { routine, splits } = $props() as Props;
</script>

<div class="px-5 pt-5 pb-4">
	<p class="section-label mb-1">Ficha ativa</p>
	<div class="flex items-start justify-between gap-3">
		<div class="min-w-0 flex-1 overflow-hidden">
			<h1 class="truncate text-[24px] font-black text-gym-text leading-tight">
				{routine.name}
			</h1>
			{#if routine.description}
				<p class="mt-1 text-[14px] leading-relaxed text-gym-muted break-words">
					{routine.description}
				</p>
			{/if}
			<p class="mt-1.5 text-[13px] text-gym-muted">
				{splits.length} {splits.length === 1 ? 'divisão' : 'divisões'}
			</p>
		</div>

		<!-- Botão nova ficha compacto -->
		<a
			href="/fichas/nova"
			id="btn-nova-ficha"
			class="shrink-0 flex items-center gap-1.5 rounded-xl border border-gym-border
				bg-gym-surface px-4 py-2.5 text-[13px] font-bold text-gym-text
				transition-all active:bg-gym-surface2 active:scale-95"
			aria-label="Criar nova ficha"
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M12 5v14M5 12h14" />
			</svg>
			Nova
		</a>
	</div>
</div>
