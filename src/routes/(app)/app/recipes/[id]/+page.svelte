<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { Dialog } from 'bits-ui';
	import { ArrowLeft, Pencil, Trash, TriangleAlert, X } from '@lucide/svelte';
	import type { Attachment } from 'svelte/attachments';
	import RecipeDetailContent from '#lib/components/RecipeDetailContent.svelte';
	import HoldToDelete from '#lib/components/HoldToDelete.svelte';
	import { removeCachedRecipe } from '#lib/cache.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const recipeId = $derived(page.params.id ?? '');

	let deleteOpen = $state(false);
	let deleting = $state(false);
	let deleteForm: HTMLFormElement | null = $state(null);
	let ui = $state({ open: false });

	const handleDelete: SubmitFunction = () => {
		deleting = true;
		return async ({ result, update }) => {
			try {
				if (result.type === 'redirect') {
					removeCachedRecipe(data.user.id, recipeId);
				}
				await update();
			} finally {
				deleting = false;
			}
		};
	};

	function closeDelete() {
		if (deleting) return;
		deleteOpen = false;
	}

	const bindDeleteForm: Attachment<HTMLFormElement> = (node) => {
		deleteForm = node;
		return () => {
			if (deleteForm === node) deleteForm = null;
		};
	};
</script>

<div class="no-print flex items-center justify-between gap-3">
	<a href={resolve('/(app)/app')} class="btn-ghost -ms-2">
		<ArrowLeft class="size-4 rtl:rotate-180" />
		{m.nav_recipes()}
	</a>
	<div class="flex items-center gap-1">
		<a
			href={resolve('/(app)/app/recipes/[id]/edit', { id: recipeId })}
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

{#key recipeId}
	<RecipeDetailContent recipe={data.recipe} userId={data.user.id} {recipeId} />
{/key}

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
		<div class="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2" data-dialog-layer>
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
							<Dialog.Title class="font-display text-lg font-semibold text-danger">
								{m.recipe_delete()}
							</Dialog.Title>
							<Dialog.Description class="mt-1 text-sm text-danger">
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
						{@attach bindDeleteForm}
						method="post"
						action="?/delete"
						class="mt-4"
						aria-label={m.recipe_delete()}
						use:enhance={handleDelete}
					>
						<HoldToDelete
							label={deleting ? m.recipe_deleting() : m.recipe_hold_to_delete()}
							duration={3000}
							disabled={deleting}
							onComplete={() => deleteForm?.requestSubmit()}
						/>
						<button type="submit" class="sr-only" tabindex="-1" aria-hidden="true"></button>
					</form>
				</div>
			</Dialog.Content>
		</div>
	</Dialog.Portal>
</Dialog.Root>
