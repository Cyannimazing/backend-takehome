import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";

export class UnauthorizedError extends Error {}
export class BadRequestError extends Error {}

export function withErrors(
  fn: (req: NextRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req) => {
    try {
      return await fn(req);
    } catch (err) {
      return toResponse(err);
    }
  };
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new BadRequestError("Invalid JSON body");
  }
}

export async function empty(p: Promise<unknown>, status = 204): Promise<NextResponse> {
  await p;
  return new NextResponse(null, { status });
}

function toResponse(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json({ error: "Invalid input", details: err.flatten() }, { status: 400 });
  }
  if (err instanceof BadRequestError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if ((err as { code?: string })?.code === "42501") {
    // Postgres insufficient_privilege — an RLS policy rejected the write.
    return NextResponse.json({ error: "You don't have access to that group." }, { status: 403 });
  }
  return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
}
