<script lang="ts">
	import { RefreshCw } from '@lucide/svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { m } from '#lib/paraglide/messages.js';
</script>

<div class="mt-8">
	<EmptyState title={m.load_error_title()} body={m.load_error_body()}>
		{#snippet action()}
			<button type="button" class="btn-secondary" onclick={() => window.location.reload()}>
				<RefreshCw class="size-4" />
				{m.load_error_retry()}
			</button>
		{/snippet}
	</EmptyState>
</div>
