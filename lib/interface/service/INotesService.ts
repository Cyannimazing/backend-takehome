import type { NextRequest } from "next/server";
import type { Note } from "@/lib/interface/repository/INotesRepository";

export interface INotesService {
  getAll(req: NextRequest): Promise<Note[]>;
  create(req: NextRequest): Promise<Note>;
  remove(req: NextRequest): Promise<void>;
}
