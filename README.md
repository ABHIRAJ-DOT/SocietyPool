# Society Pool

A mobile-first neighbourhood group-buying experience built with Next.js, TypeScript, and Tailwind CSS.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Current prototype

The resident home page includes deal discovery, category filtering, search, pooled-quantity progress, deal details, a demo basket, and demo order/profile views. Prices, progress, orders, and society information are sample data until the shared Supabase backend and API contracts are connected. Product photography loads from Unsplash and needs an internet connection.

Do not enter real payment details. Checkout is simulated.

## Supabase backend foundation

The initial schema, row-level security policies, resident membership/order RPCs, and development seed data live in `supabase/`. Apply `supabase/migrations/202610250001_initial_schema.sql` to a new Supabase development project before running `supabase/seed.sql`. Never use the demo seed in production.

The shared operations and status names are documented in [`docs/backend-contracts.md`](docs/backend-contracts.md). The resident UI still uses its local mock data; connecting it requires a Supabase project URL and publishable/anon key, followed by server/client integration. Never add a service-role key to browser code or commit secrets.
