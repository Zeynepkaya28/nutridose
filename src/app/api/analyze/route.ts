import { NextResponse } from "next/server";
import { AnalyzeRequestSchema, type AnalyzeErrorResponse, type AnalyzeResponse } from "@/lib/api/analyze";
import { getRequestSession } from "@/lib/supabase/request";
import { analyze, toErrorResult } from "@/server/analyze";
import { MESSAGES } from "@/server/errors";
import { createLogger } from "@/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 16 * 1024;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const logger = createLogger({ route: "POST /api/analyze", requestId });

  const respond = (status: number, body: AnalyzeResponse | AnalyzeErrorResponse) =>
    NextResponse.json(body, {
      status,
      headers: {
        "cache-control": "no-store",
        "x-request-id": requestId,
        ...(status === 429 ? { "retry-after": "60" } : {}),
      },
    });

  try {
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
      return respond(413, { error: MESSAGES.tooLarge });
    }

    const session = await getRequestSession(request);
    if (!session) return respond(401, { error: MESSAGES.unauthenticated });

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return respond(400, { error: MESSAGES.badRequest });
    }
    const parsed = AnalyzeRequestSchema.safeParse(json);
    if (!parsed.success) return respond(400, { error: MESSAGES.invalidBody });

    const result = await analyze({ ...session, logger: logger.child({ userId: session.userId }) }, parsed.data);
    return respond(200, result);
  } catch (error) {
    const { status, message } = toErrorResult(error, logger);
    return respond(status, { error: message });
  }
}
