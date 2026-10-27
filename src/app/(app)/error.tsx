"use client";

import { ErrorScreen } from "@/ui/ErrorScreen";

export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen {...props} />;
}
