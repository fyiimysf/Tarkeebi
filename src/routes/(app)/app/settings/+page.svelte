<script lang="ts">
	import { Avatar } from 'bits-ui';
	import { LogOut, Monitor, Moon, Sun } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { clearAllCaches } from '#lib/cache.ts';
	import LanguageSwitcher from '#lib/components/LanguageSwitcher.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { theme, type Theme } from '#lib/theme.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const themes: { value: Theme; label: () => string; icon: typeof Sun }[] = [
		{ value: 'light', label: () => m.theme_light(), icon: Sun },
		{ value: 'dark', label: () => m.theme_dark(), icon: Moon },
		{ value: 'system', label: () => m.theme_system(), icon: Monitor }
	];

	const initials = $derived(
		data.user.name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || '?'
	);
</script>

<svelte:head>
	<title>{m.settings_title()} · {m.app_name()}</title>
</svelte:head>

<div>
	<h1 class="text-2xl font-semibold tracking-tight">{m.settings_title()}</h1>
	<p class="text-sm text-fg-subtle">{m.settings_subtitle()}</p>
</div>

<div class="mt-6 space-y-6">
	<section class="card p-5">
		<h2 class="font-medium">{m.settings_account()}</h2>
		<div class="mt-4 flex items-center gap-3">
			<Avatar.Root class="size-11 shrink-0 overflow-hidden rounded-full bg-accent">
				{#if data.user.image}
					<Avatar.Image src={data.user.image} alt="" class="size-full object-cover" />
				{/if}
				<Avatar.Fallback
					class="grid size-full place-items-center text-sm font-semibold text-accent-fg"
				>
					{initials}
				</Avatar.Fallback>
			</Avatar.Root>
			<div class="min-w-0">
				<p class="truncate font-medium">{data.user.name}</p>
				<p class="truncate text-sm text-fg-subtle">{data.user.email}</p>
			</div>
		</div>

		<form method="post" action="?/signOut" use:enhance onsubmit={clearAllCaches} class="mt-5 border-t border-border pt-5">
			<button class="btn-danger">
				<LogOut class="size-4" />
				{m.nav_sign_out()}
			</button>
		</form>
	</section>

	<section class="card p-5">
		<h2 class="font-medium">{m.settings_appearance()}</h2>
		<p class="mt-1 text-sm text-fg-subtle">
			{m.settings_appearance_hint()}
		</p>

		<div class="mt-4 grid grid-cols-3 gap-2">
			{#each themes as option (option.value)}
				{@const Icon = option.icon}
				<button
					type="button"
					onclick={() => theme.set(option.value)}
					aria-pressed={theme.value === option.value}
					class="flex flex-col items-center gap-2 rounded-lg border p-3 text-sm font-medium transition {theme.value ===
					option.value
						? 'border-accent bg-accent-soft text-accent-soft-fg '
						: 'border-border text-fg-muted hover:bg-surface-sunken '}"
				>
					<Icon class="size-5" />
					{option.label()}
				</button>
			{/each}
		</div>
	</section>

	<section class="card p-5">
		<h2 class="font-medium">{m.settings_language()}</h2>
		<p class="mt-1 text-sm text-fg-subtle">
			{m.settings_language_hint()}
		</p>
		<div class="mt-4 max-w-xs">
			<LanguageSwitcher />
		</div>
	</section>
</div>
