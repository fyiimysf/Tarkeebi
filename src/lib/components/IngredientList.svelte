<script lang="ts">
	import { Minus, Plus, Users } from '@lucide/svelte';
	import { servingsLabel } from '#lib/format.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { scaleQuantity } from '#lib/quantity.ts';
	import type { RecipeIngredient } from '#lib/types.ts';

	let {
		ingredients,
		baseServings,
		showScale = true,
		variant = 'card'
	}: {
		ingredients: RecipeIngredient[];
		baseServings: number;
		showScale?: boolean;
		variant?: 'card' | 'plain';
	} = $props();

	// svelte-ignore state_referenced_locally (seed once from the initial prop)
	let servings = $state(baseServings);
	let checked = $state<Record<string, boolean>>({});

	const factor = $derived(baseServings > 0 ? servings / baseServings : 1);
	const checkedCount = $derived(ingredients.filter((ingredient) => checked[ingredient.id]).length);

	function changeServings(delta: number) {
		servings = Math.min(99, Math.max(1, servings + delta));
	}

	function toggle(id: string) {
		checked[id] = !checked[id];
	}
</script>

<section class={variant === 'card' ? 'card p-4 sm:p-6' : ''}>
	<div class="flex flex-col gap-3">
		<div class="flex items-baseline justify-between gap-3">
			<h2 class="font-display text-2xl font-bold tracking-tight">
				{m.recipe_ingredients()}
			</h2>
			{#if ingredients.length > 0}
				<span class="text-xs font-semibold tabular-nums text-fg-subtle">
					{checkedCount > 0 ? `${checkedCount}/${ingredients.length}` : ingredients.length}
				</span>
			{/if}
		</div>

		{#if showScale}
			<div
				class="flex w-full items-center gap-1 rounded-full border border-border bg-surface-sunken p-1"
			>
				<button
					type="button"
					class="btn-icon size-10 rounded-full"
					onclick={() => changeServings(-1)}
					aria-label={m.recipe_less_servings()}
					disabled={servings <= 1}
				>
					<Minus class="size-5" />
				</button>
				<span
					class="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-center text-sm font-semibold"
					aria-live="polite"
				>
					<Users class="size-4 text-accent" />
					{servingsLabel(servings)}
				</span>
				<button
					type="button"
					class="btn-icon size-10 rounded-full"
					onclick={() => changeServings(1)}
					aria-label={m.recipe_more_servings()}
					disabled={servings >= 99}
				>
					<Plus class="size-5" />
				</button>
			</div>
		{/if}
	</div>

	{#if ingredients.length > 0}
		<ul class="mt-4 divide-y divide-border">
			{#each ingredients as ingredient (ingredient.id)}
				<li>
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-3 transition hover:bg-accent-soft/60"
					>
						<input
							type="checkbox"
							class="mt-1 size-5 shrink-0 cursor-pointer rounded border-border-strong accent-accent"
							checked={checked[ingredient.id] ?? false}
							onchange={() => toggle(ingredient.id)}
						/>
						<span
							class="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-1 text-base leading-snug sm:text-lg"
						>
							{#if ingredient.quantity}
								<span
									class="inline-flex items-center rounded-md bg-accent-soft px-2 py-0.5 text-sm font-bold tabular-nums text-accent"
								>
									{scaleQuantity(ingredient.quantity, factor)}
								</span>
							{/if}
							{#if ingredient.unit}
								<span class="text-sm font-semibold text-fg-subtle">
									{ingredient.unit}
								</span>
							{/if}
							<span
								class={[
									'min-w-0 font-medium',
									{ 'line-through opacity-60': checked[ingredient.id] }
								]}
							>
								{ingredient.name}
							</span>
							{#if ingredient.note}
								<span class="text-sm italic text-fg-subtle">
									({ingredient.note})
								</span>
							{/if}
						</span>
					</label>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-4 text-sm text-fg-subtle">—</p>
	{/if}
</section>
