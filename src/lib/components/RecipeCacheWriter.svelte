<script lang="ts">
	import { onMount } from 'svelte';
	import {
		currentCacheRevision,
		summaryFromDetail,
		upsertDashboardRecipe,
		writeRecipe
	} from '#lib/cache.ts';
	import type { RecipeDetailData } from '#lib/types.ts';

	let {
		recipe,
		userId,
		onRecipe,
		onError
	}: {
		recipe: Promise<RecipeDetailData>;
		userId: string;
		onRecipe?: (recipe: RecipeDetailData) => void;
		onError?: () => void;
	} = $props();

	onMount(() => {
		const revision = currentCacheRevision();
		let active = true;

		void Promise.resolve(recipe)
			.then((value) => {
				if (!active || currentCacheRevision() !== revision) return;

				onRecipe?.(value);
				writeRecipe(userId, value);
				upsertDashboardRecipe(userId, summaryFromDetail(value));
			})
			.catch(() => {
				if (active && currentCacheRevision() === revision) onError?.();
			});

		return () => {
			active = false;
		};
	});
</script>

<!-- Persists the streamed recipe snapshot and hands it to the page. -->
