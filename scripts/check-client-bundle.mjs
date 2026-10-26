// Fails if a server-only secret leaks into the browser bundle.
// Run after `npm run build`.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = ".next/static";
if (!existsSync(dir)) {
  console.error("Önce `npm run build` çalıştırın.");
  process.exit(1);
}

const needles = ["SUPABASE_SECRET_KEY", "sb_secret_"];
const secret = process.env.SUPABASE_SECRET_KEY;
if (secret) needles.push(secret);

const hits = [];
const walk = (d) => {
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(js|css|html|json)$/.test(name)) {
      const text = readFileSync(p, "utf8");
      for (const n of needles) if (text.includes(n)) hits.push(`${p}: ${n === secret ? "<secret value>" : n}`);
    }
  }
};
walk(dir);

if (hits.length) {
  console.error("Gizli anahtar istemci paketinde bulundu:\n" + hits.join("\n"));
  process.exit(1);
}
console.log("OK: istemci paketinde gizli anahtar yok.");
