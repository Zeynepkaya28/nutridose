// DELETE /api/account — deletes the caller's account and all data (used by the native iOS client;
// the web app uses the same service through a server action). Requires a session (cookie or Bearer).
import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/supabase/request";
import { deleteAccount } from "@/server/account";
import { MESSAGES } from "@/server/errors";
import { createLogger } from "@/server/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const logger = createLogger({ route: "DELETE /api/account", requestId: crypto.randomUUID() });
  const session = await getRequestSession(request);
  if (!session) return NextResponse.json({ error: MESSAGES.unauthenticated }, { status: 401 });
  try {
    await deleteAccount(session.supabase, session.userId);
    logger.info("account deleted", { userId: session.userId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error("account deletion failed", { error });
    return NextResponse.json({ error: "Hesap silinemedi. Lütfen tekrar deneyin." }, { status: 500 });
  }
}
