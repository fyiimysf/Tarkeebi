<script lang="ts">
	import { onMount } from 'svelte';

	type RecipeStats = {
		recipes: number;
		favorites: number;
		published: number;
		cooked: number;
	};

	let {
		promise,
		onStats
	}: {
		promise: Promise<RecipeStats>;
		onStats: (stats: RecipeStats) => void;
	} = $props();

	onMount(() => {
		let active = true;

		void Promise.resolve(promise)
			.then((value) => {
				if (active) onStats(value);
			})
			.catch(() => {});

		return () => {
			active = false;
		};
	});
</script>

<!-- Resolves streamed sidebar counts without blocking the route. -->
