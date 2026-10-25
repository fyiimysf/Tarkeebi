import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	ORIGIN: {
		description: 'The app origin (base URL), e.g. `http://localhost:5173`.'
	},
	BETTER_AUTH_SECRET: {
		description: 'Secret used to sign tokens. For production use 32 characters generated with high entropy. See [Better Auth installation](https://www.better-auth.com/docs/installation).'
	},
	FILEBASE_ACCESS_KEY: {
		description: 'Filebase access key used for S3-compatible photo uploads.',
		schema: (value) => value ?? ''
	},
	FILEBASE_SECRET_KEY: {
		description: 'Filebase secret key used for S3-compatible photo uploads.',
		schema: (value) => value ?? ''
	},
	FILEBASE_BUCKET: {
		description: 'Filebase bucket that stores recipe photos.',
		schema: (value) => value ?? ''
	},
	FILEBASE_ENDPOINT: {
		description: 'Filebase S3 endpoint.',
		schema: (value) => value || 'https://s3.filebase.io'
	},
	FILEBASE_REGION: {
		description: 'Filebase S3 region.',
		schema: (value) => value || 'us-east-1'
	}
});
