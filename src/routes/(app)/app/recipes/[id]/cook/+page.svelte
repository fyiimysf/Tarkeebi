<script lang="ts">
	import { resolve } from '$app/paths';
	import CookMode from '#lib/components/CookMode.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const recipe = $derived(data.recipe);
</script>

<CookMode
	title={recipe.title}
	servings={recipe.servings}
	ingredients={recipe.ingredients}
	steps={recipe.steps}
	backHref={resolve('/(app)/app/recipes/[id]', { id: recipe.id })}
	cookAction="?/markCooked"
/>
