<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// ── Cronômetro de descanso ──────────────────────────────────
	// O SharedWorker/BroadcastChannel dispara mensagens do tipo
	// { type: 'REST_TICK', remaining: number } | { type: 'REST_DONE' }
	// O banner aparece enquanto remaining > 0.
	let restRemaining = $state<number | null>(null);

	$effect(() => {
		if (typeof BroadcastChannel === 'undefined') return;

		const bc = new BroadcastChannel('moralgym_rest_timer');
		bc.addEventListener('message', (e: MessageEvent) => {
			const { type, remaining } = e.data ?? {};
			if (type === 'REST_TICK' && typeof remaining === 'number') {
				restRemaining = remaining;
			} else if (type === 'REST_DONE') {
				restRemaining = null;
			}
		});

		return () => bc.close();
	});

	function formatRest(s: number): string {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
	}

	// ── Bottom Nav ──────────────────────────────────────────────
	const navItems = [
		{ href: '/fichas', label: 'Fichas', icon: 'dumbbell' },
		{ href: '/historico', label: 'Histórico', icon: 'clock' }
	] as const;

	function isActive(href: string, pathname: string): boolean {
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<meta name="theme-color" content="#0B0B0D" />
</svelte:head>

<div class="flex min-h-[100dvh] flex-col bg-[#0B0B0D] text-[#E7E9EA] antialiased">

	<!-- ══ Topbar ══════════════════════════════════════════════════ -->
	<header
		class="sticky top-0 z-30 border-b border-[#2F3336] bg-[#0B0B0D]/85 backdrop-blur-md"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div class="flex h-14 items-center justify-center px-4">
			<span class="text-[15px] font-bold tracking-tight text-[#E7E9EA]">
				Moral<span class="text-[#71767B] font-normal">Gym</span>
			</span>
		</div>
	</header>

	<!-- ══ Banner de descanso (aparece sobre o conteúdo, abaixo do header) ══ -->
	{#if restRemaining !== null}
		<div
			class="sticky top-14 z-20 flex items-center justify-between gap-3
				border-b border-[#2F3336] bg-[#15161A]/95 px-5 py-2.5 backdrop-blur-md"
			role="status"
			aria-live="polite"
			aria-label="Cronômetro de descanso"
		>
			<div class="flex items-center gap-2.5">
				<!-- Ícone de pausa -->
				<svg
					class="h-4 w-4 shrink-0 text-[#71767B]"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 7v5l3 2" />
				</svg>
				<span class="text-xs font-medium text-[#71767B]">Descansando</span>
			</div>

			<!-- Contagem regressiva -->
			<span
				class="font-mono text-lg font-bold tabular-nums leading-none text-[#E7E9EA]"
			>
				{formatRest(restRemaining)}
			</span>

			<!-- Botão pular -->
			<button
				type="button"
				onclick={() => (restRemaining = null)}
				class="rounded-full border border-[#2F3336] px-3 py-1 text-xs font-semibold
					text-[#71767B] transition-colors active:bg-[#2F3336]"
				aria-label="Pular descanso"
			>
				Pular
			</button>
		</div>
	{/if}

	<!-- ══ Conteúdo principal ══════════════════════════════════════ -->
	<main
		class="flex-1 overflow-y-auto"
		style="padding-bottom: calc(env(safe-area-inset-bottom) + 4.5rem);"
	>
		{@render children()}
	</main>

	<!-- ══ Bottom Navigation ════════════════════════════════════════ -->
	<nav
		aria-label="Navegação principal"
		class="fixed inset-x-0 bottom-0 z-30 border-t border-[#2F3336] bg-[#0B0B0D]/90 backdrop-blur-md"
		style="padding-bottom: env(safe-area-inset-bottom);"
	>
		<ul class="mx-auto flex max-w-md items-stretch justify-around">
			{#each navItems as item (item.href)}
				{@const active = isActive(item.href, $page.url.pathname)}
				<li class="flex flex-1">
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="group flex flex-1 flex-col items-center justify-center gap-1
							px-4 py-3 text-[11px] font-semibold tracking-wide transition-colors duration-150
							{active ? 'text-[#E7E9EA]' : 'text-[#71767B]'}"
					>
						{#if item.icon === 'dumbbell'}
							<!-- Ícone de haltere (dumbbell) -->
							<svg
								class="h-6 w-6 transition-transform duration-150 {active ? '' : 'group-active:scale-90'}"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M6.5 6.5v11" />
								<path d="M17.5 6.5v11" />
								<path d="M3 9.5v5" />
								<path d="M21 9.5v5" />
								<path d="M6.5 12h11" />
							</svg>
						{:else}
							<!-- Ícone de relógio -->
							<svg
								class="h-6 w-6 transition-transform duration-150 {active ? '' : 'group-active:scale-90'}"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="9" />
								<path d="M12 7v5l3 2" />
							</svg>
						{/if}

						<span class="leading-none">{item.label}</span>

						<!-- Dot indicador de aba ativa -->
						{#if active}
							<span
								class="absolute bottom-[calc(env(safe-area-inset-bottom)+0.2rem)] h-1 w-1 rounded-full bg-[#E7E9EA]"
								aria-hidden="true"
							></span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>