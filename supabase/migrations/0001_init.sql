-- ===========================================================================
-- Multi-tenant sandbox.
--   Reference tables : groups, users, memberships  (no RLS)
--   Feature table    : documents                   (RLS enabled, NOT isolated)
--
-- Every table has a bigint identity `id` (fast internal PK / FK joins) plus a
-- unique `uuid` (the public-facing identifier — sequential ids are never
-- exposed). Foreign keys reference the bigint `id`.
-- Re-runnable: drops and recreates the sandbox objects.
-- ===========================================================================

create extension if not exists pgcrypto;

drop table if exists notes cascade;        -- created in 0002_notes.sql
drop table if exists documents cascade;
drop table if exists memberships cascade;
drop table if exists users cascade;
drop table if exists groups cascade;

create table groups (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  name       text not null,
  created_at timestamptz not null default now()
);

create table users (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz not null default now()
);

create table memberships (
  user_id  bigint not null references users(id) on delete cascade,
  group_id bigint not null references groups(id) on delete cascade,
  primary key (user_id, group_id)
);

create table documents (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  group_id   bigint not null references groups(id) on delete cascade,
  author_id  bigint not null references users(id) on delete cascade,
  title      text not null,
  created_at timestamptz not null default now()
);

grant select on groups, users, memberships to authenticated;
grant select, insert on documents to authenticated;

-- ---------------------------------------------------------------------------
-- documents RLS — intentionally NOT tenant-isolated (the sample baseline).
-- ---------------------------------------------------------------------------
alter table documents enable row level security;

create policy "documents are visible to signed-in users"
  on documents for select
  to authenticated
  using (true);

create policy "signed-in users can add documents"
  on documents for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Seed (two tenants; carol belongs to both). Fixed uuids match tests/helpers.ts;
-- bigint ids are auto-assigned, so FKs are resolved by joining on uuid.
-- ---------------------------------------------------------------------------
insert into groups (uuid, name) values
  ('11111111-1111-1111-1111-111111111111', 'Acme'),
  ('22222222-2222-2222-2222-222222222222', 'Globex');

insert into users (uuid, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'alice@acme.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'bob@globex.test'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'carol@both.test');

insert into memberships (user_id, group_id)
select u.id, g.id
from (values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, '22222222-2222-2222-2222-222222222222'::uuid),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '11111111-1111-1111-1111-111111111111'::uuid),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, '22222222-2222-2222-2222-222222222222'::uuid)
) as seed(user_uuid, group_uuid)
join users  u on u.uuid = seed.user_uuid
join groups g on g.uuid = seed.group_uuid;

insert into documents (group_id, author_id, title)
select g.id, u.id, seed.title
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Acme welcome doc'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Globex welcome doc')
) as seed(group_uuid, author_uuid, title)
join groups g on g.uuid = seed.group_uuid
join users  u on u.uuid = seed.author_uuid;
