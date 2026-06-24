-- notes: tenant-scoped feature. bigint identity `id` (internal) + public `uuid`.
-- Isolation is enforced by the RLS policies below (via memberships), not in app
-- code. 0001_init.sql drops notes first, so this always creates it fresh.

create table notes (
  id         bigint generated always as identity primary key,
  uuid       uuid not null unique default gen_random_uuid(),
  group_id   bigint not null references groups(id) on delete cascade,
  author_id  bigint not null references users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, insert, delete on notes to authenticated;

alter table notes enable row level security;

create policy "read notes in my groups"
  on notes for select
  to authenticated
  using (
    group_id in (
      select m.group_id from memberships m
      join users u on u.id = m.user_id
      where u.uuid = auth.uid()
    )
  );

create policy "create notes in my groups"
  on notes for insert
  to authenticated
  with check (
    group_id in (
      select m.group_id from memberships m
      join users u on u.id = m.user_id
      where u.uuid = auth.uid()
    )
    and author_id = (select id from users where uuid = auth.uid())  -- author can't be forged
  );

-- Only the note's author may delete it (not other members of the group).
create policy "delete own notes"
  on notes for delete
  to authenticated
  using (
    author_id = (select id from users where uuid = auth.uid())
  );
