import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase";
import { NotesRepository } from "@/lib/repositories/notes.repository";
import { NotesService } from "@/lib/services/notes.service";
import { UnauthorizedError, empty } from "@/lib/http/handle";

class NotesController {
  list = async (req: NextRequest): Promise<NextResponse> =>
    NextResponse.json({ notes: await this.service(req).getAll(req) });

  create = async (req: NextRequest): Promise<NextResponse> =>
    NextResponse.json({ note: await this.service(req).create(req) }, { status: 201 });

  remove = async (req: NextRequest): Promise<NextResponse> =>
    empty(this.service(req).remove(req));

  private service(req: NextRequest): NotesService {
    const db = createUserClient(req);
    const currentUserId = async (): Promise<number> => {
      const { data } = await db.auth.getUser();
      if (!data.user) throw new UnauthorizedError();
      // auth.uid() is a uuid; map it to the caller's bigint user id.
      const { data: row, error } = await db.from("users").select("id").eq("uuid", data.user.id).single();
      if (error || !row) throw new UnauthorizedError();
      return row.id as number;
    };
    return new NotesService(new NotesRepository(db), currentUserId);
  }
}

export const notesController = new NotesController();
