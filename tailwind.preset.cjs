/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        layl: {
          DEFAULT: "#0b1736",
          soft: "#142449",
          deep: "#071128",
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
        // fixed sizes used across the small UI (captions, buttons, meta text)
        10: ["10px", { lineHeight: "15px" }],
        11: ["11px", { lineHeight: "16.5px" }],
        13: ["13px", { lineHeight: "19.5px" }],
        15: ["15px", { lineHeight: "1.9" }],
        17: ["17px", { lineHeight: "1.7" }],
        19: ["19px", { lineHeight: "1.45" }],
        22: ["22px", { lineHeight: "1.3" }],
        27: ["27px", { lineHeight: "1.15" }], // preview-widget prayer name
        29: ["29px", { lineHeight: "1.1" }], // preview-widget prayer time
        // fluid headings: named instead of ad hoc clamp() per heading
        "display-hero": ["clamp(40px, 6vw, 69px)", { lineHeight: "1.1" }],
        "display-section": ["clamp(34px, 4.5vw, 56px)", { lineHeight: "1.15" }],
        "display-section-alt": ["clamp(32px, 4vw, 50px)", { lineHeight: "1.15" }],
        "display-today-hero": ["clamp(48px, 7vw, 76px)", { lineHeight: "1" }],
        "display-stat": ["clamp(25px, 3.7vw, 38px)", { lineHeight: "1.2" }],
        "display-stat-time": ["clamp(27px, 4vw, 40px)", { lineHeight: "1" }],
        "display-ayah": ["clamp(26px, 3.2vw, 36px)", { lineHeight: "1.9" }],
        "display-ayah-translation": ["clamp(19px, 2.4vw, 26px)", { lineHeight: "1.65" }],
      },
      borderRadius: {
        10: "10px",
        11: "11px",
        13: "13px",
        15: "15px",
        20: "20px",
        22: "22px",
        27: "27px",
      },
      width: {
        // shared page-content width, used by every landing-page section
        shell: "min(1160px, calc(100% - 48px))",
        // narrower variant used by the today app's header/main/footer
        "today-shell": "min(1120px, calc(100% - 40px))",
      },
      screens: {
        mobile: "600px",
        tablet: "830px",
      },
      transitionTimingFunction: {
        reveal: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
};
