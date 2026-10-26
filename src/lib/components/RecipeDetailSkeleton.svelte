<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
</script>

<div class="mt-3" aria-busy="true" aria-label={m.loading()}>
	<p class="sr-only" role="status">{m.loading()}</p>
	<div class="animate-pulse" aria-hidden="true">
		<div class="card mb-6 aspect-[16/9] w-full bg-surface-sunken"></div>

		<div class="h-9 w-3/4 rounded bg-surface-sunken sm:h-10"></div>
		<div class="mt-3 h-4 w-2/3 rounded bg-surface-sunken"></div>
		<div class="mt-2 h-4 w-1/2 rounded bg-surface-sunken"></div>

		<div class="mt-5 flex flex-wrap gap-3">
			<div class="h-4 w-24 rounded bg-surface-sunken"></div>
			<div class="h-4 w-20 rounded bg-surface-sunken"></div>
			<div class="h-4 w-28 rounded bg-surface-sunken"></div>
		</div>

		<div class="mt-3 flex gap-2">
			<div class="h-6 w-16 rounded-pill bg-surface-sunken"></div>
			<div class="h-6 w-20 rounded-pill bg-surface-sunken"></div>
		</div>

		<div class="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
			<div class="card p-5 sm:p-6">
				<div class="h-6 w-28 rounded bg-surface-sunken"></div>
				<div class="mt-5 space-y-3">
					<div class="h-4 w-full rounded bg-surface-sunken"></div>
					<div class="h-4 w-5/6 rounded bg-surface-sunken"></div>
					<div class="h-4 w-4/6 rounded bg-surface-sunken"></div>
					<div class="h-4 w-3/4 rounded bg-surface-sunken"></div>
				</div>
			</div>

			<div class="card p-5 sm:p-6">
				<div class="h-6 w-24 rounded bg-surface-sunken"></div>
				<div class="mt-5 space-y-4">
					<div class="flex gap-3">
						<div class="size-7 shrink-0 rounded-full bg-surface-sunken"></div>
						<div class="h-4 flex-1 rounded bg-surface-sunken"></div>
					</div>
					<div class="flex gap-3">
						<div class="size-7 shrink-0 rounded-full bg-surface-sunken"></div>
						<div class="h-4 flex-1 rounded bg-surface-sunken"></div>
					</div>
					<div class="flex gap-3">
						<div class="size-7 shrink-0 rounded-full bg-surface-sunken"></div>
						<div class="h-4 flex-1 rounded bg-surface-sunken"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
