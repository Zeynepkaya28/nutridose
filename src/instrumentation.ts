// Server error tracking: every unhandled error in a route, page or server action is logged as one
// structured JSON line (visible in Vercel runtime logs and any log drain). No request body or health data.
import type { Instrumentation } from "next";

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const err = error as Error & { digest?: string };
  console.error(
    JSON.stringify({
      level: "error",
      message: "unhandled server error",
      time: new Date().toISOString(),
      error: { name: err.name, message: err.message, digest: err.digest },
      method: request.method,
      path: request.path.split("?")[0],
      routerKind: context.routerKind,
      routePath: context.routePath,
      routeType: context.routeType,
    }),
  );
};
