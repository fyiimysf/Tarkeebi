import type { FlipParams } from 'svelte/animate';
import { cubicOut } from 'svelte/easing';
import { prefersReducedMotion } from 'svelte/motion';
import type { FadeParams, FlyParams, SlideParams, TransitionConfig } from 'svelte/transition';

/**
 * Svelte's JS transitions use the Web Animations API, so the global
 * `prefers-reduced-motion` CSS rule does not reach them. These helpers read the
 * media query directly and zero out motion for users who ask for less of it.
 */
export function fadeParams(duration = 180): FadeParams {
	return { duration: prefersReducedMotion.current ? 0 : duration };
}

export function flyParams(params: FlyParams = {}): FlyParams {
	if (prefersReducedMotion.current) {
		return { ...params, x: 0, y: 0, duration: 0, delay: 0 };
	}

	return { easing: cubicOut, ...params };
}

export function slideParams(duration = 180): SlideParams {
	return { duration: prefersReducedMotion.current ? 0 : duration };
}

/**
 * A soft focus-in for full-screen surfaces. The element settles from a slight
 * blur as it fades in, which makes the cook-mode takeover feel less abrupt.
 */
export function blurFade(
	_node: Element,
	{ duration = 220, amount = 14 }: { duration?: number; amount?: number } = {}
): TransitionConfig {
	return {
		duration: prefersReducedMotion.current ? 0 : duration,
		easing: cubicOut,
		css: (t) => `opacity: ${t}; filter: blur(${(1 - t) * amount}px)`
	};
}

export function flipParams(duration = 180): FlipParams {
	return { duration: prefersReducedMotion.current ? 0 : duration };
}
