<script lang="ts">
	interface Props {
		loading: boolean;
		disabled?: boolean;
		id?: string;
		type?: 'button' | 'submit' | 'reset';
	}
	const { loading, disabled = false, id, type = 'button' } = $props() as Props;
</script>

<button
	{type}
	{id}
	disabled={loading || disabled}
	class="btn-primary shadow-lg shadow-gym-accent/20"
>
	{#if loading}
		<svg
			class="h-5 w-5 animate-spin"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path
				d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
			/>
		</svg>
		<slot name="loading">Salvando...</slot>
	{:else}
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
			<path d="M20 6L9 17l-5-5" />
		</svg>
		<slot>Confirmar</slot>
	{/if}
</button>
