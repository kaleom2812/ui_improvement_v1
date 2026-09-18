// Ported from GEO-UI-Version-5/src/lib/format.js (typed).

export const pct = (n: number, digits = 0) =>
  `${(n * 100).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}%`;

export const num = (n: number) => n.toLocaleString("en-US");

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);

export const money = (n: number) =>
  n === 0
    ? "$0"
    : `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export type Tone = "pos" | "warn" | "neg" | "brand" | "neutral";

/** Semantic tone -> tailwind class fragments used across the app. */
export const tone: Record<Tone, { text: string; bg: string; border: string; dot: string; ring: string }> = {
  pos: { text: "text-pos", bg: "bg-pos-soft", border: "border-pos/30", dot: "bg-pos", ring: "text-pos" },
  warn: { text: "text-warn", bg: "bg-warn-soft", border: "border-warn/30", dot: "bg-warn", ring: "text-warn" },
  neg: { text: "text-neg", bg: "bg-neg-soft", border: "border-neg/30", dot: "bg-neg", ring: "text-neg" },
  brand: { text: "text-brand-dark", bg: "bg-brand-soft", border: "border-brand/30", dot: "bg-brand", ring: "text-brand" },
  neutral: { text: "text-ink-2", bg: "bg-subtle", border: "border-line-2", dot: "bg-ink-3", ring: "text-ink-3" },
};

export const toneOfScore = (n: number): Tone => (n >= 70 ? "pos" : n >= 50 ? "warn" : "neg");

export const gradeFor = (n: number): string => {
  if (n >= 90) return "A";
  if (n >= 80) return "A-";
  if (n >= 72) return "B";
  if (n >= 65) return "B-";
  if (n >= 58) return "C+";
  if (n >= 50) return "C";
  if (n >= 42) return "D+";
  if (n >= 34) return "D";
  return "F";
};

export const tierFor = (n: number): string => {
  if (n >= 75) return "Strong visibility";
  if (n >= 55) return "Emerging visibility";
  if (n >= 35) return "Low visibility";
  return "Very low visibility";
};

/** Backend provider keys -> display names used across the Signal UI. */
export function providerLabel(key: string): string {
  const k = (key || "").toLowerCase();
  const map: Record<string, string> = {
    openai: "ChatGPT",
    chatgpt: "ChatGPT",
    gemini: "Gemini",
    google: "Gemini",
    claude: "Claude",
    anthropic: "Claude",
    perplexity: "Perplexity",
    copilot: "Copilot",
    mock: "Mock engine",
  };
  return map[k] || (key ? key[0].toUpperCase() + key.slice(1) : "Unknown");
}
