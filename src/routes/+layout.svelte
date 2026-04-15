<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// ── Cronômetro de descanso ──────────────────────────────────
	let restRemaining = $state<number | null>(null);
	let restTotal = $state<number>(0);

	$effect(() => {
		if (typeof BroadcastChannel === 'undefined') return;

		const bc = new BroadcastChannel('moralgym_rest_timer');
		bc.addEventListener('message', (e: MessageEvent) => {
			const { type, remaining, total } = e.data ?? {};
			if (type === 'REST_TICK' && typeof remaining === 'number') {
				restRemaining = remaining;
				if (typeof total === 'number' && total > 0) restTotal = total;
				else if (restTotal === 0) restTotal = remaining;
			} else if (type === 'REST_DONE') {
				restRemaining = null;
				restTotal = 0;
			}
		});

		return () => bc.close();
	});

	function formatRest(s: number): string {
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
	}

	// Progresso do timer para o SVG ring (0..1)
	let restProgress = $derived(
		restTotal > 0 && restRemaining !== null ? restRemaining / restTotal : 0
	);
	// Circunferência do anel SVG (r=10 → c ≈ 62.83)
	const RING_C = 2 * Math.PI * 10;
	let ringDash = $derived(RING_C * restProgress);

	// ── Bottom Nav ──────────────────────────────────────────────
	const navItems = [
		{ href: '/fichas',   label: 'Fichas',   icon: 'dumbbell' },
		{ href: '/historico', label: 'Histórico', icon: 'clock'   }
	] as const;

	function isActive(href: string, pathname: string): boolean {
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<meta name="theme-color" content="#0B0B0D" />
</svelte:head>

<div class="flex min-h-[100dvh] flex-col bg-gym-bg text-gym-text antialiased">

	<!-- ══ Topbar ══════════════════════════════════════════════════ -->
	<header
		class="sticky top-0 z-30 glass border-b border-gym-border"
		style="padding-top: env(safe-area-inset-top);"
	>
		<div class="flex h-14 items-center justify-between px-5">
			<!-- Logo -->
			<div class="flex items-center gap-2.5">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-xl
						bg-gradient-to-br from-gym-accent to-gym-accent-2"
					aria-hidden="true"
				>
					<!-- Haltere minimalista -->
					<svg class="h-4.5 w-4.5 text-white" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
						stroke-linejoin="round">
						<path d="M6.5 6.5v11" />
						<path d="M17.5 6.5v11" />
						<path d="M3 9.5v5" />
						<path d="M21 9.5v5" />
						<path d="M6.5 12h11" />
					</svg>
				</div>
				<span class="text-[16px] font-black tracking-tight text-gym-text">
					Moral<span class="text-gradient">Gym</span>
				</span>
			</div>

			<!-- Slot direito: vazio por ora, futuro: avatar/config -->
			<div class="w-8"></div>
		</div>
	</header>

	<!-- ══ Banner de descanso ══════════════════════════════════════ -->
	{#if restRemaining !== null}
		<div
			class="sticky top-14 z-20 glass border-b border-gym-border
				animate-slide-down"
			role="status"
			aria-live="polite"
			aria-label="Cronômetro de descanso"
		>
			<div class="flex items-center gap-4 px-5 py-3">
				<!-- Anel SVG com progresso -->
				<div class="relative shrink-0">
					<svg class="h-10 w-10 -rotate-90" viewBox="0 0 24 24" aria-hidden="true">
						<!-- Track -->
						<circle
							cx="12" cy="12" r="10"
							fill="none"
							stroke="#26262F"
							stroke-width="2.5"
						/>
						<!-- Progress -->
						<circle
							cx="12" cy="12" r="10"
							fill="none"
							stroke="#7C6FF7"
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-dasharray="{RING_C}"
							stroke-dashoffset="{RING_C - ringDash}"
							style="transition: stroke-dashoffset 0.9s linear;"
						/>
					</svg>
					<!-- Tempo no centro -->
					<span
						class="absolute inset-0 flex items-center justify-center
							font-mono text-[10px] font-black tabular-nums text-gym-text"
					>
						{formatRest(restRemaining)}
					</span>
				</div>

				<!-- Label -->
				<div class="flex-1 min-w-0">
					<p class="text-[12px] font-semibold text-gym-muted uppercase tracking-wide">
						Descansando
					</p>
					<p class="text-[16px] font-black tabular-nums text-gym-text">
						{formatRest(restRemaining)}
					</p>
				</div>

				<!-- Botão pular -->
				<button
					type="button"
					onclick={() => (restRemaining = null)}
					class="flex items-center gap-1.5 rounded-xl border border-gym-border
						bg-gym-surface px-3.5 py-2 text-[13px] font-semibold text-gym-muted
						transition-all active:bg-gym-surface2 active:scale-95"
					aria-label="Pular descanso"
				>
					<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none"
						stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
						stroke-linejoin="round" aria-hidden="true">
						<path d="M5 4l14 8-14 8V4z" />
						<path d="M19 4v16" />
					</svg>
					Pular
				</button>
			</div>
		</div>
	{/if}

	<!-- ══ Conteúdo principal ══════════════════════════════════════ -->
	<main
		class="flex-1 overflow-y-auto"
		style="padding-bottom: calc(env(safe-area-inset-bottom) + 5rem);"
	>
		{@render children()}
	</main>

	<!-- ══ Bottom Navigation ════════════════════════════════════════ -->
	<nav
		aria-label="Navegação principal"
		class="fixed inset-x-0 bottom-0 z-30 glass border-t border-gym-border"
		style="padding-bottom: env(safe-area-inset-bottom);"
	>
		<ul class="mx-auto flex max-w-md items-stretch justify-around">
			{#each navItems as item (item.href)}
				{@const active = isActive(item.href, $page.url.pathname)}
				<li class="flex flex-1">
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="group relative flex flex-1 flex-col items-center justify-center
							gap-1 px-4 py-3 text-[11px] font-bold tracking-wide
							transition-colors duration-150
							{active ? 'text-gym-accent' : 'text-gym-muted'}"
					>
						<!-- Pill indicador ativo -->
						{#if active}
							<span
								class="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2
									rounded-full bg-gym-accent animate-fade-in"
								aria-hidden="true"
							></span>
						{/if}

						{#if item.icon === 'dumbbell'}
							<svg
								class="h-6 w-6 transition-all duration-200
									{active ? 'scale-110' : 'group-active:scale-90'}"
								viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M6.5 6.5v11" />
								<path d="M17.5 6.5v11" />
								<path d="M3 9.5v5" />
								<path d="M21 9.5v5" />
								<path d="M6.5 12h11" />
							</svg>
						{:else}
							<svg
								class="h-6 w-6 transition-all duration-200
									{active ? 'scale-110' : 'group-active:scale-90'}"
								viewBox="0 0 24 24" fill="none" stroke="currentColor"
								stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="9" />
								<path d="M12 7v5l3 2" />
							</svg>
						{/if}

						<span class="leading-none">{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>