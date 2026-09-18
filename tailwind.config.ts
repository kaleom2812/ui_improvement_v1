import type { Config } from "tailwindcss";

/**
 * Design tokens for the GEO Tool UI.
 *
 * Visual language migrated from the GEO-UI-Version-4 reference. The palette is
 * driven by CSS custom properties (see src/app/globals.css) so a single `.dark`
 * class on <html> re-themes the whole app. Each `--c-*` token holds
 * space-separated RGB channels, wrapped here so Tailwind's `/<alpha>` opacity
 * modifiers (e.g. `bg-ink/40`, `border-brand/30`) keep working.
 *
 * Font families resolve to the CSS variables injected by `next/font` in
 * `src/app/layout.tsx`. The variable names are kept as `--font-geist-*` for
 * continuity with existing consumers; the faces are now Inter / IBM Plex Mono.
 */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,js,jsx,md,mdx}"],
  theme: {
    borderRadius: {
      none: "0",
      sm: "8px",
      DEFAULT: "12px",
      md: "10px",
      lg: "16px",
      xl: "22px",
      "2xl": "26px",
      "3xl": "32px",
      full: "9999px",
    },
    extend: {
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        subtle: token("subtle"),
        ink: token("ink"),
        "ink-2": token("ink-2"),
        "ink-3": token("ink-3"),
        line: token("line"),
        "line-2": token("line-2"),
        brand: {
          DEFAULT: token("brand"),
          dark: token("brand-dark"),
          soft: token("brand-soft"),
          ink: token("brand-ink"),
          dim: token("brand-dim"),
        },
        pos: token("pos"),
        "pos-soft": token("pos-soft"),
        warn: token("warn"),
        "warn-soft": token("warn-soft"),
        neg: token("neg"),
        "neg-soft": token("neg-soft"),
        // Legacy "Signal" aliases — kept so existing `bg-signal` / `text-signal`
        // usages keep resolving; they now point at the brand (indigo) tokens.
        signal: {
          DEFAULT: token("brand"),
          bright: token("brand-dark"),
          dim: token("brand-dim"),
        },
        wire: "#63B3FF",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", '"Inter"', "system-ui", "-apple-system", "sans-serif"],
        display: ["var(--font-geist-sans)", '"Inter"', "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", '"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        // Editorial serif used sparingly for italic emphasis inside headings.
        serif: ["var(--font-serif)", '"Fraunces"', "ui-serif", "Georgia", "serif"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
      },
      maxWidth: {
        site: "1120px",
        flow: "640px",
        prose2: "66ch",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        pop: "var(--shadow-pop)",
        cta: "0 8px 24px -8px rgb(var(--c-brand) / 0.5)",
        focus: "0 0 0 4px rgb(var(--c-brand) / 0.22)",
      },
      keyframes: {
        "grid-in": {
          "0%": { opacity: "0", transform: "scale(1.04)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        spin360: {
          to: { transform: "rotate(360deg)" },
        },
        "boot-sweep": {
          "0%": { transform: "translateX(-20vw)" },
          "100%": { transform: "translateX(120vw)" },
        },
        // Ambient hero cards — a slow, gentle drift. Duration/delay are
        // overridden per-card via inline style (see AmbientMetricCards).
        "float-slow": {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -14px, 0)" },
        },
      },
      animation: {
        "grid-in": "grid-in 1.2s cubic-bezier(0.16,1,0.3,1) both",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
        spin360: "spin360 1s linear infinite",
        "float-slow": "float-slow 9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
