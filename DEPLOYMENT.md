# SellerSuit Production Release Workflow

The existing Vercel production domain setup is not changed by this workflow.
Production values must be configured in the Vercel Dashboard, not committed to this repository.

## Flow

Localhost -> npm run release:ready -> Git push to main -> Vercel auto deploy -> existing domain updates automatically.

## Before Pushing To main

- Feature tested manually on localhost
- .env.local does not use production Supabase
- npm run release:ready passes
- No real secrets committed
- No localhost URLs in production config
- No hardcoded production Supabase URL in local/dev scripts
- Database migration reviewed, if any
- Build passes

## Local Development

1. Copy `.env.local.example` to `.env.local`.
2. Use local Supabase or another non-production Supabase project.
3. Use Stripe test keys only.
4. Run the app on localhost and test the change manually.
5. Run `npm run release:ready`.
6. If you are testing the Chrome extension, run `npm --workspace @sellersuit/extension run prepare:dev` after `.env.local` is set so the dev build points at the same local/test backend.

`.env.local` is ignored by Git and must never contain production Supabase or live payment keys.

`npm run release:ready` now checks:

- `.env.local` exists and does not target production Supabase
- `ENVIRONMENT` is not `production`
- Stripe local key is not a live key
- static security checks pass
- typecheck passes
- lint passes
- build passes

## Production

Configure real production values only in the Vercel Dashboard:

Vercel Project -> Settings -> Environment Variables -> Production.

Do not create or commit a real `.env.production` file. Vercel will read production values from its dashboard during deployment.

## Optional Pre-Push Hook

Enable the repository hook with:

```sh
git config core.hooksPath .githooks
```

The hook runs:

```sh
npm run release:ready
```
