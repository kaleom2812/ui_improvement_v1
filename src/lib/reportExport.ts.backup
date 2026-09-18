import type { ReportSummary } from "@/lib/types";

export const PDF_PRIMARY_EVIDENCE_LIMIT = 1_800;
export const PDF_FOLLOW_UP_EVIDENCE_LIMIT = 350;
export const PDF_FOLLOW_UP_DISPLAY_LIMIT = 2;

const unicodePunctuation: Record<string, string> = {
  "\u2018": "'",
  "\u2019": "'",
  "\u201C": "\"",
  "\u201D": "\"",
  "\u2013": "-",
  "\u2014": "-",
  "\u2026": "...",
  "\u2022": "-",
  "\u00A0": " ",
  "\u2192": "->",
};

export function sanitizePdfText(input: unknown, fallback = "Unavailable"): string {
  if (input === null || input === undefined) return fallback;
  const text = String(input)
    .replace(/\\n/g, "\n")
    .replace(/[\u2018\u2019\u201C\u201D\u2013\u2014\u2026\u2022\u00A0\u2192]/g, character => unicodePunctuation[character] ?? " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/[\uD800-\uDFFF]/g, "?")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text || fallback;
}

export function excerptPdfText(input: unknown, limit: number, fallback = "Unavailable"): { text: string; truncated: boolean } {
  const text = sanitizePdfText(input, fallback);
  if (text.length <= limit) return { text, truncated: false };

  const candidate = text.slice(0, limit);
  const sentenceBoundary = Math.max(candidate.lastIndexOf(". "), candidate.lastIndexOf("\n"));
  const cutoff = sentenceBoundary >= Math.floor(limit * 0.65) ? sentenceBoundary + 1 : limit;
  return { text: `${candidate.slice(0, cutoff).trimEnd()}...`, truncated: true };
}

export function extractPrimaryAiEvidence(response: unknown): string {
  const text = sanitizePdfText(response, "No response text returned.");
  const aiMarker = "**AI:**";
  const firstAi = text.indexOf(aiMarker);
  if (firstAi < 0) return text;

  const answerStart = firstAi + aiMarker.length;
  const nextUser = text.indexOf("**User:**", answerStart);
  return text.slice(answerStart, nextUser >= 0 ? nextUser : undefined).trim() || text;
}

export function countTranscriptFollowUps(response: unknown): number {
  const text = sanitizePdfText(response, "");
  const userTurns = text.match(/\*\*User:\*\*/g)?.length ?? 0;
  return Math.max(0, userTurns - 1);
}

export function formatPdfUrl(input: unknown): string {
  const url = sanitizePdfText(input, "URL unavailable");
  return url.replace(/(.{72})(?=.)/g, "$1\n");
}

export function pdfExportDiagnostic(error: unknown, section = "document-render") {
  return {
    message: "PDF export failed",
    errorType: error instanceof Error ? error.name : typeof error,
    section,
  };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "geo-report";
}

export function reportDateStamp(value?: string): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function buildReportFilename(report: ReportSummary): string {
  const identity = report.header.organization || report.header.domain || "geo";
  return `${slugify(identity)}-geo-audit-${reportDateStamp(report.header.audit_date)}.pdf`;
}

export function buildJsonFilename(report: ReportSummary): string {
  return buildReportFilename(report).replace(/\.pdf$/, ".json");
}

export function serializeReport(report: ReportSummary): string {
  return JSON.stringify(report, null, 2);
}
