<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<div class="mt-8" aria-busy="true" aria-label={m.loading()}>
	<p class="sr-only" role="status">{m.loading()}</p>
	<div class="animate-pulse" aria-hidden="true">
		<div class="flex flex-wrap gap-1.5">
			{#each [0, 1, 2, 3, 4] as item (item)}
				<div class="h-7 w-20 rounded-pill bg-surface-sunken"></div>
			{/each}
		</div>

		<div class="card mt-8 flex flex-col overflow-hidden md:flex-row">
			<div class="aspect-[16/10] w-full bg-surface-sunken md:aspect-auto md:min-h-80 md:w-1/2"></div>
			<div class="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-8">
				<div class="h-3 w-20 rounded bg-surface-sunken"></div>
				<div class="h-8 w-3/4 rounded bg-surface-sunken"></div>
				<div class="h-4 w-full rounded bg-surface-sunken"></div>
				<div class="h-4 w-5/6 rounded bg-surface-sunken"></div>
				<div class="mt-1 flex gap-4">
					<div class="h-3 w-16 rounded bg-surface-sunken"></div>
					<div class="h-3 w-16 rounded bg-surface-sunken"></div>
					<div class="ms-auto h-3 w-24 rounded bg-surface-sunken"></div>
				</div>
			</div>
		</div>

		<div class="mt-12 h-8 w-40 rounded bg-surface-sunken"></div>
		<div class="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each [0, 1, 2, 3, 4, 5] as item (item)}
				<div class="card flex h-full flex-col overflow-hidden">
					<div class="aspect-[4/3] w-full bg-surface-sunken"></div>
					<div class="flex flex-1 flex-col gap-2 p-5">
						<div class="h-5 w-3/4 rounded bg-surface-sunken"></div>
						<div class="h-3 w-full rounded bg-surface-sunken"></div>
						<div class="h-3 w-5/6 rounded bg-surface-sunken"></div>
						<div class="mt-1 flex gap-1">
							<div class="h-5 w-12 rounded-pill bg-surface-sunken"></div>
							<div class="h-5 w-14 rounded-pill bg-surface-sunken"></div>
						</div>
						<div class="mt-auto flex items-center gap-4 pt-3">
							<div class="h-3 w-16 rounded bg-surface-sunken"></div>
							<div class="h-3 w-16 rounded bg-surface-sunken"></div>
							<div class="ms-auto h-3 w-20 rounded bg-surface-sunken"></div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
