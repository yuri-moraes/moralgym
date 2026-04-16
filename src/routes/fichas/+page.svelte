<script lang="ts">
	import { onMount } from 'svelte';
	import { getContainer } from '$lib/container';
	import PageLoadingSkeleton from '$ui/components/shared/PageLoadingSkeleton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import EmptyState from '$ui/components/shared/EmptyState.svelte';
	import ConfirmDialog from '$ui/components/shared/ConfirmDialog.svelte';
	import RoutineHeader from '$ui/components/fichas/RoutineHeader.svelte';
	import SplitCard from '$ui/components/fichas/SplitCard.svelte';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	type LoadState = 'loading' | 'ready' | 'error';

	let state = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let splits = $state<readonly Split[]>([]);
	let errorMessage = $state<string | null>(null);
	let showDeleteDialog = $state(false);
	let deleteLoading = $state(false);

	let orderedSplits = $derived(
		[...splits].sort((a, b) => a.orderIndex - b.orderIndex)
	);

	// Cor do badge por letra de split
	const SPLIT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
		A: { bg: 'bg-blue-500/15',   text: 'text-blue-400',   ring: 'ring-blue-500/30'   },
		B: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
		C: { bg: 'bg-violet-500/15',  text: 'text-violet-400',  ring: 'ring-violet-500/30'  },
		D: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   ring: 'ring-amber-500/30'   },
		E: { bg: 'bg-rose-500/15',    text: 'text-rose-400',    ring: 'ring-rose-500/30'    },
	};

	function splitColor(label: string) {
		return SPLIT_COLORS[label] ?? { bg: 'bg-gym-accent/15', text: 'text-gym-accent', ring: 'ring-gym-accent/30' };
	}

	onMount(() => {
		(async () => {
			try {
				const { routines } = getContainer();
				const active = await routines.findActive();
				routine = active;
				splits = active ? await routines.findSplits(active.id) : [];
				state = 'ready';
			} catch (err) {
				console.error('[fichas] Falha ao carregar rotina ativa', err);
				errorMessage = err instanceof Error ? err.message : 'Erro desconhecido.';
				state = 'error';
			}
		})();
	});

	function handleDelete(routineToDelete: Routine) {
		routine = routineToDelete;
		showDeleteDialog = true;
	}

	async function confirmDelete() {
		if (!routine) return;

		deleteLoading = true;
		try {
			const { deleteRoutine } = getContainer();
			await deleteRoutine.execute({ routineId: routine.id });

			// Recarregar fichas após deleção
			const { routines } = getContainer();
			const active = await routines.findActive();
			routine = active;
			splits = active ? await routines.findSplits(active.id) : [];
			showDeleteDialog = false;
		} catch (err) {
			console.error('[fichas] Falha ao deletar', err);
			errorMessage = err instanceof Error ? err.message : 'Erro ao deletar ficha.';
		} finally {
			deleteLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Fichas · MoralGym</title>
</svelte:head>

{#if state === 'loading'}
	<PageLoadingSkeleton />

{:else if state === 'error'}
	<ErrorAlert message="Não foi possível carregar suas fichas." detail={errorMessage} />

{:else if !routine}
	<EmptyState
		title="Crie sua primeira ficha"
		description="Organize seus treinos por divisão — A/B, Push/Pull/Legs ou o que funcionar para você."
		ctaHref="/fichas/nova"
		ctaLabel="Criar ficha"
	>
		<svg
			class="h-14 w-14 text-gym-accent"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			slot="icon"
		>
			<path d="M6.5 6.5v11" />
			<path d="M17.5 6.5v11" />
			<path d="M3 9.5v5" />
			<path d="M21 9.5v5" />
			<path d="M6.5 12h11" />
		</svg>
	</EmptyState>

{:else}
	<div class="animate-fade-in">
		<RoutineHeader {routine} {splits} onDelete={handleDelete} />

		<!-- Lista de splits ───────────────────────────── -->
		{#if orderedSplits.length === 0}
			<div class="px-5 py-10 text-center">
				<p class="text-[14px] text-gym-muted">
					Esta ficha ainda não tem dias de treino.
				</p>
			</div>
		{:else}
			<div class="space-y-2 px-4">
				{#each orderedSplits as split (split.id)}
					<SplitCard
						{split}
						routineId={routine.id}
						colors={splitColor(split.label)}
					/>
				{/each}
			</div>
		{/if}

		<!-- CTA nova ficha -->
		<div class="px-4 py-5 mt-2">
			<a
				href="/fichas/nova"
				class="btn-ghost w-full"
				id="btn-nova-ficha-bottom"
			>
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M12 5v14M5 12h14" />
				</svg>
				Nova ficha
			</a>
		</div>

		<!-- Diálogo de confirmação de deleção -->
		<ConfirmDialog
			isOpen={showDeleteDialog}
			title="Deletar ficha?"
			message="Esta ação é irreversível. Todos os dados da ficha e seus treinos serão removidos."
			confirmText="Deletar"
			cancelText="Cancelar"
			isDangerous
			loading={deleteLoading}
			onConfirm={confirmDelete}
			onCancel={() => (showDeleteDialog = false)}
		/>
	</div>
{/if}