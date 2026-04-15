<script lang="ts">
	interface Props {
		rows?: number;
	}
	const { rows = 4 } = $props() as Props;
</script>

<div class="space-y-1" aria-busy="true" aria-live="polite">
	<!-- Header skeleton -->
	<div class="px-5 pt-5 pb-4">
		<div class="skeleton h-3 w-20 mb-2"></div>
		<div class="skeleton h-7 w-48"></div>
	</div>
	<!-- Row skeletons -->
	{#each Array(rows) as _}
		<div class="mx-4 mb-2">
			<div class="card flex items-center gap-4 p-4">
				<div class="skeleton h-14 w-14 shrink-0 rounded-2xl"></div>
				<div class="flex-1 space-y-2">
					<div class="skeleton h-4 w-36"></div>
					<div class="skeleton h-3 w-24"></div>
				</div>
				<div class="skeleton h-6 w-6 rounded-full"></div>
			</div>
		</div>
	{/each}
</div>
