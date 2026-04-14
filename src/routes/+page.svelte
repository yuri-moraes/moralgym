<script lang="ts">
	import { onMount } from 'svelte';
	import { getContainer } from '$lib/container';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	type LoadState = 'idle' | 'loading' | 'ready' | 'error';

	let state = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let splits = $state<readonly Split[]>([]);
	let errorMessage = $state<string | null>(null);

	// Splits ordenados por orderIndex; o repo não promete ordem estável.
	let orderedSplits = $derived(
		[...splits].sort((a, b) => a.orderIndex - b.orderIndex)
	);

	onMount(() => {
		// IIFE async: onMount não pode ser async sem perder a função de cleanup.
		(async () => {
			try {
				const { routines } = getContainer();
				const active = await routines.findActive();
				routine = active;
				splits = active ? await routines.findSplits(active.id) : [];
				state = 'ready';
			} catch (err) {
				console.error('[home] Falha ao carregar rotina ativa', err);
				errorMessage =
					err instanceof Error ? err.message : 'Erro desconhecido ao carregar dados.';
				state = 'error';
			}
		})();
	});
</script>

<svelte:head>
	<title>Fichas · MoralGym</title>
</svelte:head>

{#if state === 'loading'}
	<!-- Skeleton minimalista: evita CLS quando a Routine resolve. -->
	<div class="space-y-4" aria-busy="true" aria-live="polite">
		<div class="h-7 w-2/3 animate-pulse rounded bg-white/5"></div>
		<div class="h-24 animate-pulse rounded-2xl bg-white/5"></div>
		<div class="h-24 animate-pulse rounded-2xl bg-white/5"></div>
	</div>
{:else if state === 'error'}
	<div
		role="alert"
		class="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-sm text-red-200"
	>
		<p class="font-semibold">Não foi possível carregar suas fichas.</p>
		{#if errorMessage}
			<p class="mt-1 text-red-200/80">{errorMessage}</p>
		{/if}
	</div>
{:else if !routine}
	<!-- Empty state convidativo. CTA primário ocupa a largura total no mobile. -->
	<section
		class="flex min-h-[60vh] flex-col items-center justify-center text-center"
	>
		<div
			class="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5"
			aria-hidden="true"
		>
			<svg
				class="h-10 w-10 text-gray-400"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M6.5 6.5v11" />
				<path d="M17.5 6.5v11" />
				<path d="M3 9.5v5" />
				<path d="M21 9.5v5" />
				<path d="M6.5 12h11" />
			</svg>
		</div>

		<h2 class="text-lg font-semibold text-gray-100">
			Nenhuma ficha de treino ativa
		</h2>
		<p class="mt-2 max-w-xs text-sm leading-relaxed text-gray-400">
			Crie sua primeira ficha para começar a registrar treinos. Você pode
			organizar por divisão (A/B/C…) ou treino único.
		</p>

		<a
			href="/fichas/nova"
			class="mt-8 inline-flex w-full max-w-xs items-center justify-center rounded-xl
				bg-gray-100 px-5 py-3 text-sm font-semibold text-[#0B0B0D]
				transition-colors active:bg-gray-300"
		>
			Criar nova ficha
		</a>
	</section>
{:else}
	<section class="space-y-5">
		<header>
			<p class="text-xs font-medium tracking-wide text-gray-500 uppercase">
				Ficha ativa
			</p>
			<h2 class="mt-1 text-xl font-semibold text-gray-100">{routine.name}</h2>
			{#if routine.description}
				<p class="mt-1 text-sm text-gray-400">{routine.description}</p>
			{/if}
		</header>

		{#if orderedSplits.length === 0}
			<p class="rounded-xl border border-white/5 bg-white/[0.02] p-4 text-sm text-gray-400">
				Esta ficha ainda não tem dias de treino cadastrados.
			</p>
		{:else}
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each orderedSplits as split (split.id)}
					<li>
						<a
							href={`/fichas/${routine.id}/${split.id}`}
							class="group flex h-full items-center gap-4 rounded-2xl border border-white/5
								bg-white/[0.02] p-4 transition-colors
								hover:border-white/10 hover:bg-white/[0.04]
								active:bg-white/[0.06]"
						>
							<span
								class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl
									bg-white/5 text-base font-bold text-gray-100"
								aria-hidden="true"
							>
								{split.label}
							</span>

							<span class="flex min-w-0 flex-1 flex-col">
								<span class="truncate text-sm font-semibold text-gray-100">
									{split.name ?? `Treino ${split.label}`}
								</span>
								<span class="mt-0.5 text-xs text-gray-500">
									{split.exercises.length}
									{split.exercises.length === 1 ? 'exercício' : 'exercícios'}
								</span>
							</span>

							<svg
								class="h-5 w-5 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M9 6l6 6-6 6" />
							</svg>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}
