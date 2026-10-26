<script lang="ts">
	import { navigating } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
</script>

{#if navigating.to}
	<div class="navigation-progress" aria-hidden="true"><span></span></div>
	<p class="sr-only" role="status">{m.loading()}</p>
{/if}
