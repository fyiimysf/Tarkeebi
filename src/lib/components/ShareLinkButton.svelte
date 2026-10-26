<script lang="ts">
	import { Check, Share2, X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';

	let {
		url,
		title,
		label,
		variant = 'btn-secondary',
		iconOnly = false
	}: {
		url: string;
		title?: string;
		label?: string;
		variant?: string;
		iconOnly?: boolean;
	} = $props();

	let copied = $state(false);
	let failed = $state(false);
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	function resetLater() {
		clearTimeout(resetTimer);
		resetTimer = setTimeout(() => {
			copied = false;
			failed = false;
		}, 2000);
	}

	function absoluteUrl(value: string) {
		try {
			return new URL(value, window.location.origin).toString();
		} catch {
			return value;
		}
	}

	/**
	 * Fallback for browsers without the async Clipboard API (notably an
	 * insecure origin, where `navigator.clipboard` is undefined). The legacy
	 * copy command still works there when it runs inside the click handler.
	 */
	function copyWithExecCommand(text: string) {
		const active = document.activeElement;
		const area = document.createElement('textarea');
		area.value = text;
		area.readOnly = true;
		area.setAttribute('aria-hidden', 'true');
		area.style.position = 'fixed';
		area.style.top = '0';
		area.style.left = '0';
		area.style.width = '1px';
		area.style.height = '1px';
		area.style.padding = '0';
		area.style.border = 'none';
		area.style.outline = 'none';
		area.style.boxShadow = 'none';
		area.style.background = 'transparent';
		area.style.opacity = '0.01';
		area.style.pointerEvents = 'none';
		document.body.appendChild(area);

		const selection = document.getSelection();
		const previous = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

		area.focus();
		area.select();
		area.setSelectionRange(0, text.length);

		let copied = false;
		try {
			copied = document.execCommand('copy');
		} catch {
			copied = false;
		}

		area.remove();
		if (previous && selection) {
			selection.removeAllRanges();
			selection.addRange(previous);
		}
		if (active instanceof HTMLElement) active.focus();
		return copied;
	}

	async function copyLink(text: string) {
		if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				return true;
			} catch {
				// Permission denied / document not focused — try the legacy path.
			}
		}
		return copyWithExecCommand(text);
	}

	function shareData(shareUrl: string): ShareData {
		// Android's share sheet uses the title as the subject and the URL as the
		// body. Some browsers ignore `url` unless there is also text, so include
		// the title as text as well.
		return title ? { title, text: title, url: shareUrl } : { url: shareUrl };
	}

	async function tryNativeShare(shareUrl: string) {
		if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
			return false;
		}

		const payloads: ShareData[] = [shareData(shareUrl)];
		// A few Android builds reject a payload with both text and a URL.
		// Retry with the URL alone before giving up on the native sheet.
		if (title) payloads.push({ url: shareUrl });

		for (const data of payloads) {
			try {
				await navigator.share(data);
				return true;
			} catch (error) {
				// User dismissed the sheet — do nothing.
				if (error instanceof DOMException && error.name === 'AbortError') return true;
			}
		}

		return false;
	}

	/** Opens the OS share sheet; falls back to copying the link where the
	 *  Web Share API isn't available (e.g. most desktop browsers, or an
	 *  insecure origin, where mobile browsers hide it entirely). */
	async function handleShare() {
		const shareUrl = absoluteUrl(url);

		if (await tryNativeShare(shareUrl)) return;

		if (await copyLink(shareUrl)) {
			copied = true;
			resetLater();
			return;
		}

		failed = true;
		resetLater();
		// Last resort: expose the URL so it can still be copied manually.
		window.prompt(m.public_copy_manual(), shareUrl);
	}
</script>

{#snippet status()}
	{#if copied}
		<Check class="size-4" />
		{#if !iconOnly}{m.public_copied()}{/if}
	{:else if failed}
		<X class="size-4" />
		{#if !iconOnly}{m.public_copy_failed()}{/if}
	{:else}
		<Share2 class="size-4" />
		{#if !iconOnly}{label ?? m.public_share()}{/if}
	{/if}
{/snippet}

<button
	type="button"
	class={variant}
	onclick={handleShare}
	aria-label={copied
		? m.public_copied()
		: failed
			? m.public_copy_failed()
			: (label ?? m.public_share())}
	title={label ?? m.public_share()}
>
	{@render status()}
</button>
