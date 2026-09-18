import { describe, expect, it } from "vitest";
import { overallGeoScore, overallGeoScoreBasis, overallGeoRatingCopy } from "./overallGeoScore";

describe("overallGeoScore", () => {
  it("uses GEO readiness as the primary customer score", () => {
    expect(overallGeoScore({ geoReadiness: 53, aiVisibilityMeasured: true, mentionRate: 100 })).toEqual({
      score: 53,
      rating: "GOOD",
      scoreSource: "geo_readiness",
      dataConfidence: "Standard",
    });
  });

  it("uses the approved 50/30/20 AI fallback and rounds the headline score", () => {
    expect(overallGeoScore({
      geoReadiness: null,
      aiVisibilityMeasured: true,
      mentionRate: 80,
      shareOfVoice: 25,
      recommendationRate: 0,
    })).toMatchObject({ score: 48, rating: "MODERATE", scoreSource: "ai_visibility_fallback" });
  });

  it("proportionally reweights partial measured AI metrics without zero filling", () => {
    expect(overallGeoScore({
      aiVisibilityMeasured: true,
      mentionRate: 80,
      shareOfVoice: null,
      recommendationRate: 20,
    })).toMatchObject({ score: 63, scoreSource: "ai_visibility_fallback" });
  });

  it("preserves a genuine measured AI zero", () => {
    expect(overallGeoScore({
      aiVisibilityMeasured: true,
      mentionRate: 0,
      shareOfVoice: 0,
      recommendationRate: 0,
    })).toMatchObject({ score: 0, rating: "LOW", scoreSource: "ai_visibility_fallback" });
  });

  it("uses only valid technical/page scores for the technical fallback", () => {
    expect(overallGeoScore({
      technicalComponents: [
        { key: "page_content_quality", score: 80, weight: 0.75 },
        { key: "schema_coverage", score: 20, weight: 0.25 },
        { key: "mention_rate", score: 100, weight: 10 },
        { key: "technical_invalid", score: null, weight: 10 },
      ],
    })).toMatchObject({ score: 65, rating: "GOOD", scoreSource: "technical_fallback" });
  });

  it("returns a transparent LOW limited-data fallback when no numeric evidence exists", () => {
    const value = overallGeoScore({});
    expect(value).toEqual({
      score: null,
      rating: "LOW",
      scoreSource: "limited_data_fallback",
      dataConfidence: "Limited",
    });
    expect(overallGeoScoreBasis(value.scoreSource)).toMatch(/limited available data/i);
    expect(overallGeoRatingCopy("Example", value)).toBe(
      "Example has a Low GEO rating. Based on limited available data. Additional measurement will improve accuracy.",
    );
  });
});
