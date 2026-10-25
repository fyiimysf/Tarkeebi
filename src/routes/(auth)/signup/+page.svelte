<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	let submitting = $state(false);
</script>

<div class="card p-6 sm:p-8">
	<h1 class="text-2xl font-semibold tracking-tight">{m.auth_signup_title()}</h1>
	<p class="mt-1 text-sm text-fg-subtle">{m.auth_signup_subtitle()}</p>

	<form
		method="post"
		class="mt-6 space-y-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<input type="hidden" name="redirectTo" value={data.redirectTo} />

		<div class="space-y-1.5">
			<label class="label" for="name">{m.auth_name()}</label>
			<input
				id="name"
				name="name"
				autocomplete="name"
				required
				class="input"
				value={form?.name ?? ''}
			/>
		</div>

		<div class="space-y-1.5">
			<label class="label" for="email">{m.auth_email()}</label>
			<input
				id="email"
				name="email"
				type="email"
				autocomplete="email"
				required
				class="input"
				value={form?.email ?? ''}
			/>
		</div>

		<div class="space-y-1.5">
			<label class="label" for="password">{m.auth_password()}</label>
			<input
				id="password"
				name="password"
				type="password"
				autocomplete="new-password"
				minlength={8}
				required
				class="input"
			/>
		</div>

		{#if form?.message}
			<p class="text-sm text-danger">{form.message}</p>
		{/if}

		<button class="btn-primary w-full" disabled={submitting}>
			{submitting ? m.recipe_saving() : m.auth_sign_up()}
		</button>
	</form>

	<p class="mt-6 text-center text-sm text-fg-subtle">
		{m.auth_have_account()}
		<a href={resolve('/(auth)/login')} class="font-medium text-accent hover:underline">
			{m.nav_sign_in()}
		</a>
	</p>
</div>
