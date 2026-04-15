<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContainer } from '$lib/container';
	import BackButton from '$ui/components/shared/BackButton.svelte';
	import SpinnerButton from '$ui/components/shared/SpinnerButton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import SplitCountPicker from '$ui/components/nova-ficha/SplitCountPicker.svelte';
	import SplitNameList from '$ui/components/nova-ficha/SplitNameList.svelte';
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

	const PLACEHOLDERS = [
		'Ex.: Peito e tríceps',
		'Ex.: Costas e bíceps',
		'Ex.: Pernas',
		'Ex.: Ombros',
		'Ex.: Core e cardio'
	] as const;

	let name = $state('');
	let description = $state('');
	let splitCount = $state<SplitCount>(3);
	let splitNames = $state<string[]>(['', '', '', '', '']);

	function getPlaceholder(index: number): string {
		return PLACEHOLDERS[index] ?? `Treino ${index + 1}`;
	}

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
		<BackButton href="/fichas" label="Voltar para fichas" />
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
		<SplitCountPicker
			value={splitCount}
			labels={SPLIT_LABELS.slice()}
			colors={SPLIT_COLORS}
			onchange={(count) => (splitCount = count)}
		/>

		<!-- Nomes dos splits -->
		<SplitNameList
			visibleSplits={visibleSplits}
			names={splitNames}
			colors={SPLIT_COLORS}
			onchange={(index, name) => (splitNames[index] = name)}
			placeholders={PLACEHOLDERS.slice()}
		/>

		<!-- Erro -->
		{#if saveState === 'error' && errorMessage}
			<ErrorAlert message={errorMessage} />
		{/if}

		<!-- Submit -->
		<SpinnerButton
			loading={saveState === 'saving'}
			disabled={!canSubmit}
			id="btn-submit-nova-ficha"
			type="submit"
		>
			<span slot="loading">Criando ficha...</span>
			<span>Criar ficha</span>
		</SpinnerButton>
	</form>
</div>
