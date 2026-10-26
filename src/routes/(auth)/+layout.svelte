<script lang="ts">
	import Logo from '#lib/components/Logo.svelte';
	import PageTransition from '#lib/components/PageTransition.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col bg-gradient-to-b from-accent-soft/30 to-canvas">
	<header class="flex items-center justify-between px-4 py-4 sm:px-6">
		<Logo />
		<ThemeToggle />
	</header>

	<main class="flex flex-1 items-center justify-center px-4 pb-20">
		<div class="w-full max-w-sm">
			<div class="mb-6 text-center">
				<h2 class="text-sm font-medium uppercase tracking-wider text-accent">
					{m.app_name()}
				</h2>
				<p class="mt-1 text-sm text-fg-subtle">{m.app_tagline()}</p>
			</div>
			<PageTransition>
				{@render children()}
			</PageTransition>
		</div>
	</main>
</div>
