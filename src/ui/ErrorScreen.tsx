"use client";

import { useEffect } from "react";

/** Shared error UI for error boundaries: Turkish message, retry, and a report to /api/client-error. */
export function ErrorScreen({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    void fetch("/api/client-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: error.message.slice(0, 500), digest: error.digest, path: location.pathname }),
      keepalive: true,
    }).catch(() => undefined);
  }, [error]);

  return (
    <div style={{ paddingTop: 48 }}>
      <h1 className="page-title">Bir sorun oluştu</h1>
      <p className="t-body t-secondary">Sayfa yüklenemedi. Lütfen tekrar deneyin; sorun sürerse biraz sonra yeniden açın.</p>
      <button type="button" className="btn btn--filled" onClick={reset}>
        Tekrar dene
      </button>
    </div>
  );
}
