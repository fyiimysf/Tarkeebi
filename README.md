# Tarkeebi

A personal recipe box with a private, mobile-first app and a public, desktop-friendly recipe blog.

- **Public:** `/` (published recipes) and `/r/[slug]` (recipe permalink)
- **Private:** `/app`, `/app/recipes/new`, `/app/recipes/[id]`, `/app/settings`
- **Stack:** Svelte 5 runes, SvelteKit, Bits UI, Tailwind CSS, Cloudflare Pages + D1, Filebase S3-compatible storage

## How it works

- Recipes, ingredients, and steps live in D1.
- Photos are uploaded server-side to Filebase. D1 stores only the public URL and object key.
- Recipes are private until published from the recipe detail page.
- Publishing assigns a stable slug. Unpublishing hides the public page without changing the slug.
- `/app/*` responses are never cached by the service worker.

## Local setup

```sh
bun install
cp .env.example .env
bun run db:migrate:local
bun run dev
```

Apply new schema migrations with:

```sh
bun run db:generate
bun run db:migrate:local
```

## Environment variables

Set these in `.env` for local development and in the Cloudflare Pages dashboard for production:

| Variable | Purpose |
| --- | --- |
| `ORIGIN` | App origin, e.g. `http://localhost:5173` |
| `BETTER_AUTH_SECRET` | Better Auth signing secret (32+ random characters) |
| `FILEBASE_ACCESS_KEY` | Filebase access key |
| `FILEBASE_SECRET_KEY` | Filebase secret key |
| `FILEBASE_BUCKET` | Bucket that stores recipe photos |
| `FILEBASE_REGION` | Optional, defaults to `us-east-1` |
| `FILEBASE_ENDPOINT` | Optional, defaults to `https://s3.filebase.io` |

Filebase variables should be encrypted secrets in production. The bucket must allow public reads so recipe images can be served from `<img>` tags.

## Checks

```sh
bun run check
bunx tsc --noEmit
bun run build
```

## Deploy

```sh
bun run build
bunx wrangler pages deploy .svelte-kit/cloudflare --project-name tarkeebi
```

Then apply remote migrations:

```sh
bun run db:migrate:remote
```

The PWA manifest starts at `/app` so installed app launches go straight to the private recipe box.
