/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        // Used by the public landing page hero/section headings. Existing
        // dashboard pages don't reference `font-serif`, so this is additive.
        serif: ["'Playfair Display'", "Georgia", "Cambria", "serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "system-ui", "sans-serif"]
      },
      colors: {
        gaas: {
          bg: "#F0FDF4",
          surface: "#FFFFFF",
          card: "#FFFFFF",
          border: "#E5E7EB",
          "border-light": "#D1D5DB",
          accent: "#16A34A",
          "accent-light": "#22C55E",
          "accent-dark": "#15803D",
          "accent-glow": "rgba(22,163,74,0.10)",
          danger: "#EF4444",
          warning: "#F59E0B",
          healthy: "#16A34A",
          moderate: "#EAB308",
          unhealthy: "#EF4444",
          muted: "#6B7280",
          text: "#374151",
          heading: "#111827",
          navbar: "#FFFFFF"
        },
        /*
         * Shadcn-style tokens for the public landing only (`webbsite-main` smart‑greenhouse).
         * Confirmed absent from dashboard pages (`text-primary`, `bg-card`, etc.).
         */
        border: "hsl(145 15% 90%)",
        input: "hsl(145 15% 90%)",
        ring: "hsl(145 48% 20%)",
        background: "hsl(0 0% 100%)",
        foreground: "hsl(145 50% 10%)",
        primary: {
          DEFAULT: "hsl(145 48% 20%)",
          foreground: "hsl(0 0% 100%)"
        },
        secondary: {
          DEFAULT: "hsl(145 20% 90%)",
          foreground: "hsl(145 50% 10%)"
        },
        muted: {
          DEFAULT: "hsl(145 10% 95%)",
          foreground: "hsl(145 20% 40%)"
        },
        accent: {
          DEFAULT: "hsl(46 65% 52%)",
          foreground: "hsl(0 0% 100%)"
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)",
          foreground: "hsl(0 0% 100%)"
        },
        card: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(145 50% 10%)"
        },
        popover: {
          DEFAULT: "hsl(0 0% 100%)",
          foreground: "hsl(145 50% 10%)"
        }
      },
      boxShadow: {
        glow: "0 0 15px rgba(22,163,74,0.10)",
        card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
        navbar: "0 1px 3px rgba(0,0,0,0.06)"
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.3s ease-out"
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};
