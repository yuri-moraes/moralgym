<script lang="ts">
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	interface Props {
		routine: Routine;
		splits: readonly Split[];
		onEdit?: (routine: Routine) => void;
		onDelete?: (routine: Routine) => void;
	}
	const { routine, splits, onEdit, onDelete } = $props() as Props;

	let showMenu = $state(false);
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

		<!-- Menu dropdown -->
		<div class="shrink-0 relative">
			<button
				class="flex items-center justify-center h-10 w-10 rounded-lg border border-gym-border
					bg-gym-surface text-gym-text transition-colors hover:bg-gym-surface2"
				aria-label="Opções da ficha"
				onclick={() => (showMenu = !showMenu)}
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
				>
					<circle cx="12" cy="5" r="2" />
					<circle cx="12" cy="12" r="2" />
					<circle cx="12" cy="19" r="2" />
				</svg>
			</button>

			{#if showMenu}
				<div
					class="absolute right-0 mt-2 w-48 rounded-lg border border-gym-border bg-gym-surface shadow-lg z-10 animate-fade-in"
					role="menu"
				>
					<a
						href="/fichas/{routine.id}/editar"
						class="flex items-center gap-3 px-4 py-3 text-[14px] text-gym-text hover:bg-gym-surface2 border-b border-gym-border/50"
						onclick={() => (showMenu = false)}
						role="menuitem"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
						</svg>
						Editar
					</a>
					<button
						class="w-full flex items-center gap-3 px-4 py-3 text-[14px] text-gym-danger hover:bg-gym-danger/10 text-left"
						onclick={() => {
							showMenu = false;
							onDelete?.(routine);
						}}
						role="menuitem"
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="3 6 5 6 21 6" />
							<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
							<line x1="10" y1="11" x2="10" y2="17" />
							<line x1="14" y1="11" x2="14" y2="17" />
						</svg>
						Deletar
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
