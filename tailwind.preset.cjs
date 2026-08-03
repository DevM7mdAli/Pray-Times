/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        layl: {
          DEFAULT: "#0b1736",
          soft: "#142449",
          deep: "#071128",
          raised: "#10234a",
          lift: "#173267",
        },
        sama: "#4da8da",
        raml: {
          DEFAULT: "#f2d6a2",
          pale: "#fff8e9",
        },
        fajr: {
          DEFAULT: "#e9806e",
          pale: "#ffc5b7",
        },
        nur: "#f5f8ff",
        muted: "#aebbd4",
        // body copy on light (nur) surfaces, darkest to lightest
        ink: {
          DEFAULT: "#425171",
          soft: "#586780",
          faint: "#667592",
        },
        // borders/dividers on light surfaces
        line: {
          DEFAULT: "#d9e0ec",
          strong: "#b9c5dc",
          soft: "#c7d1e3",
          hover: "#a9cde2",
        },
        // light background tints (icon chips, panels)
        surface: {
          panel: "#edf2fa",
          chip: "#e2eff8",
        },
        // verified/success accent (today app alerts, extension badges)
        success: {
          DEFAULT: "#69d4a2",
          pale: "#9be5bf",
        },
      },
      fontFamily: {
        display: ["Alexandria", "Tahoma", "sans-serif"],
        body: ["IBM Plex Sans Arabic", "Tahoma", "Arial", "sans-serif"],
        quran: ["Amiri", "Traditional Arabic", "serif"],
      },
      fontSize: {
        // Fixed UI scale, in px. Captions, labels, buttons, body copy.
        // Unitless line heights work on web and avoid react-native-css treating
        // pixel values as multipliers (for example, 11 * 16.5).
        10: ["10px", { lineHeight: "1.5" }],
        11: ["11px", { lineHeight: "1.5" }],
        13: ["13px", { lineHeight: "1.5" }],
        15: ["15px", { lineHeight: "1.9" }],
        17: ["17px", { lineHeight: "1.7" }],
        19: ["19px", { lineHeight: "1.45" }],
        22: ["22px", { lineHeight: "1.3" }],
        27: ["27px", { lineHeight: "1.15" }],
        29: ["29px", { lineHeight: "1.1" }],
        // Fluid display scale. Four steps, named by position in the scale —
        // never after the component that happens to use them.
        "display-sm": ["clamp(19px, 2.4vw, 26px)", { lineHeight: "1.65" }],
        "display-md": ["clamp(26px, 3.6vw, 38px)", { lineHeight: "1.6" }],
        "display-lg": ["clamp(33px, 4.2vw, 53px)", { lineHeight: "1.15" }],
        "display-xl": ["clamp(43px, 6.4vw, 72px)", { lineHeight: "1.08" }],
      },
      borderRadius: {
        10: "10px",
        11: "11px",
        13: "13px",
        15: "15px",
        20: "20px",
        21: "21px",
        22: "22px",
        26: "26px",
        27: "27px",
        // Teardrop used by the loading/empty-state orb.
        orb: "50% 50% 50% 6px",
      },
      // Off-grid steps this design leans on, expressed in Tailwind's own
      // quarter-step convention (1 unit = 4px), so `gap-1.25` is 5px.
      spacing: {
        0.75: "3px",
        1.25: "5px",
        7.5: "30px",
      },
      boxShadow: {
        // Elevation of a raised dashboard/dialog panel.
        card: "0 24px 80px rgba(0, 0, 0, 0.16)",
        // Lift applied to a button or card on hover.
        lift: "0 13px 24px rgba(11, 23, 54, 0.2)",
      },
      width: {
        // shared page-content width, used by every landing-page section
        shell: "min(1160px, calc(100% - 48px))",
        "shell-today": "min(1120px, calc(100% - 40px))",
      },
      screens: {
        mobile: "600px",
        tablet: "830px",
        nav: "1040px",
      },
      transitionTimingFunction: {
        reveal: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      transitionDuration: {
        reveal: "720ms",
      },
      // Stagger steps for the scroll-reveal sequence.
      transitionDelay: {
        30: "30ms",
        70: "70ms",
        90: "90ms",
        110: "110ms",
        140: "140ms",
        190: "190ms",
      },
      keyframes: {
        float: {
          "50%": { transform: "translateY(-5px) rotate(45deg)" },
        },
        "aura-breathe": {
          "50%": { opacity: "0.72", scale: "1.08" },
        },
        "live-pulse": {
          "70%, 100%": { boxShadow: "0 0 0 10px rgba(233, 128, 110, 0)" },
        },
        "path-flow": {
          to: { backgroundPosition: "220% 0" },
        },
        "compass-breathe": {
          "50%": { filter: "drop-shadow(0 0 12px rgba(77, 168, 218, 0.42))" },
        },
      },
      animation: {
        float: "float 2.6s ease-in-out infinite",
        "aura-breathe": "aura-breathe 6s ease-in-out infinite",
        "live-pulse": "live-pulse 2.4s ease-out infinite",
        "path-flow": "path-flow 6s linear infinite",
        "compass-breathe": "compass-breathe 4.5s ease-in-out infinite",
      },
    },
  },
};
