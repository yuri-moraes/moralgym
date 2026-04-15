<script lang="ts">
	interface Props {
		targetSets: number;
		targetRepsMin: number;
		targetRepsMax: number;
		restSeconds: number;
		prescriptionPreview: string;
		onchange: (field: string, value: number) => void;
	}
	const { targetSets, targetRepsMin, targetRepsMax, restSeconds, prescriptionPreview, onchange } =
		$props() as Props;
</script>

<fieldset class="space-y-4">
	<legend class="section-label">Prescrição</legend>

	<!-- Preview -->
	<div class="rounded-xl border border-gym-accent/20 bg-gym-accent/5 px-4 py-2.5">
		<p class="text-[13px] font-semibold text-gym-accent">{prescriptionPreview}</p>
	</div>

	<!-- Séries / Reps Mín / Reps Máx -->
	<div class="grid grid-cols-3 gap-3">
		<div class="space-y-2">
			<label for="target-sets" class="section-label block">Séries</label>
			<input
				id="target-sets"
				type="number"
				min="1"
				max="20"
				value={targetSets}
				oninput={(e) => onchange('targetSets', Number((e.target as HTMLInputElement).value))}
				class="input-base text-center text-[17px] font-black px-2"
			/>
		</div>
		<div class="space-y-2">
			<label for="reps-min" class="section-label block">Reps mín.</label>
			<input
				id="reps-min"
				type="number"
				min="1"
				max="100"
				value={targetRepsMin}
				oninput={(e) => onchange('targetRepsMin', Number((e.target as HTMLInputElement).value))}
				class="input-base text-center text-[17px] font-black px-2"
			/>
		</div>
		<div class="space-y-2">
			<label for="reps-max" class="section-label block">Reps máx.</label>
			<input
				id="reps-max"
				type="number"
				min="1"
				max="100"
				value={targetRepsMax}
				oninput={(e) => onchange('targetRepsMax', Number((e.target as HTMLInputElement).value))}
				class="input-base text-center text-[17px] font-black px-2"
			/>
		</div>
	</div>

	<!-- Descanso (slider estilizado) -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<p class="section-label">Descanso entre séries</p>
			<span
				class="rounded-lg border border-gym-border bg-gym-surface
					px-2.5 py-1 text-[13px] font-bold text-gym-text"
			>
				{#if restSeconds === 0}
					Sem descanso
				{:else if restSeconds < 60}
					{restSeconds}s
				{:else}
					{Math.floor(restSeconds / 60)}min{restSeconds % 60 > 0 ? ` ${restSeconds % 60}s` : ''}
				{/if}
			</span>
		</div>
		<input
			id="rest-seconds"
			type="range"
			min="0"
			max="300"
			step="15"
			value={restSeconds}
			oninput={(e) => onchange('restSeconds', Number((e.target as HTMLInputElement).value))}
			class="w-full"
			aria-label="Tempo de descanso em segundos"
		/>
		<div class="flex justify-between text-[10px] text-gym-muted/60 font-medium">
			<span>0s</span><span>1min</span><span>2min</span><span>3min</span><span>4min</span><span>5min</span>
		</div>
	</div>
</fieldset>
