<script lang="ts">
	import { onMount } from 'svelte';
	import { readRecipe } from '#lib/cache.ts';
	import type { RecipeDetailData } from '#lib/types.ts';
	import PageLoadError from './PageLoadError.svelte';
	import RecipeCacheWriter from './RecipeCacheWriter.svelte';
	import RecipeDetailSkeleton from './RecipeDetailSkeleton.svelte';
	import RecipeView from './RecipeView.svelte';

	let {
		recipe: recipePromise,
		userId,
		recipeId
	}: {
		recipe: Promise<RecipeDetailData>;
		userId: string;
		recipeId: string;
	} = $props();

	// Keep one RecipeView (and its action/cook state) mounted while fresh data
	// replaces the cached snapshot.
	let recipe = $state<RecipeDetailData | null>(null);
	let failed = $state(false);

	onMount(() => {
		recipe = readRecipe(userId, recipeId);
	});
</script>

{#if recipe}
	<RecipeView {recipe} {userId} />
{:else if failed}
	<PageLoadError />
{:else}
	<RecipeDetailSkeleton />
{/if}

{#key recipePromise}
	<RecipeCacheWriter
		recipe={recipePromise}
		{userId}
		onRecipe={(value) => {
			recipe = value;
			failed = false;
		}}
		onError={() => (failed = true)}
	/>
{/key}
