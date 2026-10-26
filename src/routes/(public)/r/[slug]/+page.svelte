<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ArrowLeft, Clock, ExternalLink, Flame, Printer, Users } from '@lucide/svelte';
	import { servingsLabel } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatMinutes } from '#lib/time.ts';
	import CookLogButton from '#lib/components/CookLogButton.svelte';
	import IngredientList from '#lib/components/IngredientList.svelte';
	import Markdown from '#lib/components/Markdown.svelte';
	import ShareLinkButton from '#lib/components/ShareLinkButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const recipe = $derived(data.recipe);
	const totalMinutes = $derived((recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0));
	const canonical = $derived(`${page.url.origin}/r/${recipe.slug}`);
	const cookHref = $derived(resolve('/(public)/r/[slug]/cook', { slug: recipe.slug }));
	// Images are served from our own `/media` proxy, so social/JSON-LD tags need
	// them resolved to an absolute URL.
	const imageUrl = $derived(
		recipe.imageUrl ? new URL(recipe.imageUrl, page.url.origin).toString() : null
	);

	const publishedLabel = $derived(
		recipe.publishedAt && recipe.isPublic
			? new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(recipe.publishedAt)
			: null
	);

	function isoDuration(minutes: number | null) {
		return minutes && minutes > 0 ? `PT${minutes}M` : undefined;
	}

	function tagHref(slug: string) {
		return `${resolve('/(public)')}?tag=${encodeURIComponent(slug)}`;
	}

	const jsonLd = $derived(
		JSON.stringify({
			'@context': 'https://schema.org',
			'@type': 'Recipe',
			name: recipe.title,
			description: recipe.description ?? undefined,
			image: imageUrl ? [imageUrl] : undefined,
			author: recipe.authorName ? { '@type': 'Person', name: recipe.authorName } : undefined,
			datePublished: recipe.isPublic ? recipe.publishedAt?.toISOString() : undefined,
			prepTime: isoDuration(recipe.prepMinutes),
			cookTime: isoDuration(recipe.cookMinutes),
			recipeYield: `${recipe.servings} servings`,
			recipeCategory: recipe.tags.length > 0 ? recipe.tags.map((tag) => tag.name) : undefined,
			recipeIngredient: recipe.ingredients.map((item) =>
				[item.quantity, item.unit, item.name].filter(Boolean).join(' ')
			),
			recipeInstructions: recipe.steps.map((step) => ({
				'@type': 'HowToStep',
				text: step.instruction
			})),
			mainEntityOfPage: canonical
		}).replace(/[<>&]/g, (character) => `\\u00${character.charCodeAt(0).toString(16)}`)
	);
</script>

<svelte:head>
	<title>{recipe.title} · {m.app_name()}</title>
	<meta name="description" content={recipe.description ?? `${recipe.title} — ${m.app_tagline()}`} />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={recipe.title} />
	<meta
		property="og:description"
		content={recipe.description ?? `${recipe.title} — ${m.app_tagline()}`}
	/>
	<meta property="og:url" content={canonical} />
	{#if !recipe.isPublic}
		<!-- Shared links to private recipes must not end up in search results. -->
		<meta name="robots" content="noindex, nofollow" />
	{/if}
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
	{/if}
	{#if recipe.publishedAt && recipe.isPublic}
		<meta property="article:published_time" content={recipe.publishedAt.toISOString()} />
	{/if}
	<meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
	<svelte:element this={"script"} type="application/ld+json">{jsonLd}</svelte:element>
</svelte:head>

<div class="no-print">
	<a href={resolve('/(public)')} class="btn-ghost -ms-2">
		<ArrowLeft class="size-4 rtl:rotate-180" />
		{m.public_back()}
	</a>
</div>

<article class="mx-auto mt-4 max-w-3xl">
	{#if recipe.imageUrl}
		<!-- Bleed to the screen edges on phones; framed like a print plate on wider screens. -->
		<div class="-mx-4 overflow-hidden border-y border-border sm:mx-0 sm:rounded-2xl sm:border">
			<img
				src={recipe.imageUrl}
				alt=""
				class="aspect-[4/3] w-full object-cover sm:aspect-[16/10]"
				fetchpriority="high"
			/>
		</div>
	{/if}

	<header class="mt-6 sm:mt-8">
		<h1
			class="text-pretty font-display text-[2rem] font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl"
		>
			{recipe.title}
		</h1>
		{#if recipe.description}
			<p class="prose-editorial-lg mt-4">{recipe.description}</p>
		{/if}

		<div
			class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-4 text-sm text-fg-subtle sm:gap-x-5"
		>
			{#if recipe.authorName}
				<span>{m.public_by({ name: recipe.authorName })}</span>
			{/if}
			{#if publishedLabel}
				<time datetime={recipe.publishedAt?.toISOString()}>{publishedLabel}</time>
			{/if}
			<span class="inline-flex items-center gap-1">
				<Users class="size-4" />
				{servingsLabel(recipe.servings)}
			</span>
			{#if totalMinutes > 0}
				<span class="inline-flex items-center gap-1">
					<Clock class="size-4" />
					{formatMinutes(totalMinutes)}
				</span>
			{/if}
			{#if recipe.sourceUrl}
				<a
					href={recipe.sourceUrl}
					target="_blank"
					rel="noreferrer"
					class="inline-flex items-center gap-1 hover:text-fg"
				>
					<ExternalLink class="size-4" />
					{m.recipe_source()}
				</a>
			{/if}
		</div>

		<!-- Desktop keeps the full action row in the flow; phones get the same
		     two primary actions pinned within thumb reach, further down. -->
		<div class="no-print mt-5 flex flex-wrap items-center gap-2">
			<a href={cookHref} class="btn-primary hidden md:inline-flex">
				<Flame class="size-4" />
				{m.recipe_cook_mode()}
			</a>
			<div class="hidden md:block">
				<CookLogButton action="?/markCooked" count={recipe.cookCount} />
			</div>
			<div class="ms-auto flex flex-1 items-center justify-end gap-2 md:flex-none">
				<ShareLinkButton url={canonical} title={recipe.title} />
				<button type="button" class="btn-secondary" onclick={() => window.print()}>
					<Printer class="size-4" />
					<span class="hidden sm:inline">{m.public_print()}</span>
					<span class="sr-only sm:hidden">{m.public_print()}</span>
				</button>
			</div>
		</div>

		{#if recipe.tags.length > 0}
			<div class="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
				<span class="text-fg-subtle">{m.public_tags()}</span>
				{#each recipe.tags as tag (tag.slug)}
					<a href={tagHref(tag.slug)} class="chip">#{tag.name}</a>
				{/each}
			</div>
		{/if}
	</header>

	<div class="mt-8 grid gap-10 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
		<IngredientList ingredients={recipe.ingredients} baseServings={recipe.servings} />

		<section>
			<h2 class="font-display text-2xl font-bold tracking-tight">{m.recipe_steps()}</h2>
			{#if recipe.steps.length > 0}
				<ol class="mt-4 space-y-6">
					{#each recipe.steps as step, index (step.id)}
						<li class="flex gap-4">
							<span
								class="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-sm font-semibold text-accent-soft-fg"
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
		<section class="card relative mt-12 overflow-hidden p-5 sm:p-8">
			<span aria-hidden="true" class="absolute inset-y-0 start-0 w-1 bg-accent"></span>
			<span
				aria-hidden="true"
				class="pointer-events-none absolute -top-2 end-4 select-none font-serif text-6xl leading-none text-accent/15 sm:text-7xl"
			>
				&rdquo;
			</span>
			<h2 class="font-display text-2xl font-bold tracking-tight">{m.public_notes_title()}</h2>
			<p class="prose-editorial-lg mt-3 whitespace-pre-line">{recipe.notes}</p>
		</section>
	{/if}
</article>

<!-- Phones get the two primary actions pinned within thumb reach, so you can
     start cooking or log a cook without scrolling back to the top. -->
<div
	class="no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-canvas/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
>
	<div class="mx-auto flex max-w-3xl items-center gap-2">
		<a href={cookHref} class="btn-primary flex-1 whitespace-nowrap">
			<Flame class="size-4" />
			{m.recipe_cook_mode()}
		</a>
		<CookLogButton action="?/markCooked" count={recipe.cookCount} />
	</div>
</div>
<div class="no-print h-20 md:hidden" aria-hidden="true"></div>
