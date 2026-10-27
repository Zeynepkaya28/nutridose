// Receives browser-side errors from the error boundaries and logs them (no personal or health data).
import { NextResponse } from "next/server";
import { z } from "zod";
import { createLogger } from "@/server/log";

const ReportSchema = z.object({
  message: z.string().max(500),
  digest: z.string().max(100).optional(),
  path: z.string().max(200),
});

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 2048) return new NextResponse(null, { status: 413 });
  const parsed = ReportSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new NextResponse(null, { status: 400 });
  createLogger({ route: "client-error" }).error("client error", {
    message: parsed.data.message,
    digest: parsed.data.digest,
    path: parsed.data.path.split("?")[0],
  });
  return new NextResponse(null, { status: 204 });
}
