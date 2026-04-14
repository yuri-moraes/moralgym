<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();

	// Itens da Bottom Navigation. Mantido inline (2 itens) — abstrair em
	// componente só quando crescer para 4+ abas.
	const navItems = [
		{ href: '/fichas', label: 'Fichas', icon: 'dumbbell' },
		{ href: '/historico', label: 'Histórico', icon: 'clock' }
	] as const;

	// "Ativo" cobre tanto a rota exata quanto sub-rotas (ex.: /fichas/123).
	function isActive(href: string, pathname: string): boolean {
		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<svelte:head>
	<meta name="theme-color" content="#0B0B0D" />
</svelte:head>

<div class="flex min-h-[100dvh] flex-col bg-[#0B0B0D] text-gray-100 antialiased">
	<!-- Cabeçalho minimalista — safe-area para notch em iOS standalone. -->
	<header
		class="sticky top-0 z-10 border-b border-white/5 bg-[#0B0B0D]/80 px-5 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 backdrop-blur"
	>
		<h1 class="text-base font-semibold tracking-tight">
			<span class="text-gray-100">Moral</span><span class="text-gray-400">Gym</span>
		</h1>
	</header>

	<!-- Área de conteúdo. pb extra reserva espaço pra nav bar fixa (≈64px + safe-area). -->
	<main class="flex-1 overflow-y-auto px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
		{@render children()}
	</main>

	<!-- Bottom Navigation fixa — altura estável independente do teclado virtual. -->
	<nav
		aria-label="Navegação principal"
		class="fixed inset-x-0 bottom-0 z-20 border-t border-white/5 bg-[#0B0B0D]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
	>
		<ul class="mx-auto flex max-w-md items-stretch justify-around">
			{#each navItems as item (item.href)}
				{@const active = isActive(item.href, $page.url.pathname)}
				<li class="flex-1">
					<a
						href={item.href}
						aria-current={active ? 'page' : undefined}
						class="flex flex-col items-center gap-1 px-4 py-3 text-xs font-medium transition-colors
							{active ? 'text-gray-50' : 'text-gray-500 hover:text-gray-300'}"
					>
						{#if item.icon === 'dumbbell'}
							<svg
								class="h-6 w-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
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
							<svg
								class="h-6 w-6"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.75"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<circle cx="12" cy="12" r="9" />
								<path d="M12 7v5l3 2" />
							</svg>
						{/if}
						<span>{item.label}</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>
