<script lang="ts">
	import { resolve } from '$app/paths';
	import { CirclePlus, FileText } from '@lucide/svelte';
	import DashboardContent from '#lib/components/DashboardContent.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.recipes_title()} · {m.app_name()}</title>
</svelte:head>

<div class="flex flex-wrap items-end justify-between gap-4">
	<div>
		<p class="eyebrow">{m.app_name()}</p>
		<h1 class="mt-1.5 font-display text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
			{m.recipes_title()}
		</h1>
		<p class="mt-2 text-sm text-fg-subtle">{m.recipes_subtitle()}</p>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<a href={resolve('/(app)/app/recipes/new')} class="btn-secondary">
			<FileText class="size-4" />
			{m.pdf_import_title()}
		</a>
		<a href={resolve('/(app)/app/recipes/new')} class="btn-primary">
			<CirclePlus class="size-4" />
			{m.nav_new_recipe()}
		</a>
	</div>
</div>

<DashboardContent content={data.content} userId={data.user.id} />
