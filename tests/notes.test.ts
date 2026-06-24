import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asOwner, asUser, pool, ACME, GLOBEX, ALICE, BOB, CAROL } from "./helpers";

// 42501 = Postgres RLS denial; assert on it so a test can't false-pass.
const RLS_DENIED = { code: "42501" };

// Identity ids are auto-assigned; resolve seeded uuids -> bigint ids.
// (node-pg returns bigint as a string, so these stay strings.)
let acme: string, globex: string, alice: string, bob: string;

describe("notes tenant isolation", () => {
  beforeAll(async () => {
    const groups = (await asOwner("select id, uuid from groups")).rows;
    const users = (await asOwner("select id, uuid from users")).rows;
    acme = groups.find((r) => r.uuid === ACME).id;
    globex = groups.find((r) => r.uuid === GLOBEX).id;
    alice = users.find((r) => r.uuid === ALICE).id;
    bob = users.find((r) => r.uuid === BOB).id;

    await asOwner("delete from notes");
    await asOwner(
      "insert into notes (group_id, author_id, body) values ($1,$2,'Acme note'),($3,$4,'Globex note')",
      [acme, alice, globex, bob],
    );
  });

  afterAll(async () => {
    await asOwner("delete from notes");
    await pool.end();
  });

  it("a member sees only their own group's notes", async () => {
    const rows = await asUser(ALICE, async (q) => (await q("select group_id from notes")).rows);
    expect(rows.length).toBe(1);
    expect(rows.every((r) => r.group_id === acme)).toBe(true);
  });

  it("cannot read another group's notes", async () => {
    const rows = await asUser(
      BOB,
      async (q) => (await q("select id from notes where group_id = $1", [acme])).rows,
    );
    expect(rows.length).toBe(0);
  });

  it("a user in both groups sees both", async () => {
    const seen = await asUser(CAROL, async (q) =>
      (await q("select group_id from notes")).rows.map((r) => r.group_id).sort(),
    );
    expect(seen).toEqual([acme, globex].sort());
  });

  it("can insert a note into their own group", async () => {
    const row = await asUser(ALICE, async (q) =>
      (
        await q(
          "insert into notes (group_id, author_id, body) values ($1, $2, 'mine') returning group_id",
          [acme, alice],
        )
      ).rows[0],
    );
    expect(row.group_id).toBe(acme);
  });

  it("cannot insert a note into a group they don't belong to", async () => {
    await expect(
      asUser(ALICE, (q) =>
        q("insert into notes (group_id, author_id, body) values ($1, $2, 'nope')", [globex, alice]),
      ),
    ).rejects.toMatchObject(RLS_DENIED);
  });

  it("cannot forge authorship as another user", async () => {
    await expect(
      asUser(ALICE, (q) =>
        q("insert into notes (group_id, author_id, body) values ($1, $2, 'forged')", [acme, bob]),
      ),
    ).rejects.toMatchObject(RLS_DENIED);
  });

  it("an author can delete their own note", async () => {
    const deleted = await asUser(
      ALICE,
      async (q) => (await q("delete from notes where group_id = $1", [acme])).rowCount,
    );
    expect(deleted).toBe(1);
  });

  it("a group member who is not the author cannot delete it", async () => {
    const deleted = await asUser(
      CAROL,
      async (q) => (await q("delete from notes where group_id = $1", [acme])).rowCount,
    );
    expect(deleted).toBe(0);
    const survivors = (await asOwner("select id from notes where group_id = $1", [acme])).rowCount;
    expect(survivors).toBe(1);
  });

  it("cannot delete a note in another group", async () => {
    const deleted = await asUser(
      BOB,
      async (q) => (await q("delete from notes where group_id = $1", [acme])).rowCount,
    );
    expect(deleted).toBe(0);
  });
});
