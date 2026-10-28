<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { Check, Languages } from '@lucide/svelte';
	import { getLocale, locales, setLocale } from '#lib/paraglide/runtime.js';

	const names: Record<string, string> = {
		en: 'English',
		id: 'Bahasa Indonesia',
		ur: 'اردو'
	};

	let current = $state(getLocale());

	function choose(locale: (typeof locales)[number]) {
		if (locale === current) return;
		current = locale;
		void setLocale(locale);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<button {...props} type="button" class="btn-ghost" aria-label={names[current] ?? current} title={names[current] ?? current}>
				<Languages class="size-4" />
				<span class="hidden sm:inline">{names[current] ?? current}</span>
				<span class="sm:hidden text-xs uppercase">{current}</span>
			</button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Portal>
		<DropdownMenu.Content
			sideOffset={6}
			class="z-50 min-w-48 rounded-lg border border-border bg-surface p-1 shadow-lifted"
		>
			{#each locales as locale (locale)}
				<DropdownMenu.Item
					onSelect={() => choose(locale)}
					class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none data-[highlighted]:bg-surface-sunken"
				>
					<span dir={locale === 'ur' ? 'rtl' : 'ltr'}>{names[locale] ?? locale}</span>
					<Check class="ms-auto size-4 text-accent {current !== locale ? 'opacity-0' : ''}" />
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Portal>
</DropdownMenu.Root>
