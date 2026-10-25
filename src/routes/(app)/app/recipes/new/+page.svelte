<script lang="ts">
	import { resolve } from '$app/paths';
	import { tick } from 'svelte';
	import RecipeForm from '#lib/components/RecipeForm.svelte';
	import RecipePdfImport from '#lib/components/RecipePdfImport.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { ParsedRecipe } from '#lib/recipe-parse.ts';
	import type { RecipeFormInitial } from '#lib/types.ts';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();

	let imported = $state<ParsedRecipe | null>(null);
	// Re-keying the form is what makes an import replace the fields already there.
	let formVersion = $state(0);
	let ignoredForm = $state<PageProps['form'] | undefined>(undefined);
	let formHost: HTMLDivElement | null = null;

	function captureFormHost(node: HTMLDivElement) {
		formHost = node;
		return () => {
			formHost = null;
		};
	}

	const initial = $derived<RecipeFormInitial>(
		imported
			? {
					title: imported.title,
					description: imported.description || null,
					notes: imported.notes || null,
					servings: imported.servings ?? undefined,
					prepMinutes: imported.prepMinutes,
					cookMinutes: imported.cookMinutes,
					ingredients: imported.ingredients,
					steps: imported.steps.map((instruction) => ({ instruction }))
				}
			: {}
	);

	async function onParsed(recipe: ParsedRecipe) {
		imported = recipe;
		// Any validation message from before the import belongs to the old fields.
		ignoredForm = form ?? undefined;
		formVersion += 1;

		await tick();

		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		formHost?.scrollIntoView({
			behavior: reduceMotion ? 'auto' : 'smooth',
			block: 'start'
		});
	}
</script>

<svelte:head>
	<title>{m.recipe_new_title()} · {m.app_name()}</title>
</svelte:head>

<div class="mx-auto max-w-3xl">
	<header>
		<p class="eyebrow">{m.app_name()}</p>
		<h1 class="mt-2 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
			{m.recipe_new_title()}
		</h1>
		<p class="mt-2 text-sm text-fg-subtle">
			{m.recipe_new_subtitle()}
		</p>
	</header>

	<div class="mt-6">
		<RecipePdfImport onparsed={onParsed} />
	</div>

	<div class="mt-8 scroll-mt-24" {@attach captureFormHost}>
		{#key formVersion}
			<RecipeForm
				form={form === ignoredForm ? null : form}
				{initial}
				cancelHref={resolve('/(app)/app')}
			/>
		{/key}
	</div>
</div>
