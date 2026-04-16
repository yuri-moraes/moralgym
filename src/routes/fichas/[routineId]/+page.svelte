<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
	import PageLoadingSkeleton from '$ui/components/shared/PageLoadingSkeleton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import ConfirmDialog from '$ui/components/shared/ConfirmDialog.svelte';
	import BackButton from '$ui/components/shared/BackButton.svelte';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	type LoadState = 'loading' | 'ready' | 'not-found' | 'error';

	const SPLIT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
		A: { bg: 'bg-blue-500/15', text: 'text-blue-400', ring: 'ring-blue-500/30' },
		B: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
		C: { bg: 'bg-violet-500/15', text: 'text-violet-400', ring: 'ring-violet-500/30' },
		D: { bg: 'bg-amber-500/15', text: 'text-amber-400', ring: 'ring-amber-500/30' },
		E: { bg: 'bg-rose-500/15', text: 'text-rose-400', ring: 'ring-rose-500/30' }
	};

	function splitColor(label: string) {
		return SPLIT_COLORS[label] ?? { bg: 'bg-gym-accent/15', text: 'text-gym-accent', ring: 'ring-gym-accent/30' };
	}

	let loadState = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let splits = $state<readonly Split[]>([]);
	let errorMessage = $state<string | null>(null);
	let showDeleteDialog = $state(false);
	let deleteLoading = $state(false);

	let orderedSplits = $derived([...splits].sort((a, b) => a.orderIndex - b.orderIndex));

	onMount(() => {
		const { routineId } = $page.params;
		(async () => {
			try {
				const { routines } = getContainer();
				const foundRoutine = await routines.findById(routineId);
				if (!foundRoutine) {
					loadState = 'not-found';
					return;
				}

				const foundSplits = await routines.findSplits(routineId);
				routine = foundRoutine;
				splits = foundSplits;
				loadState = 'ready';
			} catch (err) {
				console.error('[fichas/[routineId]] Falha ao carregar', err);
				errorMessage = err instanceof Error ? err.message : 'Erro desconhecido.';
				loadState = 'error';
			}
		})();
	});

	async function confirmDelete() {
		if (!routine) return;

		deleteLoading = true;
		try {
			const { deleteRoutine } = getContainer();
			await deleteRoutine.execute({ routineId: routine.id });
			await goto('/fichas', { replaceState: true });
		} catch (err) {
			console.error('[fichas/[routineId]] Falha ao deletar', err);
			errorMessage = err instanceof Error ? err.message : 'Erro ao deletar ficha.';
		} finally {
			deleteLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{routine?.name ?? 'Ficha'} · MoralGym</title>
</svelte:head>

{#if loadState === 'loading'}
	<PageLoadingSkeleton rows={3} />

{:else if loadState === 'error'}
	<ErrorAlert message="Não foi possível carregar esta ficha." detail={errorMessage} />

{:else if loadState === 'not-found' || !routine}
	<section class="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center animate-fade-in">
		<h2 class="text-[20px] font-bold text-gym-text">Ficha não encontrada</h2>
		<p class="mt-2 max-w-xs text-[14px] text-gym-muted">O link pode estar incorreto ou a ficha foi removida.</p>
		<a href="/fichas" class="mt-6 btn-ghost">Voltar para Fichas</a>
	</section>

{:else}
	<div class="animate-slide-up">
		<!-- ── Header ───────────────────────────────────────────── -->
		<div class="flex items-center gap-3 px-5 pt-5 pb-2">
			<BackButton href="/fichas" label="Voltar para fichas" />
			<div class="min-w-0 flex-1">
				<p class="section-label truncate">Ficha ativa</p>
				<h1 class="text-[20px] font-black text-gym-text">{routine.name}</h1>
			</div>
		</div>

		{#if routine.description}
			<p class="px-5 text-[14px] text-gym-muted">{routine.description}</p>
		{/if}

		<!-- ── Ações ────────────────────────────────────────────── -->
		<div class="flex gap-2 px-5 pt-3 pb-4">
			<a
				href="/fichas/{routine.id}/editar"
				class="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-gym-surface border border-gym-border text-gym-text font-medium text-[14px] hover:bg-gym-surface2"
			>
				<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
					<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
				</svg>
				Editar
			</a>
			<button
				class="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-gym-danger/10 border border-gym-danger/30 text-gym-danger font-medium text-[14px] hover:bg-gym-danger/20"
				onclick={() => (showDeleteDialog = true)}
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

		<!-- ── Splits ───────────────────────────────────────────── -->
		<div class="px-5 py-3">
			<p class="section-label mb-3">Treinos ({orderedSplits.length})</p>

			{#if orderedSplits.length === 0}
				<div class="text-center py-8">
					<p class="text-[14px] text-gym-muted">Esta ficha ainda não tem dias de treino.</p>
				</div>
			{:else}
				<div class="space-y-2">
					{#each orderedSplits as split (split.id)}
						<a
							href="/fichas/{routine.id}/{split.id}"
							class="flex items-center gap-3 p-4 rounded-lg bg-gym-surface border border-gym-border hover:border-gym-accent/50 transition-colors active:bg-gym-surface2"
						>
							<!-- Badge do split -->
							<div
								class={`flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg font-bold text-[16px] ${
									split.label === 'A' ? 'bg-blue-500/20 text-blue-400' :
									split.label === 'B' ? 'bg-emerald-500/20 text-emerald-400' :
									split.label === 'C' ? 'bg-violet-500/20 text-violet-400' :
									split.label === 'D' ? 'bg-amber-500/20 text-amber-400' :
									split.label === 'E' ? 'bg-rose-500/20 text-rose-400' :
									'bg-gym-accent/20 text-gym-accent'
								}`}
							>
								{split.label}
							</div>

							<!-- Info do split -->
							<div class="min-w-0 flex-1">
								<p class="text-[16px] font-bold text-gym-text">
									{split.name || `Treino ${split.label}`}
								</p>
								<p class="text-[13px] text-gym-muted">
									{split.exercises.length} {split.exercises.length === 1 ? 'exercício' : 'exercícios'}
								</p>
							</div>

							<!-- Chevron -->
							<svg
								class="h-5 w-5 text-gym-muted flex-shrink-0"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								aria-hidden="true"
							>
								<path d="M9 5l7 7-7 7" />
							</svg>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		<!-- ── CTA para novo split (se houver espaço) -->
		{#if orderedSplits.length < 5}
			<div class="px-5 pb-4">
				<a
					href="/fichas/nova"
					class="btn-ghost w-full"
					id="btn-nova-ficha"
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
					Criar nova ficha
				</a>
			</div>
		{/if}
	</div>

	<!-- ── Diálogo de confirmação de deleção ──────────────────────────── -->
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
{/if}
