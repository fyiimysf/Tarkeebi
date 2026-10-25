<script lang="ts">
	import MobileTabBar from '#lib/components/MobileTabBar.svelte';
	import { theme } from '#lib/theme.svelte.ts';

	$effect(() => {
		theme.set('light');
	});
</script>

<svelte:head>
	<title>Tab bar preview</title>
</svelte:head>

<div class="mx-auto w-full max-w-5xl px-4 py-6">
	<h1 class="font-display text-3xl font-semibold">Preview</h1>
	<p class="mt-2 text-sm text-fg-subtle">
		Scrollable page content to show the bar against a real background.
	</p>
	{#each Array.from({ length: 12 }) as _, i (i)}
		<div class="mt-4 h-24 rounded-card border border-border bg-surface">
			Card {i + 1}
		</div>
	{/each}
</div>

<MobileTabBar />
