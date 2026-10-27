// Content Security Policy with a per-request nonce (Next.js applies it to its own scripts).
export function buildCsp(nonce: string, options: { supabaseUrl?: string; dev: boolean }): string {
  const supabase = options.supabaseUrl ? new URL(options.supabaseUrl) : null;
  const supabaseOrigins = supabase ? [supabase.origin, `${supabase.protocol === "https:" ? "wss" : "ws"}://${supabase.host}`] : [];

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(options.dev ? ["'unsafe-eval'"] : [])],
    // Inline style attributes are used for small layout tweaks.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...supabaseOrigins],
    "media-src": ["'self'", "blob:"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    // Sign in with Apple redirects through Supabase to Apple after a form post.
    "form-action": ["'self'", ...(supabase ? [supabase.origin] : []), "https://appleid.apple.com"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives).map(([name, values]) => `${name} ${values.join(" ")}`);
  if (!options.dev) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}

export function createNonce(): string {
  return btoa(crypto.randomUUID());
}
