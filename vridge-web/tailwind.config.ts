import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "./widgets/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./entities/**/*.{ts,tsx}",
    "./shared/**/*.{ts,tsx}",
    "./processes/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Legacy Design System Colors
      colors: {
        // Primary Blues (기존 시스템)
        primary: {
          DEFAULT: "#0031ff",
          dark: "#0059db",
          darker: "#0058da", 
          darkest: "#012fff",
          light: "#006ae8",
          lighter: "#0632f5",
          50: "#fcfcfc",
          100: "#f4f7fe",
          200: "#ecefff",
        },
        // Semantic Colors
        error: "#d93a3a",
        danger: "#dc3545",
        success: {
          DEFAULT: "#28a745",
          light: "#3dcdbf",
        },
        warning: "#ffc107",
        info: "#17a2b8",
        // Neutral Colors
        dark: {
          DEFAULT: "#25282f",
          light: "#2b2f38",
          darker: "#1a1a1a",
        },
        gray: {
          DEFAULT: "#919191",
          dark: "#516e8b",
          mid: "#c1c1c1",
          light: "#e4e4e4",
          lighter: "#e6e6e6",
          lightest: "#eeeeee",
          bg: "#f8f8f8",
          white: "#fcfcfc",
        },
        background: {
          DEFAULT: "#ffffff",
          light: "#fcfcfc",
          gray: "#f8f8f8",
          gradient: "#142868",
        },
        border: {
          DEFAULT: "#eeeeee",
          light: "#e4e4e4",
          dark: "#c1c1c1",
        },
        text: {
          DEFAULT: "#25282f",
          light: "#516e8b",
          lighter: "#919191",
          placeholder: "#919191",
        },
      },
      // Typography
      fontFamily: {
        suit: ["suit", "sans-serif"],
        "suit-light": ["suit-pl", "sans-serif"],
        "suit-regular": ["suit-pr", "sans-serif"],
        "suit-semibold": ["suit-psb", "sans-serif"],
        "suit-bold": ["suit-pb", "sans-serif"],
      },
      fontSize: {
        // Headings
        "h1": ["60px", "1.2"],
        "h2": ["40px", "1.3"],
        "h3": ["36px", "1.4"],
        "h4": ["26px", "1.4"],
        "h5": ["24px", "1.5"],
        // Body
        "body-xl": ["22px", "1.6"],
        "body-lg": ["21px", "1.6"],
        "body-md": ["18px", "1.5"],
        "body": ["16px", "1.5"],
        "body-sm": ["15px", "1.5"],
        "caption": ["14px", "1.5"],
        "small": ["13px", "1.5"],
      },
      // Spacing (mt10~mt200)
      spacing: {
        "54": "54px", // 기본 input/button height
        "15": "15px", // padding
        // mt 클래스들
        ...Array.from({ length: 20 }, (_, i) => ({
          [`${(i + 1) * 10}`]: `${(i + 1) * 10}px`
        })).reduce((acc, obj) => ({ ...acc, ...obj }), {}),
      },
      // Border Radius
      borderRadius: {
        DEFAULT: "15px", // 기본 radius
        lg: "20px", // card radius
        xl: "30px", // large radius
      },
      // Box Shadow (legacy)
      boxShadow: {
        DEFAULT: "5px 5px 10px #e8e8e8",
        sm: "0 1px 2px rgba(0, 0, 0, 0.06)",
        md: "0 4px 6px rgba(0, 0, 0, 0.1)",
        lg: "0 10px 15px rgba(0, 0, 0, 0.1)",
        xl: "0 20px 25px rgba(0, 0, 0, 0.1)",
        "2xl": "0 25px 50px rgba(0, 0, 0, 0.2)",
        focus: "5px 5px 10px #e8e8e8",
      },
      // Container Sizes
      maxWidth: {
        "hero": "1300px",
        "container": "1200px",
        "medium": "1000px",
        "narrow": "900px",
        "form": "400px",
      },
      // Heights
      height: {
        "input": "54px",
        "button": "54px",
      },
      // Animations (legacy transitions)
      transitionProperty: {
        DEFAULT: "all",
      },
      transitionDuration: {
        DEFAULT: "300ms",
      },
      transitionTimingFunction: {
        DEFAULT: "ease-in-out",
      },
      // Breakpoints (legacy)
      screens: {
        mobile: { max: "1024px" },
        desktop: { min: "1024px" },
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;