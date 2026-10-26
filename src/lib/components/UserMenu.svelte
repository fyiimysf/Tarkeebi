<script lang="ts">
	import { Avatar, DropdownMenu } from 'bits-ui';
	import { LogOut, Settings } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { Attachment } from 'svelte/attachments';
	import { clearAllCaches } from '#lib/cache.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { SessionUser } from '#lib/types.ts';

	/** Omit `href` for the dropdown menu; pass one to make the avatar a plain link. */
	let { user, href }: { user: SessionUser; href?: string } = $props();

	let signOutForm = $state<HTMLFormElement>();

	const bindSignOutForm: Attachment<HTMLFormElement> = (node) => {
		signOutForm = node;
		return () => {
			if (signOutForm === node) signOutForm = undefined;
		};
	};

	const initials = $derived(
		user.name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]?.toUpperCase())
			.join('') || '?'
	);
</script>

{#snippet avatar()}
	<Avatar.Root class="size-8 overflow-hidden rounded-full bg-accent">
		{#if user.image}
			<Avatar.Image src={user.image} alt="" class="size-full object-cover" />
		{/if}
		<Avatar.Fallback class="grid size-full place-items-center text-xs font-semibold text-accent-fg">
			{initials}
		</Avatar.Fallback>
	</Avatar.Root>
{/snippet}

{#if href}
	<a
		{href}
		class="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
		aria-label={m.nav_settings()}
	>
		{@render avatar()}
	</a>
{:else}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<button
					{...props}
					type="button"
					class="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
					aria-label={user.name}
				>
					{@render avatar()}
				</button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Portal>
			<DropdownMenu.Content
				sideOffset={6}
				align="end"
				class="z-50 min-w-56 rounded-lg border border-border bg-surface p-1 shadow-lifted"
			>
				<div class="px-2 py-1.5">
					<p class="truncate text-sm font-medium">{user.name}</p>
					<p class="truncate text-xs text-fg-subtle">{user.email}</p>
				</div>
				<DropdownMenu.Separator class="my-1 h-px bg-border" />
				<DropdownMenu.Item
					onSelect={() => goto(resolve('/(app)/app/settings'))}
					class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-surface-sunken"
				>
					<Settings class="size-4" />
					<span>{m.nav_settings()}</span>
				</DropdownMenu.Item>
				<DropdownMenu.Item
					onSelect={() => signOutForm?.requestSubmit()}
					class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-danger outline-none data-[highlighted]:bg-danger-soft"
				>
					<LogOut class="size-4" />
					<span>{m.nav_sign_out()}</span>
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Portal>
	</DropdownMenu.Root>
{/if}

<form
	{@attach bindSignOutForm}
	method="post"
	action={resolve('/(app)/app/sign-out')}
	use:enhance
	onsubmit={clearAllCaches}
	class="hidden"
></form>
