<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { getContainer } from '$lib/container';
	import PageLoadingSkeleton from '$ui/components/shared/PageLoadingSkeleton.svelte';
	import ErrorAlert from '$ui/components/shared/ErrorAlert.svelte';
	import BackButton from '$ui/components/shared/BackButton.svelte';
	import SpinnerButton from '$ui/components/shared/SpinnerButton.svelte';
	import type { Routine } from '$core/domain/entities/Routine';
	import type { Split } from '$core/domain/entities/Split';

	type LoadState = 'loading' | 'ready' | 'not-found' | 'error';
	type SaveState = 'idle' | 'saving' | 'error';

	// ── Estado ──────────────────────────────────────────────────
	let loadState = $state<LoadState>('loading');
	let routine = $state<Routine | null>(null);
	let splits = $state<readonly Split[]>([]);
	let loadError = $state<string | null>(null);

	// ── Formulário ──────────────────────────────────────────────
	let name = $state('');
	let description = $state('');
	let splitCount = $state<1 | 2 | 3 | 4 | 5>(1);

	let saveState = $state<SaveState>('idle');
	let saveError = $state<string | null>(null);

	let canSubmit = $derived(
		name.trim().length > 0 &&
		saveState !== 'saving' &&
		(name !== routine?.name || description !== (routine?.description || '') || splitCount !== routine?.splitCount)
	);

	onMount(() => {
		const { routineId } = $page.params;
		(async () => {
			try {
				const { routines } = getContainer();
				const foundRoutine = await routines.findById(routineId);
				if (!foundRoutine) {
					loadState = 'not-found';
					return;
				}

				const foundSplits = await routines.findSplits(routineId);

				routine = foundRoutine;
				splits = foundSplits;
				name = foundRoutine.name;
				description = foundRoutine.description ?? '';
				splitCount = foundRoutine.splitCount;
				loadState = 'ready';
			} catch (err) {
				console.error('[fichas/editar] Falha ao carregar', err);
				loadError = err instanceof Error ? err.message : 'Erro desconhecido.';
				loadState = 'error';
			}
		})();
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (!canSubmit || !routine) return;

		saveState = 'saving';
		saveError = null;

		try {
			const { updateRoutine } = getContainer();
			await updateRoutine.execute({
				routineId: routine.id,
				name: name.trim(),
				description: description.trim() || undefined,
				splitCount
			});

			await goto(`/fichas/${routine.id}`, { replaceState: true });
		} catch (err) {
			console.error('[fichas/editar] Falha ao salvar', err);
			saveError = err instanceof Error ? err.message : 'Algo deu errado. Tente novamente.';
			saveState = 'error';
		}
	}
</script>

<svelte:head>
	<title>Editar ficha · MoralGym</title>
</svelte:head>

{#if loadState === 'loading'}
	<PageLoadingSkeleton rows={2} />

{:else if loadState === 'error'}
	<ErrorAlert message="Não foi possível carregar esta ficha." detail={loadError} />

{:else if loadState === 'not-found' || !routine}
	<section class="flex min-h-[60vh] flex-col items-center justify-center px-8 text-center animate-fade-in">
		<h2 class="text-[20px] font-bold text-gym-text">Ficha não encontrada</h2>
		<p class="mt-2 max-w-xs text-[14px] text-gym-muted">O link pode estar incorreto ou a ficha foi removida.</p>
		<a href="/fichas" class="mt-6 btn-ghost">Voltar para Fichas</a>
	</section>

{:else}
	<div class="animate-slide-up">
		<!-- ── Header ───────────────────────────────────────────── -->
		<div class="flex items-center gap-3 px-5 pt-5 pb-2">
			<BackButton href="/fichas/{routine.id}" label="Voltar para a ficha" />
			<div class="min-w-0 flex-1">
				<p class="section-label truncate">Editar</p>
				<h1 class="text-[20px] font-black text-gym-text">{routine.name}</h1>
			</div>
		</div>

		<!-- ── Form ─────────────────────────────────────────────── -->
		<form class="space-y-6 px-5 pt-4 pb-6" novalidate onsubmit={handleSubmit}>

			<!-- Nome -->
			<div class="space-y-2">
				<label for="routine-name" class="section-label block">
					Nome <span class="text-gym-danger normal-case" aria-hidden="true">*</span>
				</label>
				<input
					id="routine-name"
					type="text"
					required
					maxlength="80"
					bind:value={name}
					placeholder="Ex.: Full Body"
					class="input-base"
				/>
			</div>

			<!-- Descrição -->
			<div class="space-y-2">
				<label for="routine-description" class="section-label block">
					Descrição <span class="font-normal normal-case text-gym-muted/60">(opcional)</span>
				</label>
				<textarea
					id="routine-description"
					rows="3"
					maxlength="500"
					bind:value={description}
					placeholder="Notas sobre a ficha, objetivo, frequência..."
					class="input-base resize-none"
				></textarea>
			</div>

			<!-- Divisão (Splits) -->
			<fieldset class="space-y-3 border-0 p-0">
				<legend class="section-label block">
					Número de treinos <span class="text-gym-danger normal-case" aria-hidden="true">*</span>
				</legend>
				<div class="grid grid-cols-5 gap-2">
					{#each [1, 2, 3, 4, 5] as option}
						<button
							type="button"
							class="h-12 rounded-lg text-[14px] font-bold transition-colors"
							class:bg-gym-accent={splitCount === option}
							class:text-gym-bg={splitCount === option}
							class:ring-gym-accent={splitCount === option}
							class:ring-2={splitCount === option}
							class:bg-gym-surface={splitCount !== option}
							class:text-gym-text={splitCount !== option}
							onclick={() => (splitCount = option as 1 | 2 | 3 | 4 | 5)}
						>
							{option}×
						</button>
					{/each}
				</div>
			</fieldset>

			<!-- Aviso sobre redução de splits -->
			{#if splitCount < splits.length}
				<div class="rounded-lg bg-gym-warning/20 border border-gym-warning/40 p-3">
					<p class="text-[13px] text-gym-warning font-medium">
						⚠️ Reduzir splits pode remover exercícios dos últimos treinos.
					</p>
				</div>
			{/if}

			<!-- Erro de save -->
			{#if saveState === 'error' && saveError}
				<ErrorAlert message={saveError} />
			{/if}

			<!-- Submit -->
			<SpinnerButton
				loading={saveState === 'saving'}
				disabled={!canSubmit}
				id="btn-submit-editar"
				type="submit"
			>
				<span slot="loading">Salvando...</span>
				<span>Salvar alterações</span>
			</SpinnerButton>
		</form>
	</div>
{/if}
