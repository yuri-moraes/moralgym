<script lang="ts">
	interface Props {
		title: string;
		description: string;
		ctaHref?: string;
		ctaLabel?: string;
	}
	const { title, description, ctaHref, ctaLabel = 'Ir para Fichas' } = $props() as Props;
</script>

<section
	class="flex min-h-[75vh] flex-col items-center justify-center px-8 text-center animate-fade-in"
	aria-label={title}
>
	<!-- Icon slot -->
	<div class="relative mb-8" aria-hidden="true">
		<div class="absolute inset-0 rounded-full bg-gym-accent/10 blur-xl scale-125"></div>
		<div
			class="relative flex h-28 w-28 items-center justify-center rounded-full
				bg-gradient-to-br from-gym-accent/20 to-gym-accent-2/10
				border border-gym-accent/20 ring-1 ring-gym-accent/10"
		>
			<slot name="icon">
				<svg
					class="h-14 w-14 text-gym-accent"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="9" />
					<path d="M12 7v5l3 2" />
				</svg>
			</slot>
		</div>
	</div>

	<h1 class="text-[26px] font-black text-gym-text">
		{title}
	</h1>
	<p class="mt-3 max-w-xs text-[15px] leading-relaxed text-gym-muted">
		{description}
	</p>

	{#if ctaHref}
		<a
			href={ctaHref}
			class="mt-8 inline-flex items-center justify-center gap-2.5 rounded-2xl
				bg-gym-accent px-8 py-4 text-[16px] font-bold text-white
				transition-all duration-150 active:scale-[0.97] active:brightness-90
				shadow-lg shadow-gym-accent/25"
		>
			<svg
				class="h-5 w-5"
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
			{ctaLabel}
		</a>
	{/if}
</section>
