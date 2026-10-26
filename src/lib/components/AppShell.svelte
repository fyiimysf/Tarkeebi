<script lang="ts">
	import type { Snippet } from 'svelte';
	import { navigating, page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		BookOpen,
		CirclePlus,
		ExternalLink,
		FilePenLine,
		Globe,
		Heart,
		LoaderCircle,
		Settings,
		Sparkles
	} from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { SessionUser } from '#lib/types.ts';
	import Logo from './Logo.svelte';
	import MobileTabBar from './MobileTabBar.svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import UserMenu from './UserMenu.svelte';

	let {
		user,
		stats,
		children
	}: {
		user: SessionUser;
		stats?: { recipes: number; favorites: number; published: number; cooked: number };
		children: Snippet;
	} = $props();

	type NavItem = {
		key: string;
		id: string;
		also: string[];
		href: string;
		label: () => string;
		icon: typeof BookOpen;
		count: () => number | undefined;
		filter?: 'favorites' | 'drafts';
	};

	const nav: NavItem[] = [
		{
			key: 'recipes',
			id: '/(app)/app',
			also: ['/(app)/app/recipes/[id]', '/(app)/app/recipes/[id]/edit'],
			href: resolve('/(app)/app'),
			label: () => m.nav_my_recipes(),
			icon: BookOpen,
			count: () => stats?.recipes
		},
		{
			key: 'favorites',
			id: '/(app)/app',
			also: [],
			href: `${resolve('/(app)/app')}?filter=favorites`,
			label: () => m.filter_favorites(),
			icon: Heart,
			count: () => stats?.favorites,
			filter: 'favorites'
		},
		{
			key: 'drafts',
			id: '/(app)/app',
			also: [],
			href: `${resolve('/(app)/app')}?filter=drafts`,
			label: () => m.filter_drafts(),
			icon: FilePenLine,
			count: () => (stats ? Math.max(0, stats.recipes - stats.published) : undefined),
			filter: 'drafts'
		},
		{
			key: 'settings',
			id: '/(app)/app/settings',
			also: [],
			href: resolve('/(app)/app/settings'),
			label: () => m.nav_settings(),
			icon: Settings,
			count: () => undefined
		}
	];

	/** Promoted out of the tab list: a filled button on desktop, a FAB on mobile. */
	const newRecipeHref = resolve('/(app)/app/recipes/new');

	// Shallow routing updates the address bar and `page.shallow`, but deliberately
	// leaves `page.url` pointing at the last full navigation. Use the shallow
	// target when present so the sidebar highlight follows quick filters too.
	const currentUrl = $derived(page.shallow?.url ?? page.url);

	/** Leaves the app for the public recipe site, so it opens in its own tab. */
	const publicNav = {
		href: resolve('/(public)'),
		label: () => m.nav_public_home(),
		icon: Globe
	};
	const PublicNavIcon = publicNav.icon;

	function isActive(item: NavItem) {
		const routeId = page.route.id ?? '';
		if (routeId !== item.id && !item.also.includes(routeId)) return false;

		// The dashboard's filter views all share one route, so the query string
		// decides which sidebar item is current.
		if (routeId !== '/(app)/app') return true;
		const current = currentUrl.searchParams.get('filter');
		if (item.filter) return current === item.filter;
		return current !== 'favorites' && current !== 'drafts';
	}

	function isPending(href: string) {
		if (!navigating.to) return false;
		const target = new URL(href, page.url.origin);
		return (
			target.pathname === navigating.to.url.pathname && target.search === navigating.to.url.search
		);
	}
</script>

<div class="min-h-dvh">
	<!-- Desktop sidebar -->
	<aside
		class="no-print fixed inset-y-0 start-0 z-30 hidden w-64 flex-col border-e border-border bg-surface px-4 py-5 md:flex"
	>
		<a href={resolve('/(app)/app')} class="px-2">
			<Logo />
		</a>

		<a href={newRecipeHref} class="btn-primary mt-6 w-full rounded-full py-2.5 no-underline">
			<CirclePlus class="size-4" />
			{m.nav_new_recipe()}
		</a>

		<nav class="mt-4 flex flex-col gap-1" aria-label={m.nav_my_recipes()}>
			{#each nav as item (item.key)}
				{@const Icon = item.icon}
				{@const active = isActive(item)}
				{@const count = item.count()}
				{@const pending = isPending(item.href)}
				<a
					href={item.href}
					aria-current={active ? 'page' : undefined}
					aria-busy={pending}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition {active
						? 'bg-accent-soft text-accent '
						: 'text-fg-muted hover:bg-surface-sunken hover:text-fg '}"
				>
					{#if pending}
						<LoaderCircle class="size-5 shrink-0 animate-spin" />
					{:else}
						<Icon class="size-5 shrink-0" />
					{/if}
					<span class="flex-1">{item.label()}</span>
					{#if count !== undefined}
						<span
							class="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums {active
								? 'bg-accent-soft text-accent '
								: 'bg-surface-sunken text-fg-subtle '}"
						>
							{count}
						</span>
					{/if}
				</a>
			{/each}

			<!-- The public site is a separate surface, not part of the app routes. -->
			<a
				href={publicNav.href}
				target="_blank"
				rel="noreferrer"
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-fg-muted transition hover:bg-surface-sunken hover:text-fg"
			>
				<PublicNavIcon class="size-5 shrink-0" />
				<span class="flex-1">{publicNav.label()}</span>
				<ExternalLink class="size-3.5 shrink-0 text-fg-subtle" />
			</a>
		</nav>

		<!-- Fills the tall column with something worth glancing at. -->
		<section class="mt-6" aria-label={m.stats_recipes()}>
			<h2 class="px-3 text-xs font-semibold tracking-[0.14em] text-fg-subtle uppercase">
				{m.stats_recipes()}
			</h2>
			<ul class="mt-2 flex flex-col gap-1">
				<li class="flex items-center gap-3 rounded-lg px-3 py-2">
					<BookOpen class="size-4 shrink-0 text-fg-subtle" />
					<span class="flex-1 text-sm text-fg-muted">
						{m.nav_recipes()}
					</span>
					<span class="text-sm font-semibold tabular-nums">{stats?.recipes ?? 0}</span>
				</li>
				<li class="flex items-center gap-3 rounded-lg px-3 py-2">
					<Heart class="size-4 shrink-0 text-accent" />
					<span class="flex-1 text-sm text-fg-muted">
						{m.stats_favorites()}
					</span>
					<span class="text-sm font-semibold tabular-nums">{stats?.favorites ?? 0}</span>
				</li>
				<li class="flex items-center gap-3 rounded-lg px-3 py-2">
					<Sparkles class="size-4 shrink-0 text-accent" />
					<span class="flex-1 text-sm text-fg-muted">
						{m.stats_cooked()}
					</span>
					<span class="text-sm font-semibold tabular-nums">{stats?.cooked ?? 0}</span>
				</li>
			</ul>
		</section>

		<div class="flex-1"></div>

		<div class="mt-2 flex items-center gap-1 border-t border-border pt-4">
			<UserMenu {user} />
			<span class="truncate text-sm font-medium">{user.name}</span>
			<span class="ms-auto"><ThemeToggle /></span>
		</div>
	</aside>

	<!-- Mobile top bar: the public site link replaces the profile button. -->
	<header
		class="no-print sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/85 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur md:hidden"
	>
		<a href={resolve('/(app)/app')}><Logo /></a>
		<div class="flex items-center gap-1">
			<ThemeToggle />
			<a
				href={publicNav.href}
				target="_blank"
				rel="noreferrer"
				class="btn-ghost size-10 p-0 no-underline"
				aria-label={publicNav.label()}
				title={publicNav.label()}
			>
				<PublicNavIcon class="size-5" />
			</a>
		</div>
	</header>

	<main class="md:ps-64">
		<div class="mx-auto w-full max-w-5xl px-4 py-6 pb-40 md:px-8 md:py-10 md:pb-10">
			{@render children()}
		</div>
	</main>

	<!-- Mobile bottom bar, iOS 26 style: a floating tab pill plus a trailing
       icon-only compose button, both hovering above the safe area. -->
	<MobileTabBar />
</div>
