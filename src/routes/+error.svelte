<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { ArrowLeft, RefreshCw } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{page.status} · {m.app_name()}</title>
</svelte:head>

<div class="fixed inset-0 grid place-items-center px-4 text-center">
	<div class="w-full max-w-lg space-y-6">
		<div class="space-y-3">
			<p
				class="font-display text-8xl font-bold leading-none tracking-[-0.08em] text-fg sm:text-[12rem]"
				aria-label={`Error ${page.status}`}
			>
				{page.status}
			</p>
			<h1 class="font-display text-2xl font-bold tracking-tight sm:text-4xl">
				{page.status === 404 ? 'Page not found' : 'Something went wrong'}
			</h1>
			<p class="mx-auto max-w-md text-base text-fg-subtle">
				{page.error?.message ||
					(page.status === 404
						? "We couldn't find the page you're looking for."
						: 'An unexpected error occurred.')}
			</p>
		</div>
		<nav class="flex flex-wrap items-center justify-center gap-2" aria-label="Error actions">
			<button type="button" class="btn-secondary" onclick={() => history.back()}>
				<ArrowLeft class="size-4 rtl:rotate-180" />
				{m.public_back()}
			</button>
			<button type="button" class="btn-primary" onclick={() => window.location.reload()}>
				<RefreshCw class="size-4" />
				{m.load_error_retry()}
			</button>
		</nav>
	</div>
</div>
