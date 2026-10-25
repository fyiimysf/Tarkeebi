<script lang="ts">
	import { resolve } from '$app/paths';
	import CookMode from '#lib/components/CookMode.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const recipe = $derived(data.recipe);
</script>

<svelte:head>
	<!-- A presentation of the recipe, not a page of its own. -->
	<meta name="robots" content="noindex, follow" />
</svelte:head>

<CookMode
	title={recipe.title}
	servings={recipe.servings}
	ingredients={recipe.ingredients}
	steps={recipe.steps}
	backHref={resolve('/(public)/r/[slug]', { slug: recipe.slug })}
	cookAction="?/markCooked"
/>
