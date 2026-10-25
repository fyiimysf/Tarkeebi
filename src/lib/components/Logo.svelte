<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let { compact = false }: { compact?: boolean } = $props();
</script>

<!--
	"Tarkeeb" means arrangement/composition, so the mark is four tiles set in a
	grid — one accented — rather than a stock chef's hat.
-->
<span class="flex items-center gap-2 font-semibold tracking-tight">
	<span
		class="grid size-8 shrink-0 grid-cols-2 gap-[3px] rounded-lg bg-accent p-[7px] shadow-sm"
		aria-hidden="true"
	>
		<span class="rounded-[2px] bg-accent-fg"></span>
		<span class="rounded-[2px] bg-accent-fg/45"></span>
		<span class="rounded-[2px] bg-accent-fg/70"></span>
		<span class="rounded-[2px] bg-accent-fg"></span>
	</span>
	{#if !compact}
		<span class="font-display text-base">{m.app_name()}</span>
	{/if}
</span>
