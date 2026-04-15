<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContainer } from '$lib/container';
	import type { SplitCount } from '$core/domain/entities/Routine';

	type SaveState = 'idle' | 'saving' | 'error';

	// Labels gerados na UI apenas para preview — a fonte da verdade
	// continua sendo o use-case no core, que os regenera no save.
	const SPLIT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
	const SPLIT_OPTIONS: readonly SplitCount[] = [1, 2, 3, 4, 5];

	let name = $state('');
	let description = $state('');
	let splitCount = $state<SplitCount>(3);
	// Nomes por índice; o array é sempre do tamanho máximo (5) e lemos só
	// os N primeiros de acordo com o `splitCount`. Evita perder o que o
	// usuário já digitou se ele trocar de A/B/C/D/E para A/B e voltar.
	let splitNames = $state<string[]>(['', '', '', '', '']);

	let saveState = $state<SaveState>('idle');
	let errorMessage = $state<string | null>(null);

	let visibleSplits = $derived(
		Array.from({ length: splitCount }, (_, i) => ({
			label: SPLIT_LABELS[i],
			index: i
		}))
	);

	let canSubmit = $derived(
		name.trim().length > 0 && saveState !== 'saving'
	);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit) return;

		saveState = 'saving';
		errorMessage = null;

		try {
			const { createRoutine } = getContainer();
			const { routine } = await createRoutine.execute({
				name,
				description,
				splitCount,
				splits: visibleSplits.map((s) => ({ name: splitNames[s.index] })),
				setAsActive: true
			});

			// Volta pra home de fichas; a recém-criada já será a ativa.
			await goto(`/fichas?created=${routine.id}`, { replaceState: true });
		} catch (err) {
			console.error('[fichas/nova] Falha ao criar ficha', err);
			errorMessage =
				err instanceof Error
					? err.message
					: 'Algo deu errado ao salvar. Tente novamente.';
			saveState = 'error';
		}
	}
</script>

<svelte:head>
	<title>Nova ficha · MoralGym</title>
</svelte:head>

<section class="space-y-6">
	<header>
		<a
			href="/fichas"
			class="inline-flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-gray-200"
		>
			<svg
				class="h-4 w-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.75"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M15 6l-6 6 6 6" />
			</svg>
			Voltar
		</a>
		<h2 class="mt-3 text-xl font-semibold text-gray-100">Nova ficha</h2>
		<p class="mt-1 text-sm text-gray-400">
			Monte sua rotina nomeando cada dia de treino.
		</p>
	</header>

	<form class="space-y-6" novalidate onsubmit={handleSubmit}>
		<div class="space-y-2">
			<label for="routine-name" class="block text-xs font-medium text-gray-300">
				Nome <span class="text-red-400" aria-hidden="true">*</span>
			</label>
			<input
				id="routine-name"
				type="text"
				required
				maxlength="80"
				autocomplete="off"
				bind:value={name}
				placeholder="Ex.: Hipertrofia 2026"
				class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-100
					placeholder:text-gray-600 outline-none transition-colors
					focus:border-white/30 focus:bg-white/[0.05]"
			/>
		</div>

		<div class="space-y-2">
			<div class="flex items-baseline justify-between">
				<label for="routine-description" class="block text-xs font-medium text-gray-300">
					Descrição <span class="text-gray-500">(opcional)</span>
				</label>
				<span class="text-[11px] text-gray-600" aria-live="polite">
					{description.length}/3000
				</span>
			</div>
			<textarea
				id="routine-description"
				rows="10"
				maxlength="3000"
				bind:value={description}
				placeholder="Foco, período, meta, instruções de execução, progressão de carga..."
				class="w-full resize-y rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-100
					placeholder:text-gray-600 outline-none transition-colors
					focus:border-white/30 focus:bg-white/[0.05]"
			></textarea>
		</div>

		<fieldset class="space-y-3">
			<legend class="text-xs font-medium text-gray-300">Divisão</legend>
			<div class="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Divisão">
				{#each SPLIT_OPTIONS as option (option)}
					<button
						type="button"
						role="radio"
						aria-checked={splitCount === option}
						onclick={() => (splitCount = option)}
						class="rounded-xl border px-2 py-3 text-sm font-semibold transition-colors
							{splitCount === option
								? 'border-gray-100 bg-gray-100 text-[#0B0B0D]'
								: 'border-white/10 bg-white/[0.03] text-gray-300 hover:border-white/20 hover:bg-white/[0.05]'}"
					>
						{option === 1 ? 'Único' : SPLIT_LABELS.slice(0, option).join('/')}
					</button>
				{/each}
			</div>
			<p class="text-xs text-gray-500">
				Até 5 dias distintos. Você pode ajustar os nomes abaixo.
			</p>
		</fieldset>

		<div class="space-y-3">
			<p class="text-xs font-medium text-gray-300">Nomes dos splits</p>
			<ul class="space-y-2">
				{#each visibleSplits as split (split.label)}
					<li class="flex items-center gap-3">
						<span
							class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-sm font-bold text-gray-100"
							aria-hidden="true"
						>
							{split.label}
						</span>
						<input
							type="text"
							maxlength="40"
							autocomplete="off"
							bind:value={splitNames[split.index]}
							aria-label={`Nome do Split ${split.label}`}
							placeholder={`Ex.: ${defaultPlaceholder(split.index)}`}
							class="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-100
								placeholder:text-gray-600 outline-none transition-colors
								focus:border-white/30 focus:bg-white/[0.05]"
						/>
					</li>
				{/each}
			</ul>
		</div>

		{#if saveState === 'error' && errorMessage}
			<div
				role="alert"
				class="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200"
			>
				{errorMessage}
			</div>
		{/if}

		<button
			type="submit"
			disabled={!canSubmit}
			class="inline-flex w-full items-center justify-center rounded-xl bg-gray-100 px-5 py-3 text-sm font-semibold text-[#0B0B0D]
				transition-colors active:bg-gray-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500"
		>
			{saveState === 'saving' ? 'Salvando...' : 'Criar ficha'}
		</button>
	</form>
</section>

<script lang="ts" module>
	// Sugestões de nomes mais comuns em cada posição (A/B/C/D/E).
	// É puramente cosmético (placeholder), não vai para o domínio.
	const PLACEHOLDERS = [
		'Peito e tríceps',
		'Costas e bíceps',
		'Pernas',
		'Ombros',
		'Core e cardio'
	] as const;

	export function defaultPlaceholder(index: number): string {
		return PLACEHOLDERS[index] ?? `Treino ${index + 1}`;
	}
</script>
