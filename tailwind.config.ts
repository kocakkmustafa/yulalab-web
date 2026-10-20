import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    // Preserve the existing pixel breakpoints independently of root font size.
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
    container: {
      center: true,
      padding: { DEFAULT: "1.5rem", lg: "2.5rem" },
      screens: { "2xl": "80rem" },
    },
    extend: {
      colors: {
        // Status colors retain their dark appearance and gain readable light counterparts.
        amber: { 300: "var(--yula-warning)", 400: "var(--yula-warning-strong)" },
        emerald: { 300: "var(--yula-success)", 400: "var(--yula-success-strong)" },
        ink: {
          900: "rgb(var(--yula-ink-900) / <alpha-value>)",
          850: "rgb(var(--yula-ink-850) / <alpha-value>)",
          800: "rgb(var(--yula-ink-800) / <alpha-value>)",
          700: "rgb(var(--yula-ink-700) / <alpha-value>)",
          600: "rgb(var(--yula-ink-600) / <alpha-value>)",
          500: "rgb(var(--yula-ink-500) / <alpha-value>)",
          // Small muted text must remain readable on dark page and card surfaces.
          400: "rgb(var(--yula-ink-400) / <alpha-value>)",
          300: "rgb(var(--yula-ink-300) / <alpha-value>)",
          200: "rgb(var(--yula-ink-200) / <alpha-value>)",
          100: "rgb(var(--yula-ink-100) / <alpha-value>)",
          50: "rgb(var(--yula-ink-50) / <alpha-value>)",
        },
        // Named surface/hairline scale — the alternative to hand-rolled
        // white/[0.04]-style opacity values scattered across ~80 call sites.
        // Each name is a decision made once instead of re-guessed per card.
        surface: {
          DEFAULT: "var(--yula-surface)", // resting card/tile fill
          raised: "var(--yula-surface-raised)", // hover fill
          inset: "var(--yula-surface-inset)", // recessed panel (info boxes)
        },
        hairline: {
          DEFAULT: "var(--yula-hairline)", // default 1px border
          strong: "var(--yula-hairline-strong)", // hover / active border
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Manrope", "Inter", "sans-serif"],
        grotesk: ["var(--font-grotesk)", "Space Grotesk", "Inter", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        pageIn: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        driftA: {
          "0%, 100%": { transform: "translate3d(-10%, -8%, 0) scale(1)" },
          "50%": { transform: "translate3d(8%, 6%, 0) scale(1.1)" },
        },
        driftB: {
          "0%, 100%": { transform: "translate3d(8%, 4%, 0) scale(1.05)" },
          "50%": { transform: "translate3d(-6%, -10%, 0) scale(1)" },
        },
        driftC: {
          "0%, 100%": { transform: "translate3d(-4%, 6%, 0) scale(1)" },
          "50%": { transform: "translate3d(10%, -4%, 0) scale(1.15)" },
        },
      },
      animation: {
        "page-enter": "pageIn 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "drift-a": "driftA 38s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        "drift-b": "driftB 44s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        "drift-c": "driftC 32s cubic-bezier(0.16, 1, 0.3, 1) infinite",
      },
    },
  },
  plugins: [typography],
};

export default config;
