<script lang="ts">
	import { onMount } from 'svelte';
	import { currentCacheRevision, writeDashboard } from '#lib/cache.ts';
	import type { DashboardContentData } from '#lib/types.ts';

	let {
		content,
		userId,
		onContent,
		onError
	}: {
		content: Promise<DashboardContentData>;
		userId: string;
		onContent?: (content: DashboardContentData) => void;
		onError?: () => void;
	} = $props();

	// A keyed wrapper remounts this component when a new streamed snapshot
	// arrives, so onMount is the right hook for a one-shot persistence write.
	onMount(() => {
		const revision = currentCacheRevision();
		let active = true;

		void Promise.resolve(content)
			.then((snapshot) => {
				if (!active || currentCacheRevision() !== revision) return;

				onContent?.(snapshot);
				writeDashboard(userId, snapshot.recipes, snapshot.tags);
			})
			.catch(() => {
				if (active && currentCacheRevision() === revision) onError?.();
			});

		return () => {
			active = false;
		};
	});
</script>

<!-- Persists the streamed dashboard snapshot and hands it to the page. -->
