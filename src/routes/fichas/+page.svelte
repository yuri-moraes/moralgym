<script lang="ts">
	import { onMount } from 'svelte';
	import { getContainer } from '$lib/container';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	type LoadState = 'loading' | 'ready' | 'error';

	let state = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let splits = $state<readonly Split[]>([]);
	let errorMessage = $state<string | null>(null);

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
</script>

<svelte:head>
	<title>Fichas · MoralGym</title>
</svelte:head>

{#if state === 'loading'}
	<!-- ── Skeleton ───────────────────────────────────────────── -->
	<div class="space-y-1" aria-busy="true" aria-live="polite">
		<!-- Header skeleton -->
		<div class="px-5 pt-5 pb-4">
			<div class="skeleton h-3 w-20 mb-2"></div>
			<div class="skeleton h-7 w-48"></div>
		</div>
		<!-- Split skeletons -->
		{#each [0, 1, 2, 3] as _}
			<div class="mx-4 mb-2">
				<div class="card flex items-center gap-4 p-4">
					<div class="skeleton h-14 w-14 shrink-0 rounded-2xl"></div>
					<div class="flex-1 space-y-2">
						<div class="skeleton h-4 w-36"></div>
						<div class="skeleton h-3 w-24"></div>
					</div>
					<div class="skeleton h-6 w-6 rounded-full"></div>
				</div>
			</div>
		{/each}
	</div>

{:else if state === 'error'}
	<div class="px-5 pt-6 animate-slide-up">
		<div
			role="alert"
			class="rounded-2xl border border-gym-danger/20 bg-gym-danger/5 p-5 text-sm text-red-300"
		>
			<p class="font-semibold">Não foi possível carregar suas fichas.</p>
			{#if errorMessage}
				<p class="mt-1 text-red-300/70">{errorMessage}</p>
			{/if}
		</div>
	</div>

{:else if !routine}
	<!-- ── Empty State ─────────────────────────────────────────── -->
	<section
		class="flex min-h-[75vh] flex-col items-center justify-center px-8 text-center animate-fade-in"
		aria-label="Nenhuma ficha cadastrada"
	>
		<!-- Ilustração -->
		<div class="relative mb-8" aria-hidden="true">
			<!-- Anel de fundo pulsante -->
			<div
				class="absolute inset-0 rounded-full bg-gym-accent/10 blur-xl scale-125"
			></div>
			<div
				class="relative flex h-28 w-28 items-center justify-center rounded-full
					bg-gradient-to-br from-gym-accent/20 to-gym-accent-2/10
					border border-gym-accent/20 ring-1 ring-gym-accent/10"
			>
				<svg class="h-14 w-14 text-gym-accent" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
					stroke-linejoin="round">
					<path d="M6.5 6.5v11" />
					<path d="M17.5 6.5v11" />
					<path d="M3 9.5v5" />
					<path d="M21 9.5v5" />
					<path d="M6.5 12h11" />
				</svg>
			</div>
		</div>

		<h1 class="text-[26px] font-black text-gym-text">
			Crie sua primeira ficha
		</h1>
		<p class="mt-3 max-w-xs text-[15px] leading-relaxed text-gym-muted">
			Organize seus treinos por divisão — A/B, Push/Pull/Legs ou o que funcionar para você.
		</p>

		<a
			href="/fichas/nova"
			id="btn-criar-ficha-empty"
			class="mt-8 inline-flex items-center justify-center gap-2.5 rounded-2xl
				bg-gym-accent px-8 py-4 text-[16px] font-bold text-white
				transition-all duration-150 active:scale-[0.97] active:brightness-90
				shadow-lg shadow-gym-accent/25"
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M12 5v14M5 12h14" />
			</svg>
			Criar ficha
		</a>
	</section>

{:else}
	<!-- ── Feed de Fichas ──────────────────────────────────────── -->
	<div class="animate-fade-in">

		<!-- Cabeçalho da ficha ativa -->
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
					<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M12 5v14M5 12h14" />
					</svg>
					Nova
				</a>
			</div>
		</div>

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
					{@const colors = splitColor(split.label)}
					<a
						href="/fichas/{routine.id}/{split.id}"
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
							viewBox="0 0 24 24" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M9 6l6 6-6 6" />
						</svg>
					</a>
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
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M12 5v14M5 12h14" />
				</svg>
				Nova ficha
			</a>
		</div>
	</div>
{/if}