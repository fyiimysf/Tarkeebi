<script lang="ts">
	import { onDestroy, tick, untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import {
		ArrowDown,
		ArrowUp,
		CirclePlus,
		ClipboardPaste,
		Globe,
		GlobeLock,
		ImagePlus,
		LoaderCircle,
		X
	} from '@lucide/svelte';
	import { flip } from 'svelte/animate';
	import { slide } from 'svelte/transition';
	import { flipParams, slideParams } from '#lib/motion.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { parseBulkIngredients, parseBulkSteps } from '#lib/recipe-bulk.ts';
	import type { RecipeFormInitial } from '#lib/types.ts';

	type Submit = NonNullable<Parameters<typeof enhance>[1]>;

	type IngredientRow = { id: string; quantity: string; unit: string; name: string; note: string };
	type StepRow = { id: string; instruction: string };

	let {
		form,
		initial = {},
		submitLabel,
		cancelHref,
		imageRequired = false
	}: {
		form?: { message?: string; title?: string } | null;
		initial?: RecipeFormInitial;
		submitLabel?: string;
		cancelHref: string;
		imageRequired?: boolean;
	} = $props();

	function emptyIngredient(): IngredientRow {
		return { id: crypto.randomUUID(), quantity: '', unit: '', name: '', note: '' };
	}

	function emptyStep(): StepRow {
		return { id: crypto.randomUUID(), instruction: '' };
	}

	// The editable rows are seeded once from `initial`; `untrack` makes that
	// one-shot intent explicit so the compiler doesn't warn about a lost update.
	let ingredients = $state<IngredientRow[]>(
		untrack(() =>
			initial.ingredients?.length
				? initial.ingredients.map((item) => ({
						id: crypto.randomUUID(),
						quantity: item.quantity,
						unit: item.unit,
						name: item.name,
						note: item.note ?? ''
					}))
				: [emptyIngredient()]
		)
	);
	let steps = $state<StepRow[]>(
		untrack(() =>
			initial.steps?.length
				? initial.steps.map((item) => ({
						id: crypto.randomUUID(),
						instruction: item.instruction
					}))
				: [emptyStep()]
		)
	);
	let previewUrl = $state<string | null>(untrack(() => initial.imageUrl ?? null));
	let previewIsObjectUrl = $state(false);
	let imageName = $state<string | null>(null);
	let submitting = $state(false);
	let isPublic = $state(untrack(() => initial.isPublic ?? false));
	let imageInput: HTMLInputElement | null = null;
	let ingredientsBulkOpen = $state(false);
	let stepsBulkOpen = $state(false);
	let bulkIngredients = $state('');
	let bulkSteps = $state('');

	/** The row that was just added, highlighted once so the eye can find it. */
	let freshRow = $state<string | null>(null);
	let freshTimer: ReturnType<typeof setTimeout> | undefined;

	onDestroy(() => {
		if (previewIsObjectUrl && previewUrl) URL.revokeObjectURL(previewUrl);
		clearTimeout(freshTimer);
	});

	/**
	 * Pressing Enter on a phone's "Next" key would otherwise submit the whole
	 * form. Advance to the next field instead; textareas keep their newlines.
	 */
	function keyboardNav(element: HTMLFormElement) {
		function onKeydown(event: KeyboardEvent) {
			if (event.key !== 'Enter') return;

			const target = event.target;
			if (!(target instanceof HTMLInputElement)) return;
			if (['checkbox', 'file', 'submit', 'button'].includes(target.type)) return;

			event.preventDefault();

			const fields = [
				...element.querySelectorAll<HTMLElement>(
					'input:not([type="checkbox"]):not([type="file"]):not([type="submit"]), textarea'
				)
			];
			fields[fields.indexOf(target) + 1]?.focus();
		}

		element.addEventListener('keydown', onKeydown);
		return () => element.removeEventListener('keydown', onKeydown);
	}

	function captureImageInput(node: HTMLInputElement) {
		imageInput = node;
		return () => {
			imageInput = null;
		};
	}

	/** Textareas grow with their content, so long steps never sit in a scroll box. */
	function autosize(node: HTMLTextAreaElement) {
		const resize = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight + 2}px`;
		};

		resize();
		node.addEventListener('input', resize);
		window.addEventListener('resize', resize);
		// Web fonts land after first paint; measure again once they do.
		void document.fonts?.ready.then(resize);

		return () => {
			node.removeEventListener('input', resize);
			window.removeEventListener('resize', resize);
		};
	}

	function onImageChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];

		if (previewIsObjectUrl && previewUrl) URL.revokeObjectURL(previewUrl);

		// Cancelling the picker must not wipe an existing photo.
		if (!file) {
			previewIsObjectUrl = false;
			previewUrl = initial.imageUrl ?? null;
			imageName = null;
			return;
		}

		previewIsObjectUrl = true;
		previewUrl = URL.createObjectURL(file);
		imageName = file.name;
	}

	function clearImage() {
		if (previewIsObjectUrl && previewUrl) URL.revokeObjectURL(previewUrl);
		previewIsObjectUrl = false;
		previewUrl = initial.imageUrl ?? null;
		imageName = null;
		if (imageInput) imageInput.value = '';
	}

	async function compressImage(file: File): Promise<File> {
		if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

		try {
			const bitmap = await createImageBitmap(file);
			const maxEdge = 1600;
			const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(bitmap.width * scale);
			canvas.height = Math.round(bitmap.height * scale);

			const context = canvas.getContext('2d');
			if (!context) {
				bitmap.close();
				return file;
			}

			context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
			bitmap.close();

			// Re-encode every upload at 65% quality as WebP, even when the source
			// is already small, so Filebase stores the compact format consistently.
			const blob = await new Promise<Blob | null>((resolve) =>
				canvas.toBlob(resolve, 'image/webp', 0.65)
			);

			// Some older browsers ignore the requested type and silently return PNG.
			if (!blob || blob.type !== 'image/webp') return file;

			const name = file.name.replace(/\.[^.]+$/, '') || 'recipe';
			return new File([blob], `${name}.webp`, { type: 'image/webp' });
		} catch {
			return file;
		}
	}

	const handleSubmit: Submit = async ({ formData }) => {
		submitting = true;
		const image = formData.get('image');
		if (image instanceof File && image.size > 0) {
			formData.set('image', await compressImage(image));
		}

		return async ({ update }) => {
			await update();
			submitting = false;
		};
	};

	async function reveal(id: string) {
		freshRow = id;
		await tick();

		// Focus does the scrolling for us: it brings the new row into view and
		// opens the keyboard in one gesture, which is what you want after
		// tapping "Add". `.input`'s scroll margin keeps it clear of the bars.
		document.getElementById(id)?.querySelector<HTMLElement>('input, textarea')?.focus();

		clearTimeout(freshTimer);
		freshTimer = setTimeout(() => (freshRow = null), 1400);
	}

	async function addIngredient() {
		const row = emptyIngredient();
		ingredients.push(row);
		await reveal(`ingredient-${row.id}`);
	}

	function removeIngredient(index: number) {
		if (ingredients.length > 1) ingredients.splice(index, 1);
	}

	function moveIngredient(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= ingredients.length) return;

		const next = [...ingredients];
		[next[index], next[target]] = [next[target], next[index]];
		ingredients = next;
	}

	async function addStep() {
		const row = emptyStep();
		steps.push(row);
		await reveal(`step-${row.id}`);
	}

	function removeStep(index: number) {
		if (steps.length > 1) steps.splice(index, 1);
	}

	function moveStep(index: number, direction: -1 | 1) {
		const target = index + direction;
		if (target < 0 || target >= steps.length) return;

		const next = [...steps];
		[next[index], next[target]] = [next[target], next[index]];
		steps = next;
	}

	function applyBulkIngredients() {
		const parsed = parseBulkIngredients(bulkIngredients);
		if (parsed.length === 0) return;

		const existing = ingredients.filter(
			(row) => row.quantity.trim() || row.unit.trim() || row.name.trim() || row.note.trim()
		);

		ingredients = [
			...existing,
			...parsed.map((item) => ({
				id: crypto.randomUUID(),
				...item
			}))
		];
		bulkIngredients = '';
		ingredientsBulkOpen = false;
	}

	function applyBulkSteps() {
		const parsed = parseBulkSteps(bulkSteps);
		if (parsed.length === 0) return;

		const existing = steps.filter((row) => row.instruction.trim());
		steps = [
			...existing,
			...parsed.map((instruction) => ({
				id: crypto.randomUUID(),
				instruction
			}))
		];
		bulkSteps = '';
		stepsBulkOpen = false;
	}
</script>

<form
	method="post"
	enctype="multipart/form-data"
	class="space-y-4 pb-2 sm:space-y-6 md:pb-0"
	use:enhance={handleSubmit}
	{@attach keyboardNav}
	aria-busy={submitting}
>
	<section class="card space-y-4 p-4 sm:space-y-5 sm:p-6">
		<div class="space-y-1.5">
			<label class="label" for="title">{m.recipe_field_title()}</label>
			<input
				id="title"
				name="title"
				required
				autocomplete="off"
				autocapitalize="words"
				enterkeyhint="next"
				class="input"
				value={form?.title ?? initial.title ?? ''}
				placeholder="Grandma's chicken tagine"
			/>
		</div>

		<div class="space-y-1.5">
			<label class="label" for="description">{m.recipe_field_description()}</label>
			<textarea
				id="description"
				name="description"
				rows="2"
				class="input resize-none overflow-hidden"
				value={initial.description ?? ''}
				{@attach autosize}></textarea>
		</div>

		<div class="space-y-1.5">
			<span class="label" id="visibility-label">{m.recipe_field_visibility()}</span>
			<label
				class="flex cursor-pointer items-start gap-3 rounded-control border border-border bg-canvas p-3 transition hover:border-accent"
			>
				<input
					type="checkbox"
					name="isPublic"
					bind:checked={isPublic}
					class="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-border-strong accent-accent"
					aria-describedby="visibility-hint"
				/>
				<span class="min-w-0">
					<span class="flex items-center gap-2 text-sm font-semibold">
						{#if isPublic}
							<Globe class="size-4 text-success" />
							{m.recipe_published()}
						{:else}
							<GlobeLock class="size-4 text-accent" />
							{m.recipe_private()}
						{/if}
					</span>
					<span class="mt-0.5 block text-xs leading-relaxed text-fg-subtle" id="visibility-hint">
						{isPublic ? m.recipe_public_note() : m.recipe_private_note()}
					</span>
				</span>
			</label>
		</div>

		<div class="space-y-1.5">
			<label class="label" for="tags">{m.recipe_field_tags()}</label>
			<input
				id="tags"
				name="tags"
				class="input"
				autocomplete="off"
				autocapitalize="off"
				spellcheck="false"
				enterkeyhint="next"
				value={initial.tags?.join(', ') ?? ''}
				placeholder={m.recipe_field_tags_placeholder()}
			/>
			<p class="text-xs text-fg-subtle">{m.recipe_field_tags_hint()}</p>
		</div>

		<div class="grid grid-cols-3 gap-2 sm:gap-4">
			<div class="space-y-1.5">
				<label class="label" for="servings">{m.recipe_field_servings()}</label>
				<input
					id="servings"
					name="servings"
					type="number"
					min="1"
					inputmode="numeric"
					enterkeyhint="next"
					value={initial.servings ?? 2}
					class="input"
				/>
			</div>
			<div class="space-y-1.5">
				<label class="label" for="prepMinutes">{m.recipe_field_prep()}</label>
				<input
					id="prepMinutes"
					name="prepMinutes"
					type="number"
					min="0"
					inputmode="numeric"
					enterkeyhint="next"
					value={initial.prepMinutes ?? ''}
					class="input"
				/>
			</div>
			<div class="space-y-1.5">
				<label class="label" for="cookMinutes">{m.recipe_field_cook()}</label>
				<input
					id="cookMinutes"
					name="cookMinutes"
					type="number"
					min="0"
					inputmode="numeric"
					enterkeyhint="next"
					value={initial.cookMinutes ?? ''}
					class="input"
				/>
			</div>
		</div>

		<div class="grid gap-4 sm:grid-cols-2">
			<div class="space-y-1.5">
				<span class="label">{m.recipe_field_image()}</span>
				<label
					class="relative flex cursor-pointer items-center gap-3 rounded-control border border-dashed border-border-strong bg-canvas p-3 transition hover:border-accent"
				>
					<span
						class="grid size-11 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"
					>
						<ImagePlus class="size-5" />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block truncate text-sm font-medium">
							{imageName ?? m.recipe_choose_image()}
						</span>
						<span class="block text-xs text-fg-subtle">{m.recipe_field_image_hint()}</span>
					</span>
					<input
						{@attach captureImageInput}
						id="image"
						name="image"
						type="file"
						accept="image/jpeg,image/png,image/webp,image/avif"
						class="absolute inset-0 cursor-pointer opacity-0"
						required={imageRequired}
						onchange={onImageChange}
					/>
				</label>
				{#if previewUrl}
					<div class="relative mt-2">
						<img src={previewUrl} alt="" class="aspect-video w-full rounded-control object-cover" />
						{#if previewIsObjectUrl}
							<button
								type="button"
								class="absolute end-2 top-2 grid size-9 place-items-center rounded-pill bg-canvas/90 text-fg shadow-raised backdrop-blur"
								onclick={clearImage}
								aria-label={m.recipe_remove_image()}
							>
								<X class="size-4" />
							</button>
						{/if}
					</div>
				{/if}
				{#if initial.imageUrl && !previewIsObjectUrl}
					<label class="flex items-center gap-2 pt-1 text-sm">
						<input type="checkbox" name="removeImage" class="rounded border-border-strong" />
						{m.recipe_remove_image()}
					</label>
				{/if}
			</div>
			<div class="space-y-1.5">
				<label class="label" for="sourceUrl">{m.recipe_field_source()}</label>
				<input
					id="sourceUrl"
					name="sourceUrl"
					type="url"
					inputmode="url"
					autocomplete="url"
					autocapitalize="off"
					spellcheck="false"
					enterkeyhint="next"
					class="input"
					value={initial.sourceUrl ?? ''}
					placeholder="https://…"
				/>
			</div>
		</div>

		<div class="space-y-1.5">
			<label class="label" for="notes">{m.recipe_field_notes()}</label>
			<textarea
				id="notes"
				name="notes"
				rows="3"
				class="input resize-none overflow-hidden"
				value={initial.notes ?? ''}
				{@attach autosize}></textarea>
			<p class="text-xs text-fg-subtle">{m.recipe_field_notes_hint()}</p>
		</div>
	</section>

	<section class="card p-4 sm:p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<h2 class="font-display text-xl font-bold">{m.recipe_ingredients()}</h2>
				<span
					class="rounded-pill bg-surface-sunken px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-fg-subtle"
				>
					{ingredients.length}
				</span>
			</div>
			<button
				type="button"
				class="btn-ghost -me-2 shrink-0 text-sm"
				aria-expanded={ingredientsBulkOpen}
				aria-controls="bulk-ingredients"
				onclick={() => (ingredientsBulkOpen = !ingredientsBulkOpen)}
			>
				<ClipboardPaste class="size-4" />
				{ingredientsBulkOpen ? m.recipe_bulk_close() : m.recipe_bulk_add()}
			</button>
		</div>

		{#if ingredientsBulkOpen}
			<div
				id="bulk-ingredients"
				class="surface-sunken mt-4 space-y-2 p-3"
				transition:slide={slideParams(180)}
			>
				<label class="label" for="bulk-ingredients-input">
					{m.recipe_bulk_ingredients_label()}
				</label>
				<textarea
					id="bulk-ingredients-input"
					bind:value={bulkIngredients}
					rows="8"
					class="input min-h-44 resize-y font-mono leading-relaxed"
					placeholder={m.recipe_bulk_ingredients_placeholder()}></textarea>
				<p class="text-xs text-fg-subtle">{m.recipe_bulk_ingredients_hint()}</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="btn-primary"
						onclick={applyBulkIngredients}
						disabled={!bulkIngredients.trim()}
					>
						{m.recipe_bulk_apply_ingredients()}
					</button>
					<button type="button" class="btn-ghost" onclick={() => (ingredientsBulkOpen = false)}>
						{m.recipe_cancel()}
					</button>
				</div>
			</div>
		{/if}

		<div class="mt-4 space-y-3">
			{#each ingredients as row, index (row.id)}
				<div
					id={`ingredient-${row.id}`}
					class="surface-sunken p-3 transition-shadow {freshRow === `ingredient-${row.id}`
						? 'ring-2 ring-accent/40'
						: ''}"
					role="group"
					aria-label={`${m.recipe_ingredient_name()} ${index + 1}`}
					animate:flip={flipParams(160)}
				>
					<div class="flex items-center justify-between gap-2">
						<span class="inline-flex items-center gap-2 text-xs font-semibold text-fg-subtle">
							<span
								class="grid size-6 place-items-center rounded-full bg-surface font-mono text-[11px] tabular-nums"
								aria-hidden="true"
							>
								{String(index + 1).padStart(2, '0')}
							</span>
						</span>
						<div class="flex items-center">
							<button
								type="button"
								class="btn-icon"
								onclick={() => moveIngredient(index, -1)}
								aria-label={`${m.recipe_move_up()} ${m.recipe_ingredient_name()} ${index + 1}`}
								title={m.recipe_move_up()}
								disabled={index === 0}
							>
								<ArrowUp class="size-4" />
							</button>
							<button
								type="button"
								class="btn-icon"
								onclick={() => moveIngredient(index, 1)}
								aria-label={`${m.recipe_move_down()} ${m.recipe_ingredient_name()} ${index + 1}`}
								title={m.recipe_move_down()}
								disabled={index === ingredients.length - 1}
							>
								<ArrowDown class="size-4" />
							</button>
							<button
								type="button"
								class="btn-icon -me-2"
								onclick={() => removeIngredient(index)}
								aria-label={`${m.recipe_remove()} ${m.recipe_ingredient_name()} ${index + 1}`}
								disabled={ingredients.length === 1}
							>
								<X class="size-4" />
							</button>
						</div>
					</div>

					<div class="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] gap-2">
						<input
							name="ingredientQuantity"
							bind:value={row.quantity}
							inputmode="decimal"
							enterkeyhint="next"
							autocomplete="off"
							placeholder={m.recipe_ingredient_quantity()}
							aria-label={m.recipe_ingredient_quantity()}
							class="input"
						/>
						<input
							name="ingredientUnit"
							bind:value={row.unit}
							autocomplete="off"
							autocapitalize="off"
							enterkeyhint="next"
							placeholder={m.recipe_ingredient_unit()}
							aria-label={m.recipe_ingredient_unit()}
							class="input"
						/>
					</div>
					<div class="mt-2 grid gap-2">
						<input
							name="ingredientName"
							bind:value={row.name}
							autocapitalize="sentences"
							enterkeyhint="next"
							placeholder={m.recipe_ingredient_name()}
							aria-label={m.recipe_ingredient_name()}
							class="input"
						/>
						<input
							name="ingredientNote"
							bind:value={row.note}
							autocapitalize="sentences"
							enterkeyhint="next"
							placeholder={m.recipe_ingredient_note()}
							aria-label={m.recipe_ingredient_note()}
							class="input"
						/>
					</div>
				</div>
			{/each}
		</div>

		<button
			type="button"
			class="btn-secondary mt-3 w-full border-dashed py-3 sm:py-2"
			onclick={addIngredient}
		>
			<CirclePlus class="size-4" />
			{m.recipe_add_ingredient()}
		</button>
	</section>

	<section class="card p-4 sm:p-6">
		<div class="flex flex-wrap items-center justify-between gap-3">
			<div class="flex items-center gap-2">
				<h2 class="font-display text-xl font-bold">{m.recipe_steps()}</h2>
				<span
					class="rounded-pill bg-surface-sunken px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums text-fg-subtle"
				>
					{steps.length}
				</span>
			</div>
			<button
				type="button"
				class="btn-ghost -me-2 shrink-0 text-sm"
				aria-expanded={stepsBulkOpen}
				aria-controls="bulk-steps"
				onclick={() => (stepsBulkOpen = !stepsBulkOpen)}
			>
				<ClipboardPaste class="size-4" />
				{stepsBulkOpen ? m.recipe_bulk_close() : m.recipe_bulk_add()}
			</button>
		</div>
		<p id="steps-markdown-hint" class="mt-1 text-xs text-fg-subtle">
			{m.recipe_step_markdown_hint()}
		</p>

		{#if stepsBulkOpen}
			<div
				id="bulk-steps"
				class="surface-sunken mt-3 space-y-2 p-3"
				transition:slide={slideParams(180)}
			>
				<label class="label" for="bulk-steps-input">{m.recipe_bulk_steps_label()}</label>
				<textarea
					id="bulk-steps-input"
					bind:value={bulkSteps}
					rows="8"
					class="input min-h-44 resize-y font-mono leading-relaxed"
					placeholder={m.recipe_bulk_steps_placeholder()}></textarea>
				<p class="text-xs text-fg-subtle">{m.recipe_bulk_steps_hint()}</p>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="btn-primary"
						onclick={applyBulkSteps}
						disabled={!bulkSteps.trim()}
					>
						{m.recipe_bulk_apply_steps()}
					</button>
					<button type="button" class="btn-ghost" onclick={() => (stepsBulkOpen = false)}>
						{m.recipe_cancel()}
					</button>
				</div>
			</div>
		{/if}

		<div class="mt-4 space-y-3">
			{#each steps as step, index (step.id)}
				<div
					id={`step-${step.id}`}
					class="surface-sunken p-3 transition-shadow {freshRow === `step-${step.id}`
						? 'ring-2 ring-accent/40'
						: ''}"
					role="group"
					aria-label={`${m.recipe_step()} ${index + 1}`}
					animate:flip={flipParams(160)}
				>
					<div class="flex items-center justify-between gap-2">
						<span class="inline-flex items-center gap-2 text-xs font-semibold text-fg-subtle">
							<span
								class="grid size-6 place-items-center rounded-full bg-surface font-mono text-[11px] tabular-nums"
								aria-hidden="true"
							>
								{String(index + 1).padStart(2, '0')}
							</span>
						</span>
						<div class="flex items-center">
							<button
								type="button"
								class="btn-icon"
								onclick={() => moveStep(index, -1)}
								aria-label={`${m.recipe_move_up()} ${m.recipe_step()} ${index + 1}`}
								title={m.recipe_move_up()}
								disabled={index === 0}
							>
								<ArrowUp class="size-4" />
							</button>
							<button
								type="button"
								class="btn-icon"
								onclick={() => moveStep(index, 1)}
								aria-label={`${m.recipe_move_down()} ${m.recipe_step()} ${index + 1}`}
								title={m.recipe_move_down()}
								disabled={index === steps.length - 1}
							>
								<ArrowDown class="size-4" />
							</button>
							<button
								type="button"
								class="btn-icon -me-2"
								onclick={() => removeStep(index)}
								aria-label={`${m.recipe_remove()} ${m.recipe_step()} ${index + 1}`}
								disabled={steps.length === 1}
							>
								<X class="size-4" />
							</button>
						</div>
					</div>
					<textarea
						name="stepInstruction"
						bind:value={step.instruction}
						rows="3"
						placeholder={m.recipe_step_instruction_placeholder()}
						aria-label={`${m.recipe_step()} ${index + 1}`}
						aria-describedby="steps-markdown-hint"
						class="input mt-2 resize-none overflow-hidden"
						{@attach autosize}></textarea>
				</div>
			{/each}
		</div>

		<button
			type="button"
			class="btn-secondary mt-3 w-full border-dashed py-3 sm:py-2"
			onclick={addStep}
		>
			<CirclePlus class="size-4" />
			{m.recipe_add_step()}
		</button>
	</section>

	{#if form?.message}
		<p class="text-sm text-danger" role="alert">{form.message}</p>
	{/if}

	<div class="hidden items-center justify-end gap-2 md:flex">
		<a href={cancelHref} class="btn-secondary shrink-0 px-4">{m.recipe_cancel()}</a>
		<button class="btn-primary shrink-0 px-6" disabled={submitting}>
			{#if submitting}<LoaderCircle class="size-4 animate-spin" />{/if}
			{submitting ? m.recipe_saving() : (submitLabel ?? m.recipe_save())}
		</button>
	</div>

	<!-- Mobile: the tab bar stands aside on these routes, so the form owns the
	     bottom edge. The safe-area inset is inside the bar, not above it. -->
	<div
		class="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-canvas/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden"
	>
		<div class="mx-auto flex max-w-3xl items-center gap-2">
			<a href={cancelHref} class="btn-secondary min-h-11 shrink-0 px-4">{m.recipe_cancel()}</a>
			<button class="btn-primary min-h-11 flex-1" disabled={submitting}>
				{#if submitting}<LoaderCircle class="size-4 animate-spin" />{/if}
				{submitting ? m.recipe_saving() : (submitLabel ?? m.recipe_save())}
			</button>
		</div>
	</div>
</form>
