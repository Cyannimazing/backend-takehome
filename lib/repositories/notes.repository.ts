import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateNoteInput, INotesRepository, Note } from "@/lib/interface/repository/INotesRepository";

const COLUMNS = "uuid, group_id, author_id, body, created_at, updated_at";

export class NotesRepository implements INotesRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(): Promise<Note[]> {
    const { data, error } = await this.db
      .from("notes")
      .select(COLUMNS)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Note[];
  }

  async create(input: CreateNoteInput): Promise<Note> {
    const { data, error } = await this.db
      .from("notes")
      .insert(input)
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data as Note;
  }

  async remove(uuid: string): Promise<void> {
    const { error } = await this.db.from("notes").delete().eq("uuid", uuid);
    if (error) throw error;
  }
}
