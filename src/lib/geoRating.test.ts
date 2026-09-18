import { describe, expect, it } from "vitest";

import {
  formatGeoScore,
  geoRating,
  geoRatingPresentation,
  isMeasuredGeoRating,
} from "./geoRating";

describe("GEO rating classification", () => {
  it.each([
    [0, "LOW"],
    [24, "LOW"],
    [25, "MODERATE"],
    [49, "MODERATE"],
    [50, "GOOD"],
    [74, "GOOD"],
    [75, "EXCELLENT"],
    [100, "EXCELLENT"],
  ] as const)("classifies %s as %s", (score, expected) => {
    expect(geoRating(score)).toBe(expected);
    expect(isMeasuredGeoRating(geoRatingPresentation(score))).toBe(true);
  });

  it("never turns unavailable evidence into LOW", () => {
    expect(geoRating(null)).toBeNull();
    expect(geoRating(undefined)).toBeNull();
    expect(geoRating(Number.NaN)).toBeNull();
    expect(geoRatingPresentation(null)).toBe("NOT MEASURED");
    expect(geoRatingPresentation(undefined, "not_measured")).toBe("NOT MEASURED");
    expect(geoRatingPresentation(8, "not_measured")).toBe("NOT MEASURED");
  });

  it("keeps incomplete audits separate even if a stale numeric score exists", () => {
    expect(geoRatingPresentation(8, "incomplete")).toBe("INCOMPLETE");
    expect(geoRatingPresentation(80, "complete", false)).toBe("INCOMPLETE");
    expect(isMeasuredGeoRating(geoRatingPresentation(8, "incomplete"))).toBe(false);
  });

  it("formats the numeric score only as secondary information", () => {
    expect(formatGeoScore(8)).toBe("8/100");
    expect(formatGeoScore(51.74)).toBe("51.7/100");
    expect(formatGeoScore(null)).toBe("Not available");
  });
});
