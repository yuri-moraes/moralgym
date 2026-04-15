<script lang="ts">
	interface Props {
		href: string;
		label?: string;
	}
	const { href, label = 'Voltar' } = $props() as Props;
</script>

<a
	{href}
	class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
		border border-gym-border bg-gym-surface text-gym-muted
		transition-all active:bg-gym-surface2 active:scale-95"
	aria-label={label}
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
		<path d="M15 6l-6 6 6 6" />
	</svg>
</a>
