<script lang="ts">
	interface Props {
		message: string;
		detail?: string;
	}
	const { message, detail } = $props() as Props;
</script>

<div class="px-5 pt-6 animate-slide-up">
	<div
		role="alert"
		class="rounded-2xl border border-gym-danger/20 bg-gym-danger/5 p-5 text-sm text-red-300"
	>
		<p class="font-semibold">{message}</p>
		{#if detail}
			<p class="mt-1 text-red-300/70">{detail}</p>
		{/if}
	</div>
</div>
