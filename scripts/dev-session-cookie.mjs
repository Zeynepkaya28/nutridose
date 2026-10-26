// Local development helper: prints nothing secret; writes a Cookie header for the local demo user
// to the given JSON file (Lighthouse --extra-headers format). Refuses non-local Supabase.
import { writeFileSync, readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("local Supabase only");

const admin = createClient(url, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const link = await admin.auth.admin.generateLink({ type: "magiclink", email: "demo@nutridose.test" });
if (link.error) throw link.error;

const jar = new Map();
const supabase = createServerClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)) },
});
const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: link.data.properties.hashed_token });
if (error) throw error;
writeFileSync(process.argv[2], JSON.stringify({ Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") }));
console.log("cookie written");
