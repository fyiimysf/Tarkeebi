<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { CirclePlus, Search, X } from '@lucide/svelte';
	import { onDestroy, untrack } from 'svelte';
	import { flip } from 'svelte/animate';
	import { fly } from 'svelte/transition';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import RecipeCard from '#lib/components/RecipeCard.svelte';
	import { recipeCountLabel } from '#lib/format.ts';
	import { flipParams, flyParams } from '#lib/motion.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { RecipeSummaryData, RecipeTagRef } from '#lib/types.ts';

	type RecipeStatCounts = {
		recipes: number;
		favorites: number;
		published: number;
		cooked: number;
	};

	let { recipes, tags }: { recipes: RecipeSummaryData[]; tags: RecipeTagRef[] } = $props();

	const counts = $derived<RecipeStatCounts>({
		recipes: recipes.length,
		favorites: recipes.filter((recipe) => recipe.isFavorite).length,
		published: recipes.filter((recipe) => recipe.isPublic).length,
		cooked: recipes.reduce((total, recipe) => total + recipe.cookedCount, 0)
	});

	const filters = [
		{ id: 'all', label: () => m.filter_all() },
		{ id: 'favorites', label: () => m.filter_favorites() },
		{ id: 'published', label: () => m.filter_published() },
		{ id: 'drafts', label: () => m.filter_drafts() }
	] as const;

	const sorts = [
		{ id: 'recent', label: () => m.sort_recent() },
		{ id: 'title', label: () => m.sort_title() },
		{ id: 'quickest', label: () => m.sort_quickest() },
		{ id: 'cooked', label: () => m.sort_cooked() }
	] as const;

	type Filter = (typeof filters)[number]['id'];
	type Sort = (typeof sorts)[number]['id'];

	// The URL is the source of truth for the initial view. On a back/forward
	// into a shallow history entry, `page.url` still describes the last full
	// navigation while `page.shallow.url` is the entry being restored, so read
	// the effective URL here rather than the (possibly stale) server data.
	const initialUrl = untrack(() => page.shallow?.url ?? page.url);

	let searchTerm = $state(initialUrl.searchParams.get('q') ?? '');
	let filter = $state<Filter>(toFilter(initialUrl.searchParams.get('filter')));
	let sort = $state<Sort>(toSort(initialUrl.searchParams.get('sort')));
	let activeTag = $state(initialUrl.searchParams.get('tag') ?? '');

	let urlTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => clearTimeout(urlTimer));

	const normalize = (value: string) =>
		value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();

	// Title, description and tags all participate in search. Normalizing every
	// recipe is the expensive part, so build the index once when the list
	// changes rather than on every keystroke.
	const searchIndex = $derived.by(() =>
		recipes.map((recipe) => ({
			recipe,
			haystack: normalize(
				[
					recipe.title,
					recipe.description ?? '',
					...recipe.tags.flatMap((entry) => [entry.name, entry.slug])
				].join('\n')
			)
		}))
	);

	const visibleRecipes = $derived.by(() => {
		const terms = normalize(searchTerm.trim())
			.split(/\s+/)
			.map((term) => term.replace(/^#+/, ''))
			.filter(Boolean);

		const matched = searchIndex
			.filter(({ recipe, haystack }) => {
				if (filter === 'favorites' && !recipe.isFavorite) return false;
				if (filter === 'published' && !recipe.isPublic) return false;
				if (filter === 'drafts' && recipe.isPublic) return false;
				if (activeTag && !recipe.tags.some((entry) => entry.slug === activeTag)) return false;
				if (terms.length === 0) return true;

				// Every word must match somewhere, so "chicken lemon" narrows
				// rather than widens.
				return terms.every((term) => haystack.includes(term));
			})
			.map(({ recipe }) => recipe);

		return matched.sort((a, b) => {
			switch (sort) {
				case 'title':
					return a.title.localeCompare(b.title);
				case 'quickest':
					return a.totalMinutes - b.totalMinutes;
				case 'cooked':
					return b.cookedCount - a.cookedCount || b.createdAt.getTime() - a.createdAt.getTime();
				default:
					return b.createdAt.getTime() - a.createdAt.getTime();
			}
		});
	});

	const statItems = $derived([
		{ label: m.stats_recipes(), value: counts.recipes },
		{ label: m.stats_favorites(), value: counts.favorites },
		{ label: m.stats_published(), value: counts.published },
		{ label: m.stats_cooked(), value: counts.cooked }
	]);

	function toFilter(value: string | null): Filter {
		return filters.some((entry) => entry.id === value) ? (value as Filter) : 'all';
	}

	function toSort(value: string | null): Sort {
		return sorts.some((entry) => entry.id === value) ? (value as Sort) : 'recent';
	}

	function buildQuery(
		patch: Partial<{
			q: string | null;
			filter: Filter | null;
			sort: Sort | null;
			tag: string | null;
		}> = {}
	) {
		const params = new URLSearchParams();
		const next = {
			q: searchTerm.trim(),
			filter,
			sort,
			tag: activeTag,
			...patch
		};
		if (next.q) params.set('q', next.q);
		if (next.filter && next.filter !== 'all') params.set('filter', next.filter);
		if (next.sort && next.sort !== 'recent') params.set('sort', next.sort);
		if (next.tag) params.set('tag', next.tag);
		const search = params.toString();
		return search ? `${resolve('/(app)/app')}?${search}` : resolve('/(app)/app');
	}

	async function syncUrl(replace: boolean) {
		const next = buildQuery();
		const current = `${window.location.pathname}${window.location.search}`;
		if (next === current) return;

		// Shallow routing keeps the URL shareable without re-running the server
		// load on every keystroke.
		await goto(next, { replace, reset: false, shallow: true });
	}

	function scheduleUrlSync() {
		clearTimeout(urlTimer);
		urlTimer = setTimeout(() => void syncUrl(true), 250);
	}

	function onSearchInput(event: Event) {
		searchTerm = (event.currentTarget as HTMLInputElement).value;
		scheduleUrlSync();
	}

	function onSearchSubmit(event: SubmitEvent) {
		// The form remains a no-JS fallback; with JS the results follow the typing.
		event.preventDefault();
		clearTimeout(urlTimer);
		void syncUrl(true);
	}

	function isPlainClick(event: MouseEvent) {
		return (
			!event.defaultPrevented &&
			event.button === 0 &&
			!event.metaKey &&
			!event.ctrlKey &&
			!event.shiftKey &&
			!event.altKey
		);
	}

	function onFilterClick(event: MouseEvent, next: Filter) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		clearTimeout(urlTimer);
		filter = next;
		void syncUrl(false);
	}

	function onTagClick(event: MouseEvent, slug: string) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		clearTimeout(urlTimer);
		activeTag = activeTag === slug ? '' : slug;
		void syncUrl(false);
	}

	function onClearTag(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		clearTimeout(urlTimer);
		activeTag = '';
		void syncUrl(false);
	}

	function onReset(event: MouseEvent) {
		if (!isPlainClick(event)) return;
		event.preventDefault();
		clearTimeout(urlTimer);
		searchTerm = '';
		filter = 'all';
		sort = 'recent';
		activeTag = '';
		void syncUrl(false);
	}

	function onSortChange(event: Event) {
		clearTimeout(urlTimer);
		sort = (event.currentTarget as HTMLSelectElement).value as Sort;
		void syncUrl(false);
	}

	// Adopt URL state when the browser navigates without us (back/forward, a
	// sidebar link to /app, a redirect). A shallow history entry reached via
	// back/forward is a `popstate` and must be adopted too; our own shallow URL
	// syncs already match local state and can be ignored.
	afterNavigate((navigation) => {
		if (navigation.shallow && navigation.type !== 'popstate') return;
		clearTimeout(urlTimer);
		const params = (navigation.to?.url ?? new URL(window.location.href)).searchParams;
		searchTerm = params.get('q') ?? '';
		filter = toFilter(params.get('filter'));
		sort = toSort(params.get('sort'));
		activeTag = params.get('tag') ?? '';
	});
</script>

{#if counts.recipes > 0}
	<dl class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
		{#each statItems as stat (stat.label)}
			<div class="card px-4 py-3">
				<dt class="text-xs font-medium text-fg-subtle">{stat.label}</dt>
				<dd class="mt-1 font-display text-2xl font-bold tabular-nums">{stat.value}</dd>
			</div>
		{/each}
	</dl>
{/if}

<form method="get" class="relative mt-6" onsubmit={onSearchSubmit}>
	{#if filter !== 'all'}<input type="hidden" name="filter" value={filter} />{/if}
	{#if sort !== 'recent'}<input type="hidden" name="sort" value={sort} />{/if}
	{#if activeTag}<input type="hidden" name="tag" value={activeTag} />{/if}
	<Search class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-fg-subtle" />
	<input
		type="search"
		name="q"
		value={searchTerm}
		oninput={onSearchInput}
		placeholder={m.recipes_search()}
		aria-label={m.recipes_search()}
		class="input ps-9"
	/>
</form>

<div class="mt-4 flex flex-wrap items-center gap-2">
	{#each filters as entry (entry.id)}
		<a
			href={buildQuery({ filter: entry.id })}
			aria-current={filter === entry.id ? 'true' : undefined}
			class="chip {filter === entry.id ? 'chip-active' : ''}"
			onclick={(event) => onFilterClick(event, entry.id)}
		>
			{entry.label()}
		</a>
	{/each}

	<span class="ms-auto inline-flex items-center gap-1.5">
		<label for="sort" class="sr-only">{m.sort_label()}</label>
		<select
			id="sort"
			class="input w-auto cursor-pointer py-1.5 text-base sm:text-xs"
			value={sort}
			onchange={onSortChange}
		>
			{#each sorts as entry (entry.id)}
				<option value={entry.id}>{entry.label()}</option>
			{/each}
		</select>
	</span>
</div>

{#if tags.length > 0}
	<div class="mt-3 flex flex-wrap gap-1.5">
		{#each tags as entry (entry.slug)}
			<a
				href={buildQuery({ tag: activeTag === entry.slug ? null : entry.slug })}
				aria-current={activeTag === entry.slug ? 'true' : undefined}
				class="chip {activeTag === entry.slug ? 'chip-active' : ''}"
				onclick={(event) => onTagClick(event, entry.slug)}
			>
				#{entry.name}
			</a>
		{/each}
		{#if activeTag}
			<a href={buildQuery({ tag: null })} class="chip" onclick={onClearTag}>
				<X class="size-3" />
				{m.filter_clear_tag()}
			</a>
		{/if}
	</div>
{/if}

{#if visibleRecipes.length > 0}
	<p class="mt-5 text-xs text-fg-subtle" aria-live="polite">
		{recipeCountLabel(visibleRecipes.length)}
	</p>
	<div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each visibleRecipes as recipe, index (recipe.id)}
			<div
				class="min-w-0"
				animate:flip={flipParams(180)}
				in:fly={flyParams({ y: 10, duration: 200, delay: Math.min(index * 25, 150) })}
			>
				<RecipeCard {recipe} />
			</div>
		{/each}
	</div>
{:else if searchTerm.trim() || filter !== 'all' || activeTag}
	<div class="mt-6">
		<EmptyState title={m.recipes_no_results_title()} body={m.recipes_no_results_body()}>
			{#snippet action()}
				<a href={resolve('/(app)/app')} class="btn-secondary" onclick={onReset}>
					{m.recipes_reset()}
				</a>
			{/snippet}
		</EmptyState>
	</div>
{:else}
	<div class="mt-6">
		<EmptyState title={m.recipes_empty_title()} body={m.recipes_empty_body()}>
			{#snippet action()}
				<a href={resolve('/(app)/app/recipes/new')} class="btn-primary">
					<CirclePlus class="size-4" />
					{m.recipes_empty_cta()}
				</a>
			{/snippet}
		</EmptyState>
	</div>
{/if}
