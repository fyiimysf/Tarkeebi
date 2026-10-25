<script lang="ts">
	import { ChefHat, Clock, Globe, Star, Users } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { servingsLabel } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatMinutes } from '#lib/time.ts';
	import type { RecipeSummary } from '#lib/types.ts';

	let { recipe }: { recipe: RecipeSummary } = $props();

	const totalMinutes = $derived((recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0));
</script>

<a
	href={resolve('/(app)/app/recipes/[id]', { id: recipe.id })}
	class="card group flex h-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-lifted motion-safe:hover:-translate-y-0.5"
>
	<div class="relative aspect-[4/3] w-full overflow-hidden bg-surface-sunken">
		{#if recipe.imageUrl}
			<img
				src={recipe.imageUrl}
				alt=""
				loading="lazy"
				class="size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
			/>
		{:else}
			<ChefHat class="absolute inset-0 m-auto size-10 text-fg-subtle" strokeWidth={1.5} />
		{/if}
		{#if recipe.isFavorite}
			<span
				class="absolute end-2 top-2 grid size-7 place-items-center rounded-full bg-surface/90 text-accent shadow"
				title={m.recipe_favorited()}
			>
				<Star class="size-4 fill-current" />
			</span>
		{/if}
		{#if recipe.isPublic}
			<span
				class="absolute start-2 top-2 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[11px] font-medium text-success shadow"
			>
				<Globe class="size-3" />
				{m.recipe_published()}
			</span>
		{/if}
	</div>

	<div class="flex flex-1 flex-col gap-1.5 p-4">
		<h3 class="font-display line-clamp-2 text-base font-semibold leading-snug">{recipe.title}</h3>
		{#if recipe.description}
			<p class="line-clamp-2 text-sm text-fg-subtle">
				{recipe.description}
			</p>
		{/if}

		{#if recipe.tags.length > 0}
			<div class="mt-1 flex flex-wrap gap-1">
				{#each recipe.tags.slice(0, 2) as tag (tag.slug)}
					<span
						class="rounded-full bg-surface-sunken px-2 py-0.5 text-[11px] font-medium text-fg-muted"
					>
						#{tag.name}
					</span>
				{/each}
				{#if recipe.tags.length > 2}
					<span class="text-[11px] text-fg-subtle">+{recipe.tags.length - 2}</span>
				{/if}
			</div>
		{/if}

		<div class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-xs text-fg-subtle">
			<span class="inline-flex items-center gap-1">
				<Users class="size-3.5" />
				{servingsLabel(recipe.servings)}
			</span>
			{#if totalMinutes > 0}
				<span class="inline-flex items-center gap-1">
					<Clock class="size-3.5" />
					{formatMinutes(totalMinutes)}
				</span>
			{/if}
		</div>
	</div>
</a>
