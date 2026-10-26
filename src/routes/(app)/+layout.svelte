<script lang="ts">
	import AppShell from '#lib/components/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{#key data.user.id}
	<AppShell user={data.user} stats={data.stats}>
		{@render children()}
	</AppShell>
{/key}
