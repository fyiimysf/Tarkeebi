<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<section class="mt-6" aria-busy="true" aria-label={m.loading()}>
	<p class="sr-only" role="status">{m.loading()}</p>
	<div class="animate-pulse space-y-6" aria-hidden="true">
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{#each [0, 1, 2, 3] as item (item)}
				<div class="card px-4 py-3">
					<div class="h-3 w-16 rounded bg-surface-sunken"></div>
					<div class="mt-2 h-6 w-10 rounded bg-surface-sunken"></div>
				</div>
			{/each}
		</div>

		<div class="h-10 rounded-control bg-surface-sunken"></div>

		<div class="flex flex-wrap gap-2">
			{#each [0, 1, 2, 3] as item (item)}
				<div class="h-7 w-20 rounded-pill bg-surface-sunken"></div>
			{/each}
			<div class="ms-auto h-7 w-24 rounded-control bg-surface-sunken"></div>
		</div>

		<div class="flex flex-wrap gap-1.5">
			{#each [0, 1, 2] as item (item)}
				<div class="h-6 w-16 rounded-pill bg-surface-sunken"></div>
			{/each}
		</div>

		<div>
			<div class="h-3 w-20 rounded bg-surface-sunken"></div>
			<div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each [0, 1, 2, 3, 4, 5] as item (item)}
					<div class="card overflow-hidden">
						<div class="aspect-[4/3] w-full bg-surface-sunken"></div>
						<div class="space-y-2 p-4">
							<div class="h-4 w-3/4 rounded bg-surface-sunken"></div>
							<div class="h-3 w-full rounded bg-surface-sunken"></div>
							<div class="h-3 w-1/2 rounded bg-surface-sunken"></div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
