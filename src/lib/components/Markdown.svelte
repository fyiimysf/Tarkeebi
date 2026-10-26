<script lang="ts">
	import { parseMarkdown, type MarkdownInline } from '#lib/markdown.ts';

	let {
		source,
		class: className = ''
	}: {
		source: string;
		class?: string;
	} = $props();

	const blocks = $derived(parseMarkdown(source));
</script>

{#snippet inline(nodes: MarkdownInline[])}
	{#each nodes as node, index (index)}
		{#if node.type === 'text'}
			{node.value}
		{:else if node.type === 'break'}
			<br />
		{:else if node.type === 'code'}
			<code>{node.value}</code>
		{:else if node.type === 'strong'}
			<strong>{@render inline(node.children)}</strong>
		{:else if node.type === 'em'}
			<em>{@render inline(node.children)}</em>
		{:else if node.type === 'del'}
			<del>{@render inline(node.children)}</del>
		{:else if node.type === 'link'}
			<a href={node.href} target={node.external ? '_blank' : undefined} rel="noreferrer noopener"
				>{@render inline(node.children)}</a
			>
		{/if}
	{/each}
{/snippet}

<div class="markdown {className}">
	{#each blocks as block, index (index)}
		{#if block.type === 'paragraph'}
			<p>{@render inline(block.children)}</p>
		{:else if block.type === 'heading'}
			<svelte:element this={`h${block.level}`}>{@render inline(block.children)}</svelte:element>
		{:else if block.type === 'list'}
			<svelte:element this={block.ordered ? 'ol' : 'ul'}>
				{#each block.items as item, index (index)}
					<li>{@render inline(item)}</li>
				{/each}
			</svelte:element>
		{:else if block.type === 'blockquote'}
			<blockquote>{@render inline(block.children)}</blockquote>
		{:else if block.type === 'code'}
			<pre><code>{block.value}</code></pre>
		{:else if block.type === 'hr'}
			<hr />
		{/if}
	{/each}
</div>
