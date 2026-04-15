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
	<div class="divide-y divide-[#2F3336]" aria-busy="true" aria-live="polite">
		<!-- "Ficha ativa" header skeleton -->
		<div class="px-4 py-4">
			<div class="h-3.5 w-20 animate-pulse rounded-full bg-[#2F3336]"></div>
			<div class="mt-2 h-5 w-44 animate-pulse rounded-full bg-[#2F3336]"></div>
		</div>
		<!-- Split skeletons -->
		{#each [0, 1, 2] as _}
			<div class="flex items-center gap-4 px-4 py-4">
				<div class="h-12 w-12 shrink-0 animate-pulse rounded-2xl bg-[#2F3336]"></div>
				<div class="flex-1 space-y-2">
					<div class="h-4 w-32 animate-pulse rounded-full bg-[#2F3336]"></div>
					<div class="h-3 w-20 animate-pulse rounded-full bg-[#2F3336]"></div>
				</div>
			</div>
		{/each}
	</div>

{:else if state === 'error'}
	<div class="px-4 pt-6">
		<div
			role="alert"
			class="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-300"
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
		class="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center"
		aria-label="Nenhuma ficha cadastrada"
	>
		<!-- Ícone de halter estilizado -->
		<div
			class="mb-8 flex h-24 w-24 items-center justify-center rounded-full
				border border-[#2F3336] bg-[#15161A]"
			aria-hidden="true"
		>
			<svg
				class="h-12 w-12 text-[#71767B]"
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

		<h2 class="text-[22px] font-bold text-[#E7E9EA]">
			Crie sua primeira ficha
		</h2>
		<p class="mt-3 max-w-xs text-[15px] leading-relaxed text-[#71767B]">
			Organize seus treinos por divisão — A/B, Push/Pull/Legs ou o que funcionar para você.
		</p>

		<a
			href="/fichas/nova"
			class="mt-8 inline-flex items-center justify-center rounded-full
				bg-[#E7E9EA] px-8 py-3.5 text-[15px] font-bold text-[#0B0B0D]
				transition-all duration-150 active:scale-95 active:bg-white"
		>
			Criar ficha
		</a>
	</section>

{:else}
	<!-- ── Feed de Fichas ──────────────────────────────────────── -->
	<div class="divide-y divide-[#2F3336]">

		<!-- Cabeçalho da ficha ativa -->
		<div class="flex items-start justify-between px-4 py-4">
			<div class="min-w-0 flex-1">
				<p class="text-[13px] font-medium text-[#71767B]">Ficha ativa</p>
				<h2 class="mt-0.5 truncate text-[20px] font-bold text-[#E7E9EA]">
					{routine.name}
				</h2>
				{#if routine.description}
					<p class="mt-1 line-clamp-2 text-[14px] leading-relaxed text-[#71767B]">
						{routine.description}
					</p>
				{/if}
			</div>

			<!-- Botão "Nova ficha" compacto no canto -->
			<a
				href="/fichas/nova"
				class="ml-4 shrink-0 rounded-full border border-[#2F3336] px-4 py-2
					text-[13px] font-bold text-[#E7E9EA] transition-colors
					active:bg-[#2F3336]"
				aria-label="Criar nova ficha"
			>
				+ Nova
			</a>
		</div>

		<!-- Lista de splits estilo "posts" do X ───────────────── -->
		{#if orderedSplits.length === 0}
			<div class="px-4 py-8 text-center">
				<p class="text-[14px] text-[#71767B]">
					Esta ficha ainda não tem dias de treino.
				</p>
			</div>
		{:else}
			{#each orderedSplits as split (split.id)}
				<a
					href="/fichas/{routine.id}/{split.id}"
					class="group flex w-full items-center gap-4 px-4 py-4
						transition-colors duration-150 hover:bg-[#15161A]/60
						active:bg-[#15161A]"
					aria-label="Abrir {split.name ?? `Treino ${split.label}`}"
				>
					<!-- Badge da letra do split -->
					<span
						class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
							bg-[#15161A] border border-[#2F3336]
							text-[16px] font-black text-[#E7E9EA]"
						aria-hidden="true"
					>
						{split.label}
					</span>

					<!-- Dados do split -->
					<div class="min-w-0 flex-1">
						<p class="truncate text-[16px] font-bold text-[#E7E9EA]">
							{split.name ?? `Treino ${split.label}`}
						</p>
						<p class="mt-0.5 text-[13px] text-[#71767B]">
							{split.exercises.length}
							{split.exercises.length === 1 ? 'exercício' : 'exercícios'}
						</p>
					</div>

					<!-- Chevron -->
					<svg
						class="h-5 w-5 shrink-0 text-[#71767B] transition-transform duration-150
							group-hover:translate-x-0.5"
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
			{/each}
		{/if}

		<!-- Rodapé com CTA de nova ficha (quando já tem uma ativa) -->
		<div class="px-4 py-5">
			<a
				href="/fichas/nova"
				class="flex items-center justify-center gap-2 rounded-full
					border border-[#2F3336] py-3.5 text-[15px] font-bold text-[#E7E9EA]
					transition-colors active:bg-[#15161A]"
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
	</div>
{/if}