<script lang="ts">
	import type { Snippet } from 'svelte';
	import { NotebookPen } from '@lucide/svelte';

	let { title, body, action }: { title: string; body?: string; action?: Snippet } = $props();
</script>

<div class="card flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
	<span class="grid size-14 place-items-center rounded-full bg-accent-soft text-accent">
		<NotebookPen class="size-7" />
	</span>
	<div class="space-y-1">
		<h2 class="font-display text-lg font-semibold">{title}</h2>
		{#if body}
			<p class="mx-auto max-w-sm text-sm text-fg-subtle">{body}</p>
		{/if}
	</div>
	{#if action}
		{@render action()}
	{/if}
</div>
