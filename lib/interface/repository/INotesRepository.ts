export type Note = {
  uuid: string;
  group_id: number;
  author_id: number;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CreateNoteInput = {
  group_id: number;
  author_id: number;
  body: string;
};

export interface INotesRepository {
  list(): Promise<Note[]>;
  create(input: CreateNoteInput): Promise<Note>;
  remove(uuid: string): Promise<void>;
}
