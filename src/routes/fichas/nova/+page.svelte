<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContainer } from '$lib/container';
	import type { SplitCount } from '$core/domain/entities/Routine';

	type SaveState = 'idle' | 'saving' | 'error';

	const SPLIT_LABELS = ['A', 'B', 'C', 'D', 'E'] as const;
	const SPLIT_OPTIONS: readonly SplitCount[] = [1, 2, 3, 4, 5];

	// Cores por letra de split (consistente com fichas/+page.svelte)
	const SPLIT_COLORS: Record<string, string> = {
		A: 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30',
		B: 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30',
		C: 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30',
		D: 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30',
		E: 'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30',
	};

	let name = $state('');
	let description = $state('');
	let splitCount = $state<SplitCount>(3);
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

<div class="animate-slide-up">
	<!-- ── Header ───────────────────────────────────────────────── -->
	<div class="flex items-center gap-3 px-5 pt-5 pb-2">
		<a
			href="/fichas"
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
				border border-gym-border bg-gym-surface text-gym-muted
				transition-all active:bg-gym-surface2 active:scale-95"
			aria-label="Voltar para fichas"
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M15 6l-6 6 6 6" />
			</svg>
		</a>
		<div>
			<h1 class="text-[20px] font-black text-gym-text">Nova ficha</h1>
			<p class="text-[13px] text-gym-muted">Monte sua rotina de treinos</p>
		</div>
	</div>

	<!-- ── Form ─────────────────────────────────────────────────── -->
	<form class="space-y-6 px-5 pt-4 pb-6" novalidate onsubmit={handleSubmit}>

		<!-- Nome da ficha -->
		<div class="space-y-2">
			<label for="routine-name" class="section-label block">
				Nome da ficha <span class="text-gym-danger normal-case" aria-hidden="true">*</span>
			</label>
			<input
				id="routine-name"
				type="text"
				required
				maxlength="80"
				autocomplete="off"
				bind:value={name}
				placeholder="Ex.: Hipertrofia 2026"
				class="input-base"
			/>
		</div>

		<!-- Descrição -->
		<div class="space-y-2">
			<div class="flex items-baseline justify-between">
				<label for="routine-description" class="section-label block">
					Descrição <span class="font-normal normal-case text-gym-muted/60">(opcional)</span>
				</label>
				<span class="text-[11px] text-gym-muted/50" aria-live="polite">
					{description.length}/500
				</span>
			</div>
			<textarea
				id="routine-description"
				rows="3"
				maxlength="500"
				bind:value={description}
				placeholder="Foco, período, meta..."
				class="input-base resize-none"
			></textarea>
		</div>

		<!-- Seletor de divisão -->
		<fieldset class="space-y-3">
			<legend class="section-label">Divisão</legend>

			<div class="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Número de divisões">
				{#each SPLIT_OPTIONS as option (option)}
					<button
						type="button"
						role="radio"
						aria-checked={splitCount === option}
						onclick={() => (splitCount = option)}
						class="flex flex-col items-center justify-center rounded-2xl border py-3
							text-[12px] font-bold transition-all duration-150
							{splitCount === option
								? 'border-gym-accent bg-gym-accent/15 text-gym-accent ring-1 ring-gym-accent/30'
								: 'border-gym-border bg-gym-surface text-gym-muted active:bg-gym-surface2'}"
					>
						<span class="text-[18px] font-black leading-none">
							{option}
						</span>
						<span class="mt-0.5 opacity-70">
							{option === 1 ? 'dia' : 'dias'}
						</span>
					</button>
				{/each}
			</div>

			<!-- Preview das letras que serão criadas -->
			<div class="flex items-center gap-1.5 flex-wrap">
				{#each visibleSplits as s (s.label)}
					<span
						class="rounded-lg px-2 py-1 text-[12px] font-bold
							animate-fade-in {SPLIT_COLORS[s.label] ?? 'bg-gym-accent/15 text-gym-accent'}"
					>
						{s.label}
					</span>
				{/each}
			</div>
		</fieldset>

		<!-- Nomes dos splits -->
		<div class="space-y-3">
			<p class="section-label">Nomes dos dias</p>
			<ul class="space-y-2.5">
				{#each visibleSplits as split (split.label)}
					<li class="flex items-center gap-3">
						<span
							class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
								text-[16px] font-black
								{SPLIT_COLORS[split.label] ?? 'bg-gym-accent/15 text-gym-accent'}"
							aria-hidden="true"
						>
							{split.label}
						</span>
						<input
							type="text"
							maxlength="40"
							autocomplete="off"
							bind:value={splitNames[split.index]}
							aria-label={`Nome do dia ${split.label}`}
							placeholder={defaultPlaceholder(split.index)}
							class="input-base"
						/>
					</li>
				{/each}
			</ul>
		</div>

		<!-- Erro -->
		{#if saveState === 'error' && errorMessage}
			<div
				role="alert"
				class="rounded-2xl border border-gym-danger/30 bg-gym-danger/5 p-4
					text-[14px] text-red-300 animate-slide-up"
			>
				{errorMessage}
			</div>
		{/if}

		<!-- Submit -->
		<button
			type="submit"
			id="btn-submit-nova-ficha"
			disabled={!canSubmit}
			class="btn-primary shadow-lg shadow-gym-accent/20"
		>
			{#if saveState === 'saving'}
				<svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"
					stroke="currentColor" stroke-width="2.5" stroke-linecap="round"
					stroke-linejoin="round" aria-hidden="true">
					<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
				</svg>
				Criando ficha...
			{:else}
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M20 6L9 17l-5-5" />
				</svg>
				Criar ficha
			{/if}
		</button>
	</form>
</div>

<script lang="ts" module>
	const PLACEHOLDERS = [
		'Ex.: Peito e tríceps',
		'Ex.: Costas e bíceps',
		'Ex.: Pernas',
		'Ex.: Ombros',
		'Ex.: Core e cardio'
	] as const;

	export function defaultPlaceholder(index: number): string {
		return PLACEHOLDERS[index] ?? `Treino ${index + 1}`;
	}
</script>
