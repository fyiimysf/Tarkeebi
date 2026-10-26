<script lang="ts">
	import { onMount, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import { fade } from 'svelte/transition';
	import { fadeParams } from '#lib/motion.ts';

	let { children }: { children: Snippet } = $props();

	// The first paint is already handled by the server render. Only animate
	// subsequent client-side navigations, so slow devices are not made to wait
	// for an entrance after the page has arrived.
	let hydrated = $state(false);
	onMount(() => {
		hydrated = true;
	});

	// Cook mode is a full-screen overlay with its own entrance. Wrapping it in
	// an opacity transition would briefly put the app chrome above its header.
	const fullScreenRoute = $derived(page.route.id?.endsWith('/cook') ?? false);
	const pageKey = $derived(page.url.pathname);
</script>

{#if fullScreenRoute}
	{@render children()}
{:else}
	{#key pageKey}
		<div in:fade={fadeParams(hydrated ? 180 : 0)}>
			{@render children()}
		</div>
	{/key}
{/if}
