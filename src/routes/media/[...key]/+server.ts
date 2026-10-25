import { error } from '@sveltejs/kit';
import { getRecipeImage } from '#lib/server/storage.ts';
import type { RequestHandler } from './$types';

const KEY_PATTERN = /^recipes\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(?:jpe?g|png|webp|avif)$/;

/**
 * Proxy for Filebase images. Filebase's free tier does not allow public
 * buckets, so objects are read server-side with our credentials and streamed
 * back to the browser. Keys are unguessable UUID paths under `recipes/`.
 */
export const GET: RequestHandler = async ({ params, request, setHeaders }) => {
	const key = params.key;

	if (!key || !KEY_PATTERN.test(key)) error(404, 'Not found');

	let object: Awaited<ReturnType<typeof getRecipeImage>>;
	try {
		object = await getRecipeImage(key);
	} catch (cause) {
		const status = (cause as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
		const name = (cause as { name?: string }).name;
		if (status === 404 || name === 'NoSuchKey' || name === 'NotFound') {
			error(404, 'Not found');
		}
		console.error('Could not read Filebase object', key, cause);
		error(502, 'Image unavailable');
	}

	if (!object.Body) error(404, 'Not found');

	const etag = object.ETag;
	if (etag && request.headers.get('if-none-match') === etag) {
		return new Response(null, { status: 304 });
	}

	setHeaders({
		'cache-control': 'public, max-age=31536000, immutable',
		'content-type': object.ContentType ?? 'application/octet-stream',
		...(etag ? { etag } : {})
	});

	return new Response(object.Body.transformToWebStream(), { status: 200 });
};
