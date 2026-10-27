<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<div class="mx-auto mt-4 min-w-0 max-w-3xl" aria-busy="true" aria-label={m.loading()}>
	<p class="sr-only" role="status">{m.loading()}</p>
	<div class="animate-pulse" aria-hidden="true">
		<div class="-mx-4 overflow-hidden border-y border-border sm:mx-0 sm:rounded-2xl sm:border">
			<div class="aspect-[4/3] w-full bg-surface-sunken sm:aspect-[16/10]"></div>
		</div>

		<header class="mt-6 sm:mt-8">
			<div class="h-10 w-3/4 rounded bg-surface-sunken sm:h-12"></div>
			<div class="mt-4 h-5 w-full rounded bg-surface-sunken"></div>
			<div class="mt-2 h-5 w-5/6 rounded bg-surface-sunken"></div>

			<div class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-4">
				<div class="h-4 w-24 rounded bg-surface-sunken"></div>
				<div class="h-4 w-20 rounded bg-surface-sunken"></div>
				<div class="h-4 w-16 rounded bg-surface-sunken"></div>
				<div class="h-4 w-16 rounded bg-surface-sunken"></div>
			</div>

			<div class="mt-5 flex items-center gap-2">
				<div class="h-10 w-32 rounded-control bg-surface-sunken"></div>
				<div class="h-10 w-28 rounded-control bg-surface-sunken"></div>
				<div class="ms-auto flex gap-2">
					<div class="h-10 w-24 rounded-control bg-surface-sunken"></div>
					<div class="h-10 w-24 rounded-control bg-surface-sunken"></div>
				</div>
			</div>

			<div class="mt-4 flex flex-wrap items-center gap-1.5">
				<div class="h-4 w-12 rounded bg-surface-sunken"></div>
				<div class="h-6 w-16 rounded-pill bg-surface-sunken"></div>
				<div class="h-6 w-20 rounded-pill bg-surface-sunken"></div>
			</div>
		</header>

		<div class="mt-8 grid grid-cols-1 gap-10 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
			<div class="card p-5 sm:p-6">
				<div class="h-6 w-28 rounded bg-surface-sunken"></div>
				<div class="mt-5 space-y-3">
					{#each [0, 1, 2, 3, 4] as item (item)}
						<div class="h-4 w-full rounded bg-surface-sunken"></div>
					{/each}
				</div>
			</div>

			<section>
				<div class="h-7 w-32 rounded bg-surface-sunken"></div>
				<div class="mt-4 space-y-6">
					{#each [0, 1, 2] as item (item)}
						<div class="flex gap-4">
							<div class="size-8 shrink-0 rounded-full bg-surface-sunken"></div>
							<div class="flex-1 space-y-2 pt-0.5">
								<div class="h-4 w-full rounded bg-surface-sunken"></div>
								<div class="h-4 w-5/6 rounded bg-surface-sunken"></div>
							</div>
						</div>
					{/each}
				</div>
			</section>
		</div>
	</div>
</div>
