import { geoRating, type GeoRating } from "./geoRating";

export type OverallGeoScoreSource =
  | "geo_readiness"
  | "ai_visibility_fallback"
  | "technical_fallback"
  | "limited_data_fallback";

export interface TechnicalScoreCandidate {
  key: string;
  score: number | null | undefined;
  weight?: number | null;
}

export interface OverallGeoScoreInput {
  geoReadiness?: number | null;
  aiVisibilityMeasured?: boolean;
  mentionRate?: number | null;
  shareOfVoice?: number | null;
  recommendationRate?: number | null;
  technicalComponents?: TechnicalScoreCandidate[];
}

export interface OverallGeoScoreResult {
  score: number | null;
  rating: GeoRating;
  scoreSource: OverallGeoScoreSource;
  dataConfidence: "Standard" | "Limited";
}

const AI_WEIGHTS = {
  mentionRate: 0.5,
  shareOfVoice: 0.3,
  recommendationRate: 0.2,
} as const;

const TECHNICAL_COMPONENT = /(?:^|_)(?:technical|website|readiness|crawl|schema|page|content)(?:_|$)/i;
const NON_TECHNICAL_COMPONENT = /mention|voice|recommend|competitive|sentiment|citation/i;

function validScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;
}

function clampAndRound(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function result(score: number, scoreSource: OverallGeoScoreSource): OverallGeoScoreResult {
  const normalized = clampAndRound(score);
  return {
    score: normalized,
    rating: geoRating(normalized) ?? "LOW",
    scoreSource,
    dataConfidence: scoreSource === "limited_data_fallback" ? "Limited" : "Standard",
  };
}

/**
 * Selects the customer headline score without mutating any underlying audit
 * measurement. Missing values are omitted rather than converted to zero.
 */
export function overallGeoScore(input: OverallGeoScoreInput): OverallGeoScoreResult {
  if (validScore(input.geoReadiness)) {
    return result(input.geoReadiness, "geo_readiness");
  }

  if (input.aiVisibilityMeasured) {
    const measured = [
      [input.mentionRate, AI_WEIGHTS.mentionRate],
      [input.shareOfVoice, AI_WEIGHTS.shareOfVoice],
      [input.recommendationRate, AI_WEIGHTS.recommendationRate],
    ] as const;
    const available = measured.filter(([value]) => validScore(value));
    const availableWeight = available.reduce((sum, [, weight]) => sum + weight, 0);
    if (availableWeight > 0) {
      const weighted = available.reduce(
        (sum, [value, weight]) => sum + (value as number) * weight,
        0,
      );
      return result(weighted / availableWeight, "ai_visibility_fallback");
    }
  }

  const technical = (input.technicalComponents ?? []).filter(
    ({ key, score }) =>
      TECHNICAL_COMPONENT.test(key) &&
      !NON_TECHNICAL_COMPONENT.test(key) &&
      validScore(score),
  );
  if (technical.length > 0) {
    const weighted = technical.map((component) => ({
      score: component.score as number,
      weight:
        typeof component.weight === "number" &&
        Number.isFinite(component.weight) &&
        component.weight > 0
          ? component.weight
          : 1,
    }));
    const availableWeight = weighted.reduce((sum, component) => sum + component.weight, 0);
    return result(
      weighted.reduce((sum, component) => sum + component.score * component.weight, 0) /
        availableWeight,
      "technical_fallback",
    );
  }

  return {
    score: null,
    rating: "LOW",
    scoreSource: "limited_data_fallback",
    dataConfidence: "Limited",
  };
}

export function overallGeoScoreBasis(source: OverallGeoScoreSource): string {
  return {
    geo_readiness: "Based on your website's GEO readiness.",
    ai_visibility_fallback: "Based on measured AI visibility performance.",
    technical_fallback: "Based on available website optimization signals.",
    limited_data_fallback:
      "Based on limited available data. Additional measurement will improve accuracy.",
  }[source];
}

export function overallGeoRatingCopy(
  company: string,
  value: Pick<OverallGeoScoreResult, "rating" | "scoreSource">,
): string {
  const label = `${value.rating[0]}${value.rating.slice(1).toLowerCase()}`;
  const article = /^[aeiou]/i.test(label) ? "an" : "a";
  return `${company} has ${article} ${label} GEO rating. ${overallGeoScoreBasis(value.scoreSource)}`;
}
