"use client";

import "@/ui/tokens.css";
import "@/ui/components.css";
import { ErrorScreen } from "@/ui/ErrorScreen";

export default function GlobalError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body>
        <main className="page">
          <ErrorScreen {...props} />
        </main>
      </body>
    </html>
  );
}
