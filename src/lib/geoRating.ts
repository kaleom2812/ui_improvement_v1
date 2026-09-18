export type GeoRating = "LOW" | "MODERATE" | "GOOD" | "EXCELLENT";
export type GeoRatingPresentation = GeoRating | "NOT MEASURED" | "INCOMPLETE";

const INCOMPLETE_STATES = new Set(["incomplete", "failed"]);

export function geoRating(score?: number | null): GeoRating | null {
  if (
    typeof score !== "number" ||
    !Number.isFinite(score) ||
    score < 0 ||
    score > 100
  ) {
    return null;
  }

  if (score < 25) return "LOW";
  if (score < 50) return "MODERATE";
  if (score < 75) return "GOOD";
  return "EXCELLENT";
}

export function geoRatingPresentation(
  score?: number | null,
  scoreStatus?: string | null,
  measurementValid = true,
): GeoRatingPresentation {
  const normalizedStatus = (scoreStatus || "").trim().toLowerCase();
  if (!measurementValid || INCOMPLETE_STATES.has(normalizedStatus)) {
    return "INCOMPLETE";
  }
  if (normalizedStatus === "not_measured" || normalizedStatus === "unavailable") {
    return "NOT MEASURED";
  }
  return geoRating(score) ?? "NOT MEASURED";
}

export function isMeasuredGeoRating(
  value: GeoRatingPresentation,
): value is GeoRating {
  return value === "LOW" || value === "MODERATE" || value === "GOOD" || value === "EXCELLENT";
}

export function formatGeoScore(score?: number | null): string {
  return typeof score === "number" && Number.isFinite(score)
    ? `${Number(score.toFixed(1))}/100`
    : "Not available";
}
