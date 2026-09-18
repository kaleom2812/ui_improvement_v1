export type AiMetricDisplayState =
  | "measured_positive"
  | "measured_zero"
  | "limited_data"
  | "awaiting_data";

export interface AiMetricPresentation {
  state: AiMetricDisplayState;
  label: string;
  explanation: string;
  value: number | null;
}

export const AI_MENTION_RATE_EXPLANATION =
  "How often your brand appeared in the AI responses analyzed.";
export const AI_RECOMMENDATION_RATE_EXPLANATION =
  "How often your brand was actively recommended in the AI responses analyzed.";
export const LIMITED_AI_DATA_EXPLANATION =
  "AI responses were collected, but available evidence was insufficient for a reliable measurement.";
export const AWAITING_AI_DATA_EXPLANATION =
  "No usable AI responses were available for this measurement.";

export function aiMetricPresentation(
  value: number | null | undefined,
  successfulResponses: number,
): AiMetricPresentation {
  if (typeof value === "number" && Number.isFinite(value)) {
    return {
      state: value === 0 ? "measured_zero" : "measured_positive",
      label: `${value.toFixed(1)}%`,
      explanation: "",
      value,
    };
  }

  const limited = successfulResponses > 0;
  return {
    state: limited ? "limited_data" : "awaiting_data",
    label: limited ? "Limited data" : "Awaiting data",
    explanation: limited
      ? LIMITED_AI_DATA_EXPLANATION
      : AWAITING_AI_DATA_EXPLANATION,
    value: null,
  };
}
