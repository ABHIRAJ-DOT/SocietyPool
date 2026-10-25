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

Create `frontend/.env.local` with the Supabase project URL and publishable key before starting the app:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

The app shows sample deals while signed out. Residents can create an account, sign in, join a society with its invite code, browse that society's live deals, and place orders through the database RPC. Email confirmation may be required, depending on the Supabase Auth settings. The app does not collect or process payments. Product photography loads from Unsplash and needs an internet connection.

## Backend setup

The initial Supabase schema, RLS policies, resident RPCs, and seed data live in `backend/supabase/`. Apply `backend/supabase/migrations/202610250001_initial_schema.sql` to a **development** Supabase project before running `backend/supabase/seed.sql`. The seed creates the Greenview demo society and sample deals; its invite code is `GREENVIEW-DEMO-2026`. Never use the demo seed in production.

Read [`backend/docs/backend-contracts.md`](backend/docs/backend-contracts.md) for canonical statuses, resident query/RPC contracts, security rules, and current limitations. `.env.local` is ignored by Git. Never commit database passwords, API secrets, or a secret/service-role key; the browser app uses only the publishable key and relies on RLS for data access.
