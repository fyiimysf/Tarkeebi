<script lang="ts">
	import { onMount } from 'svelte';
	import { readDashboard } from '#lib/cache.ts';
	import type { DashboardContentData, RecipeSummaryData, RecipeTagRef } from '#lib/types.ts';
	import DashboardCacheWriter from './DashboardCacheWriter.svelte';
	import PageLoadError from './PageLoadError.svelte';
	import RecipeLibrary from './RecipeLibrary.svelte';
	import RecipeLibrarySkeleton from './RecipeLibrarySkeleton.svelte';

	let {
		content,
		userId
	}: {
		content: Promise<DashboardContentData>;
		userId: string;
	} = $props();

	// Keep one RecipeLibrary instance mounted while the streamed data replaces
	// the cached snapshot. Remounting it would discard in-progress search input.
	let recipes = $state<RecipeSummaryData[] | null>(null);
	let tags = $state<RecipeTagRef[]>([]);
	let failed = $state(false);

	onMount(() => {
		const cached = readDashboard(userId);
		if (!cached) return;
		recipes = cached.recipes;
		tags = cached.tags;
	});
</script>

{#if recipes}
	<RecipeLibrary {recipes} {tags} />
{:else if failed}
	<PageLoadError />
{:else}
	<RecipeLibrarySkeleton />
{/if}

{#key content}
	<DashboardCacheWriter
		{content}
		{userId}
		onContent={(value) => {
			recipes = value.recipes;
			tags = value.tags;
			failed = false;
		}}
		onError={() => (failed = true)}
	/>
{/key}
