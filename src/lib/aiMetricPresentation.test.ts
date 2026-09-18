import { describe, expect, it } from "vitest";
import {
  AWAITING_AI_DATA_EXPLANATION,
  LIMITED_AI_DATA_EXPLANATION,
  aiMetricPresentation,
} from "./aiMetricPresentation";

describe("aiMetricPresentation", () => {
  it("preserves measured positive and zero values", () => {
    expect(aiMetricPresentation(50, 14)).toMatchObject({
      state: "measured_positive",
      label: "50.0%",
      value: 50,
    });
    expect(aiMetricPresentation(0, 14)).toMatchObject({
      state: "measured_zero",
      label: "0.0%",
      value: 0,
    });
  });

  it("uses the existing percentage values for a 14-response measurement", () => {
    expect(aiMetricPresentation((7 / 14) * 100, 14).label).toBe("50.0%");
    expect(aiMetricPresentation((3 / 14) * 100, 14).label).toBe("21.4%");
  });

  it("distinguishes collected but ineligible evidence from no usable responses", () => {
    expect(aiMetricPresentation(null, 14)).toEqual({
      state: "limited_data",
      label: "Limited data",
      explanation: LIMITED_AI_DATA_EXPLANATION,
      value: null,
    });
    expect(aiMetricPresentation(undefined, 0)).toEqual({
      state: "awaiting_data",
      label: "Awaiting data",
      explanation: AWAITING_AI_DATA_EXPLANATION,
      value: null,
    });
  });
});
