<script lang="ts">
	import { onDestroy } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { Check, CookingPot, LoaderCircle } from '@lucide/svelte';
	import { cookedLabel } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';

	let {
		action,
		count,
		showCount = true
	}: {
		/** Form action for the route's `markCooked` handler, e.g. `?/markCooked`. */
		action: string;
		count: number;
		/** Hide the tally when the surrounding layout already displays it. */
		showCount?: boolean;
	} = $props();

	let submitting = $state(false);
	let logged = $state(false);
	// The tally the action just returned, held only while the confirmation shows.
	let freshCount = $state<number | null>(null);
	let announcement = $state('');
	let timer: ReturnType<typeof setTimeout> | undefined;

	const displayCount = $derived(freshCount ?? count);

	onDestroy(() => clearTimeout(timer));

	const submit: SubmitFunction = () => {
		submitting = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			submitting = false;

			if (result.type === 'success') {
				const next = (result.data as { cookedCount?: number } | null)?.cookedCount;
				freshCount = typeof next === 'number' ? next : count + 1;
				logged = true;
				announcement = cookedLabel(displayCount);
				clearTimeout(timer);
				timer = setTimeout(() => {
					logged = false;
					freshCount = null;
					announcement = '';
				}, 2600);
			}
		};
	};
</script>

<div class="no-print min-w-0">
	<form method="post" {action} use:enhance={submit} aria-busy={submitting}>
		<button
			type="submit"
			class="btn-secondary max-w-full {logged ? 'border-success/50 text-success' : ''}"
			disabled={submitting}
		>
			{#if submitting}
				<LoaderCircle class="size-4 shrink-0 animate-spin" />
				<span class="truncate">{m.recipe_saving()}</span>
			{:else if logged}
				<Check class="size-4 shrink-0" strokeWidth={2.5} />
				<span class="truncate">{m.cook_logged()}</span>
			{:else}
				<CookingPot class="size-4 shrink-0" />
				<span class="truncate">{m.recipe_mark_cooked()}</span>
			{/if}

			{#if showCount && displayCount > 0}
				<!-- The tally rides inside the button so it stays put in tight
				     action bars; it pops once each time it changes. -->
				<span
					class="shrink-0 rounded-pill bg-surface-sunken px-1.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-fg-muted {logged
						? 'count-pop'
						: ''}"
					aria-hidden="true"
				>
					{displayCount}
				</span>
				<span class="sr-only">{cookedLabel(displayCount)}</span>
			{/if}
		</button>
	</form>

	<p class="sr-only" aria-live="polite">{announcement}</p>
</div>
