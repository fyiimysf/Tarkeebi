<script lang="ts">
	import { onDestroy } from 'svelte';

	let {
		label,
		duration = 4000,
		disabled = false,
		onComplete
	}: {
		label: string;
		duration?: number;
		disabled?: boolean;
		onComplete: () => void;
	} = $props();

	let progress = $state(0);
	let timer: ReturnType<typeof setInterval> | null = null;

	function clear() {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
	}

	function start() {
		if (disabled || timer) return;

		const startedAt = performance.now();
		timer = setInterval(() => {
			progress = Math.min(1, (performance.now() - startedAt) / duration);
			if (progress >= 1) {
				clear();
				progress = 0;
				try {
					navigator.vibrate?.(50);
				} catch {
					/* vibration is a nice-to-have */
				}
				onComplete();
			}
		}, 40);
	}

	function stop() {
		clear();
		progress = 0;
	}

	function onPointerDown(event: PointerEvent) {
		const pointerType = event.pointerType;
		if (pointerType === 'mouse' && event.button !== 0) return;
		// Keeps pointerup firing on this button even if the finger slides away.
		(event.currentTarget as HTMLButtonElement).setPointerCapture?.(event.pointerId);
		start();
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key !== ' ' && event.key !== 'Enter') return;
		event.preventDefault();
		if (!event.repeat) start();
	}

	function onKeyUp(event: KeyboardEvent) {
		if (event.key === ' ' || event.key === 'Enter') stop();
	}

	onDestroy(clear);
</script>

<button
	type="button"
	class="btn-danger relative w-full overflow-hidden select-none touch-none disabled:opacity-60 sm:w-auto"
	{disabled}
	aria-label={label}
	onpointerdown={onPointerDown}
	onpointerup={stop}
	onpointercancel={stop}
	onkeydown={onKeyDown}
	onkeyup={onKeyUp}
	onblur={stop}
>
	<span
		class="absolute inset-y-0 start-0 bg-danger/70"
		style="width: {(progress * 100).toFixed(1)}%"
		aria-hidden="true"
	></span>
	<span class="relative" aria-live="polite">{label}</span>
</button>
