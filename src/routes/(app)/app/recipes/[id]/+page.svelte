<script lang="ts">
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { enhance, type SubmitFunction } from "$app/forms";
	import { Dialog } from "bits-ui";
	import {
		ArrowLeft,
		Clock,
		CookingPot,
		ExternalLink,
		Globe,
		GlobeLock,
		Pencil,
		Share2,
		Star,
		Trash,
		TriangleAlert,
		Users,
		X,
	} from "@lucide/svelte";
	import { cookedLabel, servingsLabel } from "#lib/format.ts";
	import { m } from "#lib/paraglide/messages.js";
	import { formatMinutes } from "#lib/time.ts";
	import CookLogButton from "#lib/components/CookLogButton.svelte";
	import HoldToDelete from "#lib/components/HoldToDelete.svelte";
	import IngredientList from "#lib/components/IngredientList.svelte";
	import ShareLinkButton from "#lib/components/ShareLinkButton.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	const recipe = $derived(data.recipe);
	const totalMinutes = $derived(
		(recipe.prepMinutes ?? 0) + (recipe.cookMinutes ?? 0),
	);
	const publicUrl = $derived(
		recipe.slug
			? `${page.url.origin}${resolve("/(public)/r/[slug]", { slug: recipe.slug })}`
			: null,
	);

	let deleteOpen = $state(false);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = $state(null);
	let ui = $state({ open: false });
	const handleDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ update }) => {
			await update();
			deleting = false;
		};
	};

	function closeDelete() {
		if (deleting) return;
		deleteOpen = false;
	}

	const lastCookedLabel = $derived(
		recipe.myLastCookedAt
			? new Intl.DateTimeFormat(undefined, {
					dateStyle: "medium",
				}).format(recipe.myLastCookedAt)
			: null,
	);

	function tagHref(slug: string) {
		const params = new URLSearchParams({ tag: slug });
		return `${resolve("/(app)/app")}?${params}`;
	}
</script>

<svelte:head>
	<title>{recipe.title} · {m.app_name()}</title>
</svelte:head>

<div class="no-print flex items-center justify-between gap-3">
	<a href={resolve("/(app)/app")} class="btn-ghost -ms-2">
		<ArrowLeft class="size-4 rtl:rotate-180" />
		{m.nav_recipes()}
	</a>
	<div class="flex items-center gap-1">
		<a
			href={resolve("/(app)/app/recipes/[id]/edit", { id: recipe.id })}
			class="btn-icon"
			aria-label={m.recipe_edit_title()}
			title={m.recipe_edit_title()}
		>
			<Pencil class="size-5" />
		</a>
		<button
			type="button"
			class="btn-icon text-danger hover:bg-danger-soft hover:text-danger"
			aria-haspopup="dialog"
			aria-label={m.recipe_delete()}
			title={m.recipe_delete()}
			onclick={() => (deleteOpen = true)}
		>
			<Trash class="size-5" />
		</button>
	</div>
</div>

<article class="mt-3">
	{#if recipe.imageUrl}
		<div class="card mb-6 overflow-hidden">
			<img
				src={recipe.imageUrl}
				alt=""
				class="aspect-[16/9] w-full object-cover"
			/>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
		<h1
			class="font-display text-3xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-4xl"
		>
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
				<ShareLinkButton
					url={publicUrl}
					title={recipe.title}
					variant="btn-icon"
					iconOnly
				/>
			{:else}
				<form method="post" action="?/ensureSlug" use:enhance>
					<button
						class="btn-icon"
						aria-label={m.recipe_create_share_link()}
						title={m.recipe_create_share_link()}
					>
						<Share2 class="size-5" />
					</button>
				</form>
			{/if}

			<form method="post" action="?/togglePublished" use:enhance>
				<button
					class="btn-icon {recipe.isPublic ? 'text-success ' : ''}"
					aria-pressed={recipe.isPublic}
					aria-label={recipe.isPublic
						? m.recipe_published()
						: m.recipe_publish()}
					title={recipe.isPublic
						? m.recipe_published()
						: m.recipe_publish()}
				>
					{#if recipe.isPublic}
						<Globe class="size-5" />
					{:else}
						<GlobeLock class="size-5" />
					{/if}
				</button>
			</form>

			<form method="post" action="?/toggleFavorite" use:enhance>
				<button
					class="btn-icon {recipe.isFavorite ? 'text-accent ' : ''}"
					aria-pressed={recipe.isFavorite}
					aria-label={recipe.isFavorite
						? m.recipe_favorited()
						: m.recipe_favorite()}
					title={recipe.isFavorite
						? m.recipe_favorited()
						: m.recipe_favorite()}
				>
					<Star
						class="size-5 {recipe.isFavorite ? 'fill-current' : ''}"
					/>
				</button>
			</form>
		</div>
	</div>

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
		<IngredientList
			ingredients={recipe.ingredients}
			baseServings={recipe.servings}
		/>

		<section class="card p-5 sm:p-6">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="font-display text-2xl font-bold tracking-tight">
					{m.recipe_steps()}
				</h2>
				<CookLogButton
					action="?/markCooked"
					count={recipe.myCookCount}
					showCount={false}
				/>
			</div>

			{#if recipe.steps.length > 0}
				<ol class="mt-4 space-y-4">
					{#each recipe.steps as step, index (step.id)}
						<li class="flex gap-3">
							<span
								class="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent-soft-fg"
							>
								{String(index + 1).padStart(2, "0")}
							</span>
							<p class="prose-editorial whitespace-pre-line pt-0.5">
								{step.instruction}
							</p>
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

<!-- Hold-to-delete confirmation, as a modal -->
<Dialog.Root
	open={deleteOpen}
	onOpenChange={(open) => {
		if (!open && deleting) return;
		deleteOpen = open;
	}}
>
	<Dialog.Portal>
		<Dialog.Overlay
			data-dialog-layer
			class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-[dialog-overlay-in_160ms_ease-out]"
			onclick={closeDelete}
		/>
		<!-- The centering transform sits on this wrapper, firmly outside the
         entrance animation, so the panel never renders off-center. -->
		<div
			class="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2"
			data-dialog-layer
		>
			<Dialog.Content
				class="w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-danger/40 bg-surface p-5 shadow-lifted sm:p-6"
				onOpenAutoFocus={() => (ui.open = true)}
				onCloseAutoFocus={() => (ui.open = false)}
			>
				<div class="animate-[dialog-pop-in_180ms_ease-out]">
					<div class="flex items-start gap-3">
						<span
							class="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"
						>
							<TriangleAlert class="size-5" />
						</span>
						<div class="min-w-0 flex-1">
							<Dialog.Title
								class="font-display text-lg font-semibold text-danger"
							>
								{m.recipe_delete()}
							</Dialog.Title>
							<Dialog.Description
								class="mt-1 text-sm text-danger"
							>
								{m.recipe_delete_confirm()}
							</Dialog.Description>
						</div>
						<Dialog.Close
							class="btn-icon -mt-1.5 -me-1.5"
							aria-label={m.recipe_cancel()}
							title={m.recipe_cancel()}
							disabled={deleting}
							onclick={closeDelete}
						>
							<X class="size-5" />
						</Dialog.Close>
					</div>

					<p class="mt-3 text-sm text-danger/90">
						{m.recipe_delete_hold_hint({ seconds: 3 })}
					</p>

					<form
						bind:this={deleteForm}
						method="post"
						action="?/delete"
						class="mt-4"
						aria-label={m.recipe_delete()}
						use:enhance={handleDelete}
					>
						<HoldToDelete
							label={deleting
								? m.recipe_deleting()
								: m.recipe_hold_to_delete()}
							duration={3000}
							disabled={deleting}
							onComplete={() => deleteForm?.requestSubmit()}
						/>
						<button
							type="submit"
							class="sr-only"
							tabindex="-1"
							aria-hidden="true"
						></button>
					</form>
				</div>
			</Dialog.Content>
		</div>
	</Dialog.Portal>
</Dialog.Root>

<!-- Cook mode stays one thumb-tap away. -->
<a
	href={resolve("/(app)/app/recipes/[id]/cook", { id: recipe.id })}
	class="hidden no-print mb-15 fixed inset-s-1/2 -translate-x-1/2 left-32  bottom-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)] z-40 md:grid h-14 w-58  select-none place-items-center rounded-t-2xl bg-accent text-accent-fg shadow-lifted shadow-accent/30 transition hover:bg-accent-hover motion-safe:active:scale-95 md:bottom-6"
	aria-label={m.recipe_cook_mode()}
	title={m.recipe_cook_mode()}
>
	<span class="flex flex-col items-center justify-center pt-1">
		<CookingPot class="size-6" />
		<p class="text-[11px] font-medium">{m.recipe_cook_mode()}</p>
	</span>
</a>
<a
	href={resolve("/(app)/app/recipes/[id]/cook", { id: recipe.id })}
	class="md:hidden no-print pb-2 fixed inset-s-1/2 -translate-x-1/2  bottom-[calc(0rem+env(safe-area-inset-bottom)+1rem)] z-40 grid h-14 w-28   select-none place-items-center rounded-b-full bg-accent text-accent-fg shadow-lifted shadow-accent/30 transition hover:bg-accent-hover motion-safe:active:scale-95 "
	aria-label={m.recipe_cook_mode()}
	title={m.recipe_cook_mode()}
>
	<span class="flex flex-col items-center justify-center pt-1">
		<CookingPot class="size-6" />
		<p class="text-[11px] font-medium">{m.recipe_cook_mode()}</p>
	</span>
</a>
