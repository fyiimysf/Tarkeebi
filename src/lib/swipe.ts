type SwipeParams = {
	onNext: () => void;
	onPrevious: () => void;
	threshold?: number;
};

/**
 * Horizontal swipe navigation for touch screens. The listener is deliberately
 * passive so vertical recipe scrolling keeps native momentum; the gesture only
 * commits once the horizontal travel clearly outweighs the vertical travel.
 */
export function swipe(node: HTMLElement, initial: SwipeParams) {
	let params = initial;
	let start: { x: number; y: number; id: number } | null = null;

	function reset() {
		start = null;
	}

	function onTouchStart(event: TouchEvent) {
		const target = event.target as HTMLElement | null;
		if (
			event.touches.length !== 1 ||
			target?.closest('a, button, input, textarea, select, [contenteditable="true"]')
		) {
			reset();
			return;
		}

		const touch = event.touches[0];
		start = { x: touch.clientX, y: touch.clientY, id: touch.identifier };
	}

	function onTouchEnd(event: TouchEvent) {
		const origin = start;
		reset();
		if (!origin) return;

		const touch = Array.from(event.changedTouches).find((item) => item.identifier === origin.id);
		if (!touch) return;

		// Selecting recipe text should not flip the step underneath the finger.
		const selection = window.getSelection();
		if (selection && !selection.isCollapsed) return;

		const dx = touch.clientX - origin.x;
		const dy = touch.clientY - origin.y;
		const threshold = params.threshold ?? 56;
		if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.25) return;

		// Match the visual chevron direction, including right-to-left locales.
		const forward = document.documentElement.dir === 'rtl' ? dx > 0 : dx < 0;
		if (forward) params.onNext();
		else params.onPrevious();
	}

	node.addEventListener('touchstart', onTouchStart, { passive: true });
	node.addEventListener('touchend', onTouchEnd, { passive: true });
	node.addEventListener('touchcancel', reset, { passive: true });

	return {
		update(next: SwipeParams) {
			params = next;
		},
		destroy() {
			node.removeEventListener('touchstart', onTouchStart);
			node.removeEventListener('touchend', onTouchEnd);
			node.removeEventListener('touchcancel', reset);
		}
	};
}
