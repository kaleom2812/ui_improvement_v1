import type { ComponentType, SVGProps } from "react";

/**
 * ILLUSTRATIVE SAMPLE — marketing pages only.
 *
 * Abstract, non-trademarked glyphs standing in for the AI engines GEO Tool
 * tracks. Each glyph is an original geometric mark (spark / star / orb /
 * compass / loop) paired with that engine's approximate brand accent colour —
 * not a reproduction of any company's actual logo artwork.
 */

type EngineIcon = ComponentType<SVGProps<SVGSVGElement>>;

const SparkIcon: EngineIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 2c.6 3.6 1.9 5.9 4.6 7.4C19.3 10.9 21 12 22 12c-1 0-2.7 1.1-5.4 2.6-2.7 1.5-4 3.8-4.6 7.4-.6-3.6-1.9-5.9-4.6-7.4C4.7 13.1 3 12 2 12c1 0 2.7-1.1 5.4-2.6C10.1 7.9 11.4 5.6 12 2Z" />
  </svg>
);

const StarIcon: EngineIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 3c.9 4.3 2.7 6.1 7 7-4.3.9-6.1 2.7-7 7-.9-4.3-2.7-6.1-7-7 4.3-.9 6.1-2.7 7-7Z" />
  </svg>
);

const OrbIcon: EngineIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </svg>
);

const CompassIcon: EngineIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" {...props}>
    <path d="M12 3 15 12 12 21 9 12Z" />
  </svg>
);

const LoopIcon: EngineIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <circle cx="8.5" cy="12" r="4.5" />
    <circle cx="15.5" cy="12" r="4.5" />
  </svg>
);

export interface AiEngine {
  id: string;
  name: string;
  color: string;
  icon: EngineIcon;
}

export const aiEngines: AiEngine[] = [
  { id: "chatgpt", name: "ChatGPT", color: "#10A37F", icon: SparkIcon },
  { id: "gemini", name: "Gemini", color: "#4285F4", icon: StarIcon },
  { id: "claude", name: "Claude", color: "#D97757", icon: OrbIcon },
  { id: "perplexity", name: "Perplexity", color: "#20808D", icon: CompassIcon },
  { id: "copilot", name: "Copilot", color: "#8B5CF6", icon: LoopIcon },
];
