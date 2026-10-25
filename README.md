# Society Pool

A mobile-first neighbourhood group-buying app. Frontend and backend assets are kept in separate top-level folders.

## Repository layout

- `frontend/` — Next.js, TypeScript, Tailwind CSS, and the resident-facing web app.
- `backend/` — Supabase database migrations, development seed data, and shared backend contracts.
- `AGENTS.md` — repository-wide Codex/Next.js contributor instructions.

## Run the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The resident UI currently uses mock data. Product photography loads from Unsplash and requires an internet connection. Do not enter real payment details; checkout is simulated.

## Backend setup

The initial Supabase schema, RLS policies, resident RPCs, and seed data live in `backend/supabase/`. Apply `backend/supabase/migrations/202610250001_initial_schema.sql` to a **development** Supabase project before running `backend/supabase/seed.sql`. Never use the demo seed in production.

Read [`backend/docs/backend-contracts.md`](backend/docs/backend-contracts.md) for canonical statuses, resident query/RPC contracts, security rules, and current limitations. The UI is not connected to Supabase yet. Never commit database passwords, API secrets, or a service-role key.
