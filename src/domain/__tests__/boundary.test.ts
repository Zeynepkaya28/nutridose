// The domain layer must stay framework-free.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const DOMAIN_DIR = join(process.cwd(), "src", "domain");
const FORBIDDEN = /from\s+["'](next(\/|["'])|react(-dom)?(\/|["'])|@supabase\/|@\/(lib|app|infra|ui)\/)/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("domain boundary", () => {
  it("does not import Next.js, React, Supabase or app code", () => {
    const files = sourceFiles(DOMAIN_DIR);
    expect(files.length).toBeGreaterThan(10);
    const offenders = files
      .filter((file) => FORBIDDEN.test(readFileSync(file, "utf8")))
      .map((file) => relative(process.cwd(), file));
    expect(offenders).toEqual([]);
  });
});
