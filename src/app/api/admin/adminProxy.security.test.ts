import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const HERE = path.dirname(fileURLToPath(import.meta.url)); // src/app/api/admin
const SRC_DIR = path.resolve(HERE, "..", "..", "..");       // src
const IGNORED_DIRS = new Set(["node_modules", ".next", ".open-next", "dist"]);

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (!IGNORED_DIRS.has(entry)) out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// The frontend must never carry the D1 service token — it lives only on the
// Railway backend and the private geo-db-worker. Test files may name the token
// in assertions like this one, so they are excluded from the scan.
const SECRET_NAME = ["D1", "SERVICE", "TOKEN"].join("_");

describe("admin proxy stays a transport-only layer", () => {
  it(`never references ${SECRET_NAME} in non-test frontend source`, () => {
    const offenders = sourceFiles(SRC_DIR)
      .filter((f) => !/\.test\.[tj]sx?$/.test(f))
      .filter((f) => readFileSync(f, "utf8").includes(SECRET_NAME));
    expect(offenders).toEqual([]);
  });

  it("never calls the private geo-db-worker directly from the admin proxy", () => {
    const offenders = sourceFiles(HERE)
      .filter((f) => !/\.test\.[tj]sx?$/.test(f))
      .filter((f) => {
        const src = readFileSync(f, "utf8");
        return /\/v1\/admin\//.test(src) || /geo-staging-db-service/.test(src);
      });
    expect(offenders).toEqual([]);
  });

  it("does not re-implement admin authorization — no is_admin logic in the proxy", () => {
    const offenders = sourceFiles(HERE)
      .filter((f) => !/\.test\.[tj]sx?$/.test(f))
      .filter((f) => /is_admin|isAdmin/.test(readFileSync(f, "utf8")));
    // The only permitted mentions are the comments explaining we do NOT trust it.
    for (const file of offenders) {
      const code = readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => !line.trimStart().startsWith("//"))
        .join("\n");
      expect(/is_admin|isAdmin/.test(code)).toBe(false);
    }
  });
});
