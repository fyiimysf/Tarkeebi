<script lang="ts">
	import { navigating, page } from '$app/state';
	import { resolve } from '$app/paths';
	import { BookOpen, LoaderCircle, Plus, Settings } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * The mobile-only bottom bar: a classic full-width bar with two tabs, and an
	 * Add button set into a notched, indented slot in the middle of the top edge.
	 *
	 * The notch is a real hole in the bar's surface, produced with a `clip-path`
	 * referencing an SVG `clipPath` in `userSpaceOnUse` units, so the bite is a
	 * fixed size at any viewport width. `clip-path` is used rather than a CSS
	 * mask because a single-layer mask cannot cut a hole on its own, and
	 * multi-layer `mask-composite` is still not portable — Blink rejects
	 * `intersect` and silently falls back to `source-in`, inverting the effect.
	 */
	const tabs = [
		{
			id: '/(app)/app',
			also: ['/(app)/app/recipes/[id]', '/(app)/app/recipes/[id]/edit'],
			href: resolve('/(app)/app'),
			label: () => m.nav_my_recipes(),
			icon: BookOpen
		},
		{
			id: '/(app)/app/settings',
			also: [],
			href: resolve('/(app)/app/settings'),
			label: () => m.nav_settings(),
			icon: Settings
		}
	];

	const newRecipeHref = resolve('/(app)/app/recipes/new');

	/**
	 * The FAB rests with its centre exactly on the bar's top edge, so the
	 * cutout is struck from the same centre as the button. Its radius is the
	 * button's plus an explicit gap: that ring of page background between the
	 * two edges is what makes the notch read as a recess rather than the button
	 * merely sitting on top of a hole.
	 *
	 * `fabSize` must stay in sync with the `size-14` class on the button.
	 */
	const fabSize = 56;
	const notchGap = 8;
	const notchRadius = fabSize / 1 + notchGap;

	/**
	 * The bar spans the viewport, and the notch clip needs the real width in
	 * pixels. Measured with a `ResizeObserver` attachment on the bar itself, so
	 * it stays correct through an orientation change or a desktop→mobile resize.
	 */
	let barWidth = $state(390);

	const centreX = $derived(barWidth / 2);

	const measureBar = (node: HTMLElement) => {
		const observer = new ResizeObserver(() => (barWidth = node.clientWidth));
		observer.observe(node);
		barWidth = node.clientWidth;
		return () => observer.disconnect();
	};

	function isActive(tab: (typeof tabs)[number]) {
		return page.route.id === tab.id || tab.also.includes(page.route.id ?? '');
	}

	function isPending(href: string) {
		if (!navigating.to) return false;
		const target = new URL(href, page.url.origin);
		return (
			target.pathname === navigating.to.url.pathname && target.search === navigating.to.url.search
		);
	}

	const creating = $derived(isPending(newRecipeHref));

	/**
	 * The recipe form owns the bottom edge — it has its own sticky Save/Cancel
	 * bar — so the whole navigation bar steps aside there.
	 */
	const hidden = $derived(
		page.route.id === '/(app)/app/recipes/new' || page.route.id === '/(app)/app/recipes/[id]/edit'
	);
</script>

{#if !hidden}
	<!-- Spacer only: keeps page content clear of the fixed bar. -->
	<div
		class="no-print h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden"
		aria-hidden="true"
	></div>

	<div
		class="no-print fixed inset-x-0 bottom-0 z-30 md:hidden"
		style="padding-bottom: env(safe-area-inset-bottom)"
	>
		<div class="relative h-18" {@attach measureBar}>
			<!-- The bar surface. The notch is cut by an SVG clipPath in
			     `userSpaceOnUse`, which lets the straight edges follow the viewport
			     while the bite stays a fixed pixel size — a proportional clip would
			     leave the FAB overhanging a smaller bite on narrow phones. -->
			<div
				class="absolute inset-0 bg-surface/90 backdrop-blur-xl"
				style="clip-path: url(#tab-bar-notch)"
			></div>

			<!--
				Tabs are laid out with flex rather than a 3-column grid: a grid gave
				each tab a third of the width, which pushed them to the far edges and
				left the notch flanked by empty lanes. Each tab now takes only the
				space it needs and the pair is centred as a group, with a centre gap
				sized to clear the notch.
			-->
			<nav class="relative flex h-full items-stretch" aria-label={m.nav_my_recipes()}>
				{#each tabs as tab, i (tab.id)}
					{@const Icon = tab.icon}
					{@const active = isActive(tab)}
					{@const pending = isPending(tab.href)}
					{#if i === 1}
						<!-- The notch's empty lane; the FAB occupies it from above. -->
						<span class="w-[5.5rem] shrink-0" aria-hidden="true"></span>
					{/if}
					<a
						href={tab.href}
						aria-current={active ? 'page' : undefined}
						aria-busy={pending}
						class="flex flex-1 flex-col items-center justify-center gap-1 pt-2 text-[11px] font-medium {active
							? 'text-accent'
							: 'text-fg-subtle'}"
					>
						{#if pending}
							<LoaderCircle class="size-5 animate-spin" />
						{:else}
							<Icon class="size-5" />
						{/if}
						<span>{tab.label()}</span>
					</a>
				{/each}
			</nav>

			<!-- Compose button, lifted so it rests inside the notch. Icon-only: the
			     accessible name carries the meaning, and a text label would overflow
			     the bite in the longer locales. -->

			<a
				href={newRecipeHref}
				aria-label={m.nav_new_recipe()}
				title={m.nav_new_recipe()}
				aria-busy={creating}
				class=" absolute inset-s-1/2 top-0 grid h-14 w-28 -translate-x-1/2 place-items-center rounded-b-full bg-accent text-accent-fg shadow-raised transition-colors hover:bg-accent-hover motion-safe:active:scale-95 rtl:translate-x-1/2"
			>
				<span class="flex flex-col items-center justify-center pb-1">
					{#if creating}
						<LoaderCircle class="size-8 animate-spin" />
					{:else}
						<Plus class="size-8" title="Add" />
					{/if}
					<p class="text-[11px] font-medium">Add</p>
				</span>
			</a>
		</div>
	</div>

	<!--
		The notch geometry, in `userSpaceOnUse` so the cutout is a fixed pixel
		size at any viewport width. A true circular arc, struck from the FAB's
		centre on the bar's top edge: the sweep runs downward into the bar
		(sweep-flag 0) so the hole is the lower half of that circle, which leaves
		a uniform `notchGap` around the button's exposed edge.
	-->
	<svg width="0" height="0" class="absolute" aria-hidden="true" focusable="false">
		<defs>
			<clipPath id="tab-bar-notch" clipPathUnits="userSpaceOnUse">
				<!-- prettier-ignore -->
				<path d="M0,0 H{centreX - notchRadius} A{notchRadius},{notchRadius} 0 0 0 {centreX + notchRadius},0 H{barWidth} V72 H0 Z" />
			</clipPath>
		</defs>
	</svg>
{/if}
