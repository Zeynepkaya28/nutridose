// Only same-site relative paths are allowed as post-login destinations (no open redirects).
export function safeNext(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/giris") || value.startsWith("/auth/")) return fallback;
  return value;
}

/** Paths that work without a session. */
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/giris" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/dev/") ||
    pathname === "/kvkk" ||
    pathname === "/manifest.webmanifest" ||
    pathname.startsWith("/pwa-icon/") ||
    pathname === "/icon" ||
    pathname === "/apple-icon"
  );
}
