<script lang="ts">
	interface Props {
		isOpen?: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		isDangerous?: boolean;
		loading?: boolean;
		onConfirm?: () => void;
		onCancel?: () => void;
	}

	let {
		isOpen = false,
		title = 'Confirmar',
		message = 'Tem certeza?',
		confirmText = 'Confirmar',
		cancelText = 'Cancelar',
		isDangerous = false,
		loading = false,
		onConfirm,
		onCancel
	}: Props = $props();
</script>

{#if isOpen}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in p-4">
		<div class="w-full max-w-sm rounded-2xl bg-gym-surface border border-gym-accent/20 p-6 animate-scale-in shadow-2xl">
			<h2 class="text-[18px] font-bold text-gym-text mb-2">{title}</h2>
			<p class="text-[14px] text-gym-muted mb-6">{message}</p>

			<div class="flex gap-3">
				<button
					class="flex-1 h-11 rounded-lg font-medium transition-colors text-[14px] bg-gym-surface border border-gym-muted/20 text-gym-text hover:bg-gym-bg"
					disabled={loading}
					onclick={onCancel}
				>
					{cancelText}
				</button>
				<button
					class={`flex-1 h-11 rounded-lg font-medium transition-colors text-[14px] text-white ${
						isDangerous
							? 'bg-gym-danger hover:bg-gym-danger/80'
							: 'bg-gym-accent hover:bg-gym-accent/80'
					}`}
					disabled={loading}
					onclick={onConfirm}
				>
					{#if loading}
						<span class="inline-block animate-spin">⏳</span>
					{:else}
						{confirmText}
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
