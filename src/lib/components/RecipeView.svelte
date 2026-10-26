<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import {
		Clock,
		CookingPot,
		ExternalLink,
		Globe,
		GlobeLock,
		LoaderCircle,
		Share2,
		Star,
		Users
	} from '@lucide/svelte';
	import { patchCachedRecipe } from '#lib/cache.ts';
	import CookLogButton from '#lib/components/CookLogButton.svelte';
	import IngredientList from '#lib/components/IngredientList.svelte';
	import Markdown from '#lib/components/Markdown.svelte';
	import ShareLinkButton from '#lib/components/ShareLinkButton.svelte';
	import { cookedLabel, servingsLabel } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatMinutes } from '#lib/time.ts';
	import type { RecipeDetailData } from '#lib/types.ts';

	let { recipe, userId }: { recipe: RecipeDetailData; userId: string } = $props();

	const totalMinutes = $derived((recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0));
	const publicUrl = $derived(
		recipe.slug ? `${page.url.origin}${resolve('/(public)/r/[slug]', { slug: recipe.slug })}` : null
	);

	type RecipeAction = 'publish' | 'favorite' | 'share';

	let pendingAction = $state<RecipeAction | null>(null);

	const withPending =
		(action: RecipeAction): SubmitFunction =>
		() => {
			pendingAction = action;
			return async ({ result, update }) => {
				try {
					if (result.type === 'success') {
						if (action === 'favorite') {
							patchCachedRecipe(userId, recipe.id, { isFavorite: !recipe.isFavorite });
						} else if (action === 'publish') {
							patchCachedRecipe(userId, recipe.id, {
								isPublic: !recipe.isPublic,
								publishedAt: recipe.isPublic ? null : new Date()
							});
						} else if (action === 'share') {
							const slug = (result.data as { slug?: string } | null)?.slug;
							if (slug) patchCachedRecipe(userId, recipe.id, { slug });
						}
					}

					// Revalidation is already showing the cached snapshot while this
					// promise streams, so the optimistic cache patch above is visible
					// immediately instead of waiting for the fresh recipe.
					await update();
				} finally {
					pendingAction = null;
				}
			};
		};

	const handlePublish = withPending('publish');
	const handleFavorite = withPending('favorite');
	const handleShare = withPending('share');

	const lastCookedLabel = $derived(
		recipe.myLastCookedAt
			? new Intl.DateTimeFormat(undefined, {
					dateStyle: 'medium'
				}).format(recipe.myLastCookedAt)
			: null
	);

	function tagHref(slug: string) {
		const params = new URLSearchParams({ tag: slug });
		return `${resolve('/(app)/app')}?${params}`;
	}
</script>

<svelte:head>
	<title>{recipe.title} · {m.app_name()}</title>
</svelte:head>

<article class="mt-3">
	{#if recipe.imageUrl}
		<div class="card mb-6 overflow-hidden">
			<img src={recipe.imageUrl} alt="" class="aspect-[16/9] w-full object-cover" />
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
		<h1 class="font-display text-3xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-4xl">
			{recipe.title}
		</h1>
		{#if publicUrl}
			<a
				href={publicUrl}
				target="_blank"
				rel="noreferrer"
				class="btn-icon"
				aria-label={m.recipe_view_public()}
				title={m.recipe_view_public()}
			>
				<ExternalLink class="size-5" />
			</a>
		{/if}

		<!-- Action icons, pushed to the inline end of the title row -->
		<div class="no-print ms-auto flex items-center gap-1">
			{#if publicUrl}
				<ShareLinkButton url={publicUrl} title={recipe.title} variant="btn-icon" iconOnly />
			{:else}
				<form
					method="post"
					action="?/ensureSlug"
					use:enhance={handleShare}
					aria-busy={pendingAction === 'share'}
				>
					<button
						class="btn-icon"
						disabled={pendingAction !== null}
						aria-label={pendingAction === 'share'
							? m.recipe_saving()
							: m.recipe_create_share_link()}
						title={pendingAction === 'share' ? m.recipe_saving() : m.recipe_create_share_link()}
					>
						{#if pendingAction === 'share'}
							<LoaderCircle class="size-5 animate-spin" />
						{:else}
							<Share2 class="size-5" />
						{/if}
					</button>
				</form>
			{/if}

			<form
				method="post"
				action="?/togglePublished"
				use:enhance={handlePublish}
				aria-busy={pendingAction === 'publish'}
			>
				<button
					class="btn-icon {recipe.isPublic ? 'text-success ' : ''}"
					disabled={pendingAction !== null}
					aria-pressed={recipe.isPublic}
					aria-label={pendingAction === 'publish'
						? m.recipe_publishing()
						: recipe.isPublic
							? m.recipe_published()
							: m.recipe_publish()}
					title={pendingAction === 'publish'
						? m.recipe_publishing()
						: recipe.isPublic
							? m.recipe_published()
							: m.recipe_publish()}
				>
					{#if pendingAction === 'publish'}
						<LoaderCircle class="size-5 animate-spin" />
					{:else if recipe.isPublic}
						<Globe class="size-5" />
					{:else}
						<GlobeLock class="size-5" />
					{/if}
				</button>
			</form>

			<form
				method="post"
				action="?/toggleFavorite"
				use:enhance={handleFavorite}
				aria-busy={pendingAction === 'favorite'}
			>
				<button
					class="btn-icon {recipe.isFavorite ? 'text-accent ' : ''}"
					disabled={pendingAction !== null}
					aria-pressed={recipe.isFavorite}
					aria-label={pendingAction === 'favorite'
						? m.recipe_saving()
						: recipe.isFavorite
							? m.recipe_favorited()
							: m.recipe_favorite()}
					title={pendingAction === 'favorite'
						? m.recipe_saving()
						: recipe.isFavorite
							? m.recipe_favorited()
							: m.recipe_favorite()}
				>
					{#if pendingAction === 'favorite'}
						<LoaderCircle class="size-5 animate-spin" />
					{:else}
						<Star class="size-5 {recipe.isFavorite ? 'fill-current' : ''}" />
					{/if}
				</button>
			</form>
		</div>
	</div>

	<p class="sr-only" role="status" aria-live="polite">
		{#if pendingAction === 'publish'}
			{m.recipe_publishing()}
		{:else if pendingAction}
			{m.recipe_saving()}
		{/if}
	</p>

	{#if recipe.description}
		<p class="prose-editorial-lg mt-2">{recipe.description}</p>
	{/if}

	{#if !recipe.isPublic && publicUrl}
		<p class="no-print mt-2 text-xs text-fg-subtle">
			{m.recipe_private_note()}
		</p>
	{/if}

	<div class="mt-5 flex flex-wrap items-center gap-2 text-sm text-fg-subtle">
		<span class="inline-flex items-center gap-1.5">
			<Users class="size-4" />
			{servingsLabel(recipe.servings)}
		</span>
		{#if totalMinutes > 0}
			<span class="inline-flex items-center gap-1.5">
				<Clock class="size-4" />
				{formatMinutes(totalMinutes)}
			</span>
		{/if}
		{#if recipe.myCookCount > 0}
			<span class="inline-flex items-center gap-1.5">
				<CookingPot class="size-4" />
				{cookedLabel(recipe.myCookCount)}
				{#if lastCookedLabel}
					· {m.recipe_last_cooked({ date: lastCookedLabel })}
				{/if}
			</span>
		{/if}
		{#if recipe.sourceUrl}
			<a
				href={recipe.sourceUrl}
				target="_blank"
				rel="noreferrer"
				class="inline-flex items-center gap-1.5 text-accent underline-offset-4 hover:underline"
			>
				<ExternalLink class="size-4" />
				{m.recipe_source()}
			</a>
		{/if}
	</div>

	{#if recipe.tags.length > 0}
		<div class="mt-3 flex flex-wrap gap-2">
			{#each recipe.tags as tag (tag.slug)}
				<a
					href={tagHref(tag.slug)}
					class="rounded-full border border-border px-3 py-1 text-xs font-medium text-fg-muted transition hover:border-accent hover:text-accent"
				>
					#{tag.name}
				</a>
			{/each}
		</div>
	{/if}

	<div class="mt-8 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
		<IngredientList ingredients={recipe.ingredients} baseServings={recipe.servings} />

		<section class="card p-5 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-display text-2xl font-bold tracking-tight">
					{m.recipe_steps()}
				</h2>
				<CookLogButton action="?/markCooked" count={recipe.myCookCount} showCount={false} />
			</div>

			{#if recipe.steps.length > 0}
				<ol class="mt-4 space-y-4">
					{#each recipe.steps as step, index (step.id)}
						<li class="flex gap-3">
							<span
								class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent-soft-fg"
							>
								{String(index + 1).padStart(2, '0')}
							</span>
							<Markdown source={step.instruction} class="prose-editorial pt-0.5" />
						</li>
					{/each}
				</ol>
			{:else}
				<p class="mt-4 text-sm text-fg-subtle">—</p>
			{/if}
		</section>
	</div>

	{#if recipe.notes}
		<section class="card relative mt-6 overflow-hidden p-6 sm:p-8">
			<span aria-hidden="true" class="absolute inset-y-0 start-0 w-1 bg-accent"></span>
			<span
				aria-hidden="true"
				class="pointer-events-none absolute -top-2 end-4 select-none font-serif text-6xl leading-none text-accent/15 sm:text-7xl"
			>
				&rdquo;
			</span>
			<h2 class="font-display text-2xl font-bold tracking-tight">
				{m.recipe_notes()}
			</h2>
			<p class="prose-editorial-lg mt-3 whitespace-pre-line">
				{recipe.notes}
			</p>
		</section>
	{/if}
</article>

<!-- On mobile this lives in the tab bar's central action slot. -->
<a
	href={resolve('/(app)/app/recipes/[id]/cook', { id: recipe.id })}
	class="hidden no-print mb-15 fixed inset-s-1/2 -translate-x-1/2 left-32 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-40 md:grid h-14 w-58 select-none place-items-center rounded-t-2xl bg-accent text-accent-fg shadow-lifted shadow-accent/30 transition hover:bg-accent-hover motion-safe:active:scale-95 md:bottom-6"
	aria-label={m.recipe_cook_mode()}
	title={m.recipe_cook_mode()}
>
	<span class="flex flex-col items-center justify-center pt-1">
		<CookingPot class="size-6" />
		<p class="text-[11px] font-medium">{m.recipe_cook_mode()}</p>
	</span>
</a>
