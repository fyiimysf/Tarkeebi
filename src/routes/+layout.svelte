<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import { theme } from '#lib/theme.svelte.ts';
	import './layout.css';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Keeps the `dark` class in sync with the user's preference after hydration.
	theme.init();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
