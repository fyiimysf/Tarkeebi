<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import Logo from '#lib/components/Logo.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The recipe page pins its primary actions to the bottom edge on phones, so
	// the footer needs room to clear that bar.
	const hasStickyActions = $derived(page.route.id === '/(public)/r/[slug]');
</script>

<div class="flex min-h-dvh flex-col">
	<header
		class="no-print sticky top-0 z-30 border-b border-border bg-canvas/85 pt-[env(safe-area-inset-top)] backdrop-blur"
	>
		<div class="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
			<a href={resolve('/(public)')} class="shrink-0">
				<Logo />
			</a>
			<div class="flex items-center gap-1">
				<a href={resolve('/(app)/app')} class="btn-ghost text-sm">
					{m.public_recipe_box()}
				</a>
				<ThemeToggle />
			</div>
		</div>
	</header>

	<main class="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
		{@render children()}
	</main>

	<footer
		class="no-print border-t border-border {hasStickyActions
			? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0'
			: ''}"
	>
		<div
			class="mx-auto flex w-full max-w-5xl flex-col gap-1 px-4 py-8 text-sm text-fg-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6"
		>
			<span>{m.app_name()} · {m.app_tagline()}</span>
			<a href={resolve('/(app)/app')} class="hover:text-fg">
				{m.public_recipe_box()} →
			</a>
		</div>
	</footer>
</div>
