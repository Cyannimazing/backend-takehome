# Notes

## RLS approach

Tenant isolation for `notes` is enforced entirely in the database. RLS is enabled
and the policies resolve the caller from `auth.uid()` (a uuid) to their bigint
user id via `users.uuid`, then check the note's `group_id` against `memberships`:
a note is readable or creatable only when its group is one the caller belongs to.
Create additionally requires `author_id` to equal the caller, so authorship can't
be forged, and **delete is restricted to the note's author** — a fellow group
member cannot delete someone else's note. The API never filters by tenant in app code —
it forwards the caller's JWT (anon/publishable key, see `lib/supabase.ts`) and the
policies decide.

## Schema (id + uuid)

Every table has a `bigint generated always as identity` primary key `id` plus a
unique `uuid`. The bigint `id` is used for internal joins / foreign keys (fast and
compact); the `uuid` is the only identifier exposed publicly, so sequential ids
never leak. Notes are addressed publicly by `uuid` (e.g.
`DELETE /api/notes?id=<uuid>`), while `group_id` / `author_id` are bigint FKs.

## Architecture

Layered: route → controller (HTTP) → service (validation +
business) → repository (queries). The service depends on the repository
*interface*, so it's testable with a fake. Tests (`tests/notes.test.ts`) prove
isolation at the DB level via the `asUser` harness: members see only their group,
cross-tenant reads return nothing, and cross-tenant / forged-author writes are
rejected (asserted on SQLSTATE `42501`).

## How I used AI

I used Claude Code (Claude Opus) to scaffold the layered structure, draft the RLS
policies and migration, and write the tests. I reviewed every line and verified
behavior with `pnpm db:reset` and `pnpm test` against a live Supabase Postgres.
