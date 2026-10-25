/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { self } from '$app/service-worker';
import { version } from '$app/env';
import { assets, immutable } from '$app/manifest';
import { resolve } from '$app/paths';

const CACHE = `tarkeebi-${version}`;

// Build output plus everything in `static/`.
const PRECACHE = [
	...immutable.map((asset) => resolve(asset.path)),
	...assets.map((asset) => resolve(asset.path))
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE);
			await cache.addAll(PRECACHE);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key !== CACHE) await caches.delete(key);
			}
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const url = new URL(event.request.url);

	if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

	// Auth, API, and private app responses should never be served from the cache.
	if (
		url.pathname.startsWith('/api/') ||
		url.pathname.startsWith('/auth/') ||
		url.pathname === '/app' ||
		url.pathname.startsWith('/app/') ||
		url.pathname === '/login' ||
		url.pathname === '/signup'
	) {
		return;
	}

	event.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);

			if (PRECACHE.includes(url.pathname)) {
				const cached = await cache.match(url.pathname);
				if (cached) return cached;
			}

			try {
				const response = await fetch(event.request);

				if (response.ok && !response.headers.get('cache-control')?.includes('no-store')) {
					void cache.put(event.request, response.clone());
				}

				return response;
			} catch (error) {
				const cached = await cache.match(event.request);
				if (cached) return cached;

				if (event.request.mode === 'navigate') {
					const fallback = await cache.match('/');
					if (fallback) return fallback;
				}

				throw error;
			}
		})()
	);
});
