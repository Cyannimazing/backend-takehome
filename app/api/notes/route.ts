import { notesController } from "@/lib/controllers/notes.controller";
import { withErrors } from "@/lib/http/handle";

export const GET = withErrors((req) => notesController.list(req));
export const POST = withErrors((req) => notesController.create(req));
export const DELETE = withErrors((req) => notesController.remove(req));
