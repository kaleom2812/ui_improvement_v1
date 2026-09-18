type ClassValue = string | false | null | undefined | Record<string, boolean>;

/** Joins truthy class-name fragments, clsx-style (no dedupe/merge — none of our usages need it). */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  for (const input of inputs) {
    if (!input) continue;
    if (typeof input === "string") {
      out.push(input);
    } else {
      for (const key in input) {
        if (input[key]) out.push(key);
      }
    }
  }
  return out.join(" ");
}
