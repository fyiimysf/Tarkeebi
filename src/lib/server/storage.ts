import {
	DeleteObjectCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';
import {
	FILEBASE_ACCESS_KEY,
	FILEBASE_BUCKET,
	FILEBASE_ENDPOINT,
	FILEBASE_REGION,
	FILEBASE_SECRET_KEY
} from '$app/env/private';

const MAX_BYTES = 5 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/webp': 'webp',
	'image/avif': 'avif'
};

export class ImageUploadError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ImageUploadError';
	}
}

function requireEnv(value: string, name: string) {
	if (!value) throw new Error(`${name} is not configured.`);
	return value;
}

function client() {
	return new S3Client({
		region: FILEBASE_REGION,
		endpoint: FILEBASE_ENDPOINT,
		forcePathStyle: true,
		credentials: {
			accessKeyId: requireEnv(FILEBASE_ACCESS_KEY, 'FILEBASE_ACCESS_KEY'),
			secretAccessKey: requireEnv(FILEBASE_SECRET_KEY, 'FILEBASE_SECRET_KEY')
		}
	});
}

/**
 * Filebase free-tier buckets cannot be made public, so every image is served
 * through our own `/media/<key>` proxy route instead of a direct bucket URL.
 */
export function filebasePublicUrl(key: string): string {
	return `/media/${key}`;
}

/**
 * Read an image object from Filebase for the `/media` proxy route.
 */
export async function getRecipeImage(key: string) {
	return client().send(
		new GetObjectCommand({
			Bucket: requireEnv(FILEBASE_BUCKET, 'FILEBASE_BUCKET'),
			Key: key
		})
	);
}

/**
 * Upload a validated recipe photo and return its object key and public URL.
 */
export async function uploadRecipeImage(file: File, userId: string) {
	if (!file.size) throw new ImageUploadError('The selected file is empty.');
	if (file.size > MAX_BYTES) throw new ImageUploadError('Images must be 5 MB or smaller.');

	const extension = EXTENSIONS[file.type];
	if (!extension) throw new ImageUploadError('Use a JPEG, PNG, WebP, or AVIF image.');

	const key = `recipes/${userId}/${crypto.randomUUID()}.${extension}`;
	const body = new Uint8Array(await file.arrayBuffer());

	await client().send(
		new PutObjectCommand({
			Bucket: requireEnv(FILEBASE_BUCKET, 'FILEBASE_BUCKET'),
			Key: key,
			Body: body,
			ContentType: file.type,
			CacheControl: 'public, max-age=31536000, immutable'
		})
	);

	return { key, url: filebasePublicUrl(key) };
}

/**
 * Best-effort delete. A missing object should not block removing a recipe.
 */
export async function deleteRecipeImage(key: string): Promise<void> {
	try {
		await client().send(
			new DeleteObjectCommand({
				Bucket: requireEnv(FILEBASE_BUCKET, 'FILEBASE_BUCKET'),
				Key: key
			})
		);
	} catch (error) {
		console.error('Could not delete Filebase object', key, error);
	}
}
