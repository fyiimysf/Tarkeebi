<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance, type SubmitFunction } from '$app/forms';
	import { ArrowLeft, Check, ChevronLeft, ChevronRight, Flame, ListChecks } from '@lucide/svelte';
	import { fly, slide } from 'svelte/transition';
	import { cookedLabel } from '#lib/format.ts';
	import { blurFade, flyParams, slideParams } from '#lib/motion.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { swipe } from '#lib/swipe.ts';
	import IngredientList from '#lib/components/IngredientList.svelte';
	import Markdown from '#lib/components/Markdown.svelte';
	import type { RecipeIngredient, RecipeStep } from '#lib/types.ts';

	let {
		title,
		servings,
		ingredients,
		steps,
		backHref,
		cookAction
	}: {
		title: string;
		servings: number;
		ingredients: RecipeIngredient[];
		steps: RecipeStep[];
		backHref: string;
		cookAction?: string;
	} = $props();

	const total = $derived(steps.length);

	let current = $state(0);
	let ingredientsOpen = $state(false);
	let wakeLock = $state(false);
	let logged = $state(false);
	let cookedCount = $state<number | null>(null);
	let submitting = $state(false);
	let direction = $state(1);
	let hasMoved = $state(false);

	const step = $derived(steps[current] ?? null);
	const isLast = $derived(current === total - 1);

	onMount(() => {
		let sentinel: { release: () => Promise<void> } | null = null;
		let cancelled = false;

		async function lock() {
			try {
				const navigator_ = navigator as Navigator & {
					wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
				};
				if (!navigator_.wakeLock) return;
				sentinel = await navigator_.wakeLock.request('screen');
				if (cancelled) {
					await sentinel.release();
					sentinel = null;
					return;
				}
				wakeLock = true;
			} catch {
				wakeLock = false;
			}
		}

		function onVisibility() {
			if (document.visibilityState === 'visible' && !sentinel) void lock();
		}

		void lock();
		document.addEventListener('visibilitychange', onVisibility);

		return () => {
			cancelled = true;
			document.removeEventListener('visibilitychange', onVisibility);
			wakeLock = false;
			void sentinel?.release().catch(() => {});
		};
	});

	function handleKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement | null;
		if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
		if (event.key === 'ArrowRight') next();
		if (event.key === 'ArrowLeft') previous();
	}

	function next() {
		if (current >= total - 1) return;
		direction = 1;
		hasMoved = true;
		current += 1;
	}

	function previous() {
		if (current <= 0) return;
		direction = -1;
		hasMoved = true;
		current -= 1;
	}

	const logCook: SubmitFunction = () => {
		submitting = true;
		return async ({ result, update }) => {
			await update({ reset: false });
			submitting = false;
			if (result.type === 'success') {
				const next = (result.data as { cookedCount?: number } | null)?.cookedCount;
				if (typeof next === 'number') cookedCount = next;
				logged = true;
			}
		};
	};
</script>

<svelte:head>
	<title>{m.cook_title()} · {title} · {m.app_name()}</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<!-- `|global` lets the entrance play even though the route mounts inside the layout's route switch. -->
<div
	in:blurFade|global={{ duration: 240, amount: 18 }}
	class="fixed inset-0 z-50 overflow-y-auto bg-canvas pt-[env(safe-area-inset-top)] pb-[max(2.5rem,env(safe-area-inset-bottom))] print:hidden"
>
	<div class="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6 sm:py-6">
		<header class="flex items-center justify-between gap-2">
			<a
				href={backHref}
				class="btn-ghost -ms-2 min-h-12 min-w-12 shrink-0 px-3"
				aria-label={m.cook_back_to_recipe()}
			>
				<ArrowLeft class="size-5 rtl:rotate-180" />
				<span class="hidden text-base sm:inline">{m.cook_back_to_recipe()}</span>
			</a>

			<div class="flex items-center gap-2">
				{#if wakeLock}
					<span
						class="hidden items-center gap-1.5 rounded-pill bg-accent-soft px-3 py-1 text-xs font-medium text-accent sm:inline-flex"
					>
						<Flame class="size-3.5" />
						{m.cook_screen_on()}
					</span>
				{/if}
				<button
					type="button"
					class="btn-secondary"
					aria-expanded={ingredientsOpen}
					aria-controls="cook-ingredients"
					onclick={() => (ingredientsOpen = !ingredientsOpen)}
				>
					<ListChecks class="size-4" />
					<span class="max-w-[9ch] truncate sm:max-w-none">
						{ingredientsOpen ? m.cook_hide_ingredients() : m.cook_show_ingredients()}
					</span>
				</button>
			</div>
		</header>

		{#if total > 0 && !logged}
			<!-- Segmented progress: one tick per step reads faster than a percentage bar. -->
			<div class="mt-5 flex items-center gap-1.5" aria-hidden="true">
				{#each steps as _, index (index)}
					<span
						class="h-1.5 flex-1 rounded-full transition-colors duration-(--duration-base) {index <=
						current
							? 'bg-accent'
							: 'bg-surface-sunken'}"
					></span>
				{/each}
			</div>
		{/if}

		{#if ingredientsOpen}
			<div id="cook-ingredients" class="mt-6" transition:slide={slideParams(180)}>
				<IngredientList {ingredients} baseServings={servings} variant="plain" />
			</div>
		{/if}

		<div class="mt-6">
			{#if logged}
				<section
					in:fly={flyParams({ y: 12, duration: 220 })}
					class="card flex min-h-[50dvh] flex-col items-center justify-center p-8 text-center sm:p-12"
				>
					<span
						class="grid size-16 place-items-center rounded-pill bg-success-soft text-success-soft-fg"
					>
						<Check class="size-8" strokeWidth={2.5} />
					</span>
					<h2 class="mt-6 font-display text-3xl font-bold">{m.cook_complete_title()}</h2>
					<p class="prose-editorial mx-auto mt-2 text-center">{m.cook_complete_body()}</p>
					{#if cookedCount !== null}
						<p
							class="mt-4 inline-flex items-center gap-1.5 rounded-pill border border-border bg-surface px-3 py-1.5 text-xs font-medium text-fg-muted"
						>
							<Flame class="size-3.5 text-accent" />
							{cookedLabel(cookedCount)}
						</p>
					{/if}
					<a href={backHref} class="btn-primary mt-8">
						<ArrowLeft class="size-4 rtl:rotate-180" />
						{m.cook_back_to_recipe()}
					</a>
				</section>
			{:else if step}
				{#key step.id}
					<section
						in:fly={flyParams({
							x: hasMoved ? direction * 18 : 0,
							y: hasMoved ? 6 : 0,
							duration: hasMoved ? 180 : 0
						})}
						use:swipe={{ onNext: next, onPrevious: previous }}
						class="card relative min-h-[48dvh] overflow-hidden p-6 sm:min-h-[52dvh] sm:p-10"
						style="touch-action: pan-y pinch-zoom"
					>
						<!-- Oversized ghost numeral anchors the step without competing with it. -->
						<span
							aria-hidden="true"
							class="pointer-events-none absolute -bottom-8 end-3 font-display text-[8rem] leading-none font-bold text-surface-sunken select-none sm:text-[11rem]"
						>
							{String(current + 1).padStart(2, '0')}
						</span>
						<div class="relative flex min-h-[40dvh] flex-col justify-center sm:min-h-[44dvh]">
							<p class="eyebrow">{m.cook_step_of({ current: current + 1, total })}</p>
							<Markdown
								source={step.instruction}
								class="mt-4 font-display text-[1.75rem] font-medium leading-[1.28] text-fg sm:text-4xl"
							/>
						</div>
					</section>
				{/key}

				<div class="mt-6 sm:max-w-[21rem]">
					<nav class="flex items-stretch gap-3">
						<button
							type="button"
							class="btn-secondary min-h-14 flex-1 px-5 py-3.5 text-base font-semibold"
							onclick={previous}
							disabled={current === 0}
						>
							<ChevronLeft class="size-5 rtl:rotate-180" />
							{m.cook_prev()}
						</button>

						{#if isLast}
							<a
								href={backHref}
								class="btn-primary min-h-14 flex-1 px-5 py-3.5 text-base font-semibold"
							>
								<Check class="size-5" />
								{m.cook_finish()}
							</a>
						{:else}
							<button
								type="button"
								class="btn-primary min-h-14 flex-1 px-5 py-3.5 text-base font-semibold"
								onclick={next}
							>
								{m.cook_next()}
								<ChevronRight class="size-5 rtl:rotate-180" />
							</button>
						{/if}
					</nav>

					{#if isLast && cookAction}
						<form class="mt-3" method="post" action={cookAction} use:enhance={logCook}>
							<button
								type="submit"
								class="btn-secondary min-h-14 w-full px-5 py-3.5 text-base font-semibold"
								disabled={submitting}
							>
								<Flame class="size-5" />
								{m.cook_log_cooked()}
							</button>
						</form>
					{/if}
				</div>

				{#if isLast}
					<div class="mt-8 border-t border-border pt-6 text-center">
						<h2 class="font-display text-lg font-semibold">{m.cook_complete_title()}</h2>
						<p class="mt-1 text-sm text-fg-subtle">{m.cook_complete_body()}</p>
					</div>
				{/if}
			{:else}
				<section class="card p-10 text-center">
					<h2 class="font-display text-lg font-semibold">{m.cook_empty()}</h2>
					<a href={backHref} class="btn-secondary mt-4">{m.cook_back_to_recipe()}</a>
				</section>
			{/if}
		</div>
	</div>
</div>
