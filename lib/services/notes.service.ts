import type { NextRequest } from "next/server";
import { createNoteSchema, deleteNoteSchema } from "@/lib/validation/notes.schema";
import { readJson } from "@/lib/http/handle";
import type { INotesRepository, Note } from "@/lib/interface/repository/INotesRepository";
import type { INotesService } from "@/lib/interface/service/INotesService";

export class NotesService implements INotesService {
  constructor(
    private readonly repo: INotesRepository,
    private readonly currentUserId: () => Promise<number>,
  ) {}

  getAll(_req: NextRequest): Promise<Note[]> {
    return this.repo.list();
  }

  async create(req: NextRequest): Promise<Note> {
    const input = createNoteSchema.parse(await readJson(req));
    const author_id = await this.currentUserId();
    return this.repo.create({ group_id: input.group_id, author_id, body: input.body });
  }

  async remove(req: NextRequest): Promise<void> {
    const { id } = deleteNoteSchema.parse({ id: new URL(req.url).searchParams.get("id") });
    await this.repo.remove(id);
  }
}
