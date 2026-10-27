<script lang="ts">
	import { ChefHat, Clock, Search, Users, X } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fly } from 'svelte/transition';
	import { servingsLabel } from '#lib/format.ts';
	import { flyParams } from '#lib/motion.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { formatMinutes } from '#lib/time.ts';
	import PublicHomeSkeleton from '#lib/components/PublicHomeSkeleton.svelte';
	import PageLoadError from '#lib/components/PageLoadError.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let content = $state<any>(null);
	let failed = $state(false);
	let searchTerm = $state(page.url.searchParams.get('q') ?? '');

	$effect(() => {
		searchTerm = page.url.searchParams.get('q') ?? '';
	});

	$effect(() => {
		content = null;
		failed = false;
		data.content
			.then((value) => {
				content = value;
				failed = false;
			})
			.catch(() => {
				failed = true;
			});
	});

	function updateSearch() {
		const url = new URL(page.url.href);
		if (searchTerm.trim()) {
			url.searchParams.set('q', searchTerm.trim());
		} else {
			url.searchParams.delete('q');
		}
		goto(url.pathname + url.search, { replaceState: true });
	}

	function onSearchInput(event: Event) {
		searchTerm = (event.currentTarget as HTMLInputElement).value;
		updateSearch();
	}

	function clearSearch() {
		searchTerm = '';
		updateSearch();
	}

	function totalMinutes(prep: number | null, cook: number | null) {
		return (prep ?? 0) + (cook ?? 0);
	}

	function formatDate(value: Date | null) {
		if (!value) return '';
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(value);
	}

	function tagHref(slug: string | null) {
		return slug ? `${resolve('/(public)')}?tag=${encodeURIComponent(slug)}` : resolve('/(public)');
	}

	const activeTag = $derived(data.activeTag);
</script>

<svelte:head>
	<title>{m.public_title()} · {m.app_name()}</title>
	<meta name="description" content={m.public_subtitle()} />
</svelte:head>

<section class="max-w-2xl">
	<p class="eyebrow">{m.public_eyebrow()}</p>
	<h1
		class="mt-3 text-pretty font-display text-4xl font-bold leading-[1.04] tracking-[-0.03em] sm:text-5xl"
	>
		{m.public_title()}
	</h1>
	<p class="prose-editorial-lg mt-4">{m.public_subtitle()}</p>
</section>

{#if failed}
	<PageLoadError />
{:else if !content}
	<PublicHomeSkeleton />
{:else}
	<div class="relative mt-8">
		<Search class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-fg-subtle" />
		<input
			type="search"
			value={searchTerm}
			oninput={onSearchInput}
			placeholder={m.recipes_search()}
			aria-label={m.recipes_search()}
			class="input w-full ps-9 pe-9"
		/>
		{#if searchTerm}
			<button
				type="button"
				onclick={clearSearch}
				class="btn-icon absolute inset-y-0 end-1 my-auto size-8"
				aria-label={m.recipes_reset()}
			>
				<X class="size-4" />
			</button>
		{/if}
	</div>

	{#if content.tags.length > 0}
		<div class="mt-4 flex flex-wrap gap-1.5">
			{#each content.tags as tag (tag.slug)}
				<a href={tagHref(tag.slug)} class="chip {activeTag === tag.slug ? 'chip-active' : ''}">
					#{tag.name}
					<span class="text-fg-subtle">{tag.count}</span>
				</a>
			{/each}
			{#if activeTag}
				<a href={tagHref(null)} class="chip">{m.public_clear_tag()}</a>
			{/if}
		</div>
	{/if}

	{#if content.featured}
		<a
			href={resolve('/(public)/r/[slug]', { slug: content.featured.slug })}
			in:fly={flyParams({ y: 8, duration: 200 })}
			class="card group mt-8 flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-lifted motion-safe:hover:-translate-y-0.5 md:flex-row"
		>
			<div
				class="relative aspect-[16/10] w-full shrink-0 bg-surface-sunken md:aspect-auto md:min-h-80 md:w-1/2"
			>
				{#if content.featured.imageUrl}
					<img
						src={content.featured.imageUrl}
						alt=""
						class="absolute inset-0 size-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
					/>
				{:else}
					<ChefHat class="absolute inset-0 m-auto size-12 text-fg-subtle" strokeWidth={1.5} />
				{/if}
			</div>
			<div class="flex flex-1 flex-col justify-center gap-3 p-5 sm:p-8">
				<span class="eyebrow">{m.public_featured()}</span>
				<h2 class="font-display text-2xl font-bold leading-snug sm:text-3xl">
					{content.featured.title}
				</h2>
				{#if content.featured.description}
					<p class="line-clamp-3 leading-relaxed text-fg-muted">
						{content.featured.description}
					</p>
				{/if}
				<div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
					<span class="inline-flex items-center gap-1">
						<Users class="size-3.5" />
						{servingsLabel(content.featured.servings)}
					</span>
					{#if totalMinutes(content.featured.prepMinutes, content.featured.cookMinutes) > 0}
						<span class="inline-flex items-center gap-1">
							<Clock class="size-3.5" />
							{formatMinutes(totalMinutes(content.featured.prepMinutes, content.featured.cookMinutes))}
						</span>
					{/if}
					{#if content.featured.publishedAt}
						<time datetime={content.featured.publishedAt.toISOString()} class="ms-auto">
							{formatDate(content.featured.publishedAt)}
						</time>
					{/if}
				</div>
			</div>
		</a>
	{/if}

	{#if content.recipes.length > 0}
		<h2 class="mt-12 font-display text-2xl font-bold">{m.public_all_recipes()}</h2>
		<ul class="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each content.recipes as recipe, index (recipe.id)}
				{@const minutes = totalMinutes(recipe.prepMinutes, recipe.cookMinutes)}
				<li in:fly={flyParams({ y: 10, duration: 200, delay: Math.min(index * 25, 150) })}>
					<a
						href={resolve('/(public)/r/[slug]', { slug: recipe.slug })}
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
						</div>
						<div class="flex flex-1 flex-col gap-2 p-5">
							<h3 class="font-display text-lg font-semibold leading-snug">{recipe.title}</h3>
							{#if recipe.description}
								<p class="line-clamp-3 text-sm leading-relaxed text-fg-muted">
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
								</div>
							{/if}
							<div
								class="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3 text-xs text-fg-subtle"
							>
								<span class="inline-flex items-center gap-1">
									<Users class="size-3.5" />
									{servingsLabel(recipe.servings)}
								</span>
								{#if minutes > 0}
									<span class="inline-flex items-center gap-1">
										<Clock class="size-3.5" />
										{formatMinutes(minutes)}
									</span>
								{/if}
								{#if recipe.publishedAt}
									<time datetime={recipe.publishedAt.toISOString()} class="ms-auto">
										{formatDate(recipe.publishedAt)}
									</time>
								{/if}
							</div>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{:else if activeTag}
		<div class="card mt-10 p-10 text-center">
			<p class="text-sm text-fg-subtle">
				{m.public_tag_filter({ tag: content.activeTagName ?? '' })}
			</p>
			<a href={tagHref(null)} class="btn-secondary mt-4">{m.public_clear_tag()}</a>
		</div>
	{:else if content.total === 0}
		<div class="card mt-10 p-10 text-center">
			<ChefHat class="mx-auto size-10 text-fg-subtle" strokeWidth={1.5} />
			<h2 class="mt-4 font-display text-lg font-semibold">{m.public_empty_title()}</h2>
			<p class="mt-1 text-sm text-fg-subtle">{m.public_empty_body()}</p>
		</div>
	{/if}
{/if}
