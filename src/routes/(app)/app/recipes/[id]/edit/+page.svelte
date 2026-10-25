<script lang="ts">
	import { resolve } from '$app/paths';
	import RecipeForm from '#lib/components/RecipeForm.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const recipe = $derived(data.recipe);
</script>

<svelte:head>
	<title>{m.recipe_edit_title()} · {recipe.title} · {m.app_name()}</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<header>
		<p class="eyebrow">{m.recipe_edit_title()}</p>
		<h1 class="mt-2 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
			{recipe.title}
		</h1>
	</header>

	<div class="mt-6">
		<RecipeForm
			{form}
			initial={{
				title: recipe.title,
				description: recipe.description,
				notes: recipe.notes,
				servings: recipe.servings,
				prepMinutes: recipe.prepMinutes,
				cookMinutes: recipe.cookMinutes,
				sourceUrl: recipe.sourceUrl,
				imageUrl: recipe.imageUrl,
				isPublic: recipe.isPublic,
				tags: recipe.tags,
				ingredients: recipe.ingredients,
				steps: recipe.steps
			}}
			submitLabel={m.recipe_save_changes()}
			cancelHref={resolve('/(app)/app/recipes/[id]', { id: recipe.id })}
		/>
	</div>
</div>
