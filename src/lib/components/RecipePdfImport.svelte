<script lang="ts">
	import { FileText, LoaderCircle, Upload } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { extractPdfText, PdfTextError, type PdfTextFailure } from '#lib/pdf-text.ts';
	import { parseRecipeText, type ParsedRecipe } from '#lib/recipe-parse.ts';

	let { onparsed }: { onparsed: (recipe: ParsedRecipe) => void } = $props();

	type Phase = 'idle' | 'working' | 'ready' | 'error';
	type Failure = 'empty' | 'error' | 'password' | 'too_large';

	const failureMessages: Record<Failure, () => string> = {
		empty: m.pdf_import_empty,
		error: m.pdf_import_error,
		password: m.pdf_import_password,
		too_large: m.pdf_import_too_large
	};

	const textFailures: Record<PdfTextFailure, Failure> = {
		not_pdf: 'error',
		password: 'password',
		read: 'error',
		too_large: 'too_large'
	};

	let phase = $state<Phase>('idle');
	let failure = $state<Failure>('error');
	let fileName = $state('');
	let dragging = $state(false);
	let fileInput: HTMLInputElement | null = null;

	const failureMessage = $derived(failureMessages[failure]());

	function captureInput(node: HTMLInputElement) {
		fileInput = node;
		return () => {
			fileInput = null;
		};
	}

	async function readPdf(file: File) {
		phase = 'working';
		fileName = file.name;

		try {
			const { text, title } = await extractPdfText(file);
			const parsed = parseRecipeText(text, { title });

			if (parsed.ingredients.length === 0 && parsed.steps.length === 0) {
				failure = 'empty';
				phase = 'error';
				return;
			}

			onparsed(parsed);
			phase = 'ready';
		} catch (error) {
			failure = error instanceof PdfTextError ? textFailures[error.reason] : 'error';
			phase = 'error';
		}
	}

	function openPicker() {
		if (!fileInput) return;
		// Allow picking the same file again after a failed attempt.
		fileInput.value = '';
		fileInput.click();
	}

	function onPick(event: Event) {
		const file = (event.currentTarget as HTMLInputElement).files?.[0];
		if (file) void readPdf(file);
	}

	function onDragOver(event: DragEvent) {
		event.preventDefault();
		dragging = true;
	}

	function onDragLeave(event: DragEvent) {
		if (event.currentTarget === event.target) dragging = false;
	}

	function onDrop(event: DragEvent) {
		event.preventDefault();
		dragging = false;

		const file = event.dataTransfer?.files?.[0];
		if (file) void readPdf(file);
	}
</script>

<div
	class="rounded-2xl border border-dashed p-4 transition-colors {dragging
		? 'border-accent bg-accent-soft'
		: 'border-line bg-surface-2/40'}"
	role="group"
	aria-label={m.pdf_import_title()}
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	<div class="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-start">
		<span
			class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent-text shadow-sm"
		>
			<FileText class="size-5" />
		</span>

		<div class="min-w-0 flex-1">
			<p class="font-medium">
				{dragging ? m.pdf_import_drop() : m.pdf_import_title()}
			</p>
			<p class="mt-0.5 text-xs leading-relaxed text-fg-subtle">{m.pdf_import_hint()}</p>
		</div>

		<button
			type="button"
			class="btn-secondary shrink-0"
			onclick={openPicker}
			disabled={phase === 'working'}
			aria-busy={phase === 'working'}
		>
			{#if phase === 'working'}
				<LoaderCircle class="size-4 animate-spin" />
				{m.pdf_import_reading()}
			{:else}
				<Upload class="size-4" />
				{phase === 'ready' ? m.pdf_import_another() : m.pdf_import_choose()}
			{/if}
		</button>
	</div>

	<input
		{@attach captureInput}
		type="file"
		accept="application/pdf,.pdf"
		class="sr-only"
		tabindex="-1"
		onchange={onPick}
	/>

	{#if phase === 'ready'}
		<p class="mt-3 border-t border-line pt-3 text-sm text-fg-muted" role="status">
			{m.pdf_import_success({ name: fileName })}
		</p>
	{:else if phase === 'error'}
		<p class="mt-3 border-t border-line pt-3 text-sm text-danger" role="alert">
			{failureMessage}
		</p>
	{/if}
</div>
