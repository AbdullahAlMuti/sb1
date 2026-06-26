import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./apps/**/*.{ts,tsx}",
    "./packages/**/*.{ts,tsx}",
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
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
        // Platform brand colors
        amazon: "hsl(var(--amazon-orange))",
        ebay: "hsl(var(--ebay-blue))",
        whatsapp: {
          DEFAULT: "hsl(var(--whatsapp))",
          foreground: "hsl(var(--whatsapp-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        info: "hsl(var(--info))",
        // Premium/paywall tokens
        premium: {
          DEFAULT: "hsl(var(--premium))",
          foreground: "hsl(var(--premium-foreground))",
          surface: "hsl(var(--premium-surface))",
          "surface-foreground": "hsl(var(--premium-surface-foreground))",
          border: "hsl(var(--premium-border))",
          ring: "hsl(var(--premium-ring))",
        },
        // Text hierarchy
        "text-primary": "hsl(var(--text-primary))",
        "text-secondary": "hsl(var(--text-secondary))",
        "text-muted": "hsl(var(--text-muted))",
        // Warm/Landing page tokens
        "warm-glow": "hsl(var(--warm-glow))",
        "warm-accent": "hsl(var(--warm-accent))",
        "warm-text": "hsl(var(--warm-text))",
        "warm-text-muted": "hsl(var(--warm-text-muted))",
        "warm-border": "hsl(var(--warm-border))",
        "warm-cta": "hsl(var(--warm-cta))",
        "warm-cta-hover": "hsl(var(--warm-cta-hover))",
        "warm-cta-text": "hsl(var(--warm-cta-text))",
        "warm-star": "hsl(var(--warm-star))",
        "warm-trust": "hsl(var(--warm-trust))",
        "warm-chrome": "hsl(var(--warm-chrome))",
        "warm-tab-bg": "hsl(var(--warm-tab-bg))",
        "warm-card": "hsl(var(--warm-card))",
        "warm-flow": "hsl(var(--warm-flow))",
        "warm-badge": "hsl(var(--warm-badge))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "xl": "0.875rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
        "128": "32rem",
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
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "flame-flicker": {
          "0%, 100%": { 
            boxShadow: "0 0 8px 2px rgba(251, 146, 60, 0.6), 0 0 16px 4px rgba(239, 68, 68, 0.4), 0 0 24px 6px rgba(234, 179, 8, 0.2)",
            transform: "scale(1)"
          },
          "25%": { 
            boxShadow: "0 0 12px 3px rgba(239, 68, 68, 0.7), 0 0 20px 5px rgba(251, 146, 60, 0.5), 0 0 28px 7px rgba(234, 179, 8, 0.3)",
            transform: "scale(1.02)"
          },
          "50%": { 
            boxShadow: "0 0 10px 2px rgba(234, 179, 8, 0.6), 0 0 18px 4px rgba(251, 146, 60, 0.5), 0 0 26px 6px rgba(239, 68, 68, 0.3)",
            transform: "scale(0.98)"
          },
          "75%": { 
            boxShadow: "0 0 14px 4px rgba(251, 146, 60, 0.8), 0 0 22px 6px rgba(239, 68, 68, 0.5), 0 0 30px 8px rgba(234, 179, 8, 0.3)",
            transform: "scale(1.01)"
          },
        },
        "flame-glow": {
          "0%, 100%": { 
            opacity: "0.6",
            filter: "blur(8px)"
          },
          "50%": { 
            opacity: "1",
            filter: "blur(12px)"
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-up": "fade-up 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "flame-flicker": "flame-flicker 1.5s ease-in-out infinite",
        "flame-glow": "flame-glow 2s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "hero-gradient": "var(--gradient-hero)",
        "card-gradient": "var(--gradient-card)",
        "cta-gradient": "var(--gradient-cta)",
        "premium-card": "var(--gradient-premium-card)",
      },
      boxShadow: {
        "soft-sm": "var(--shadow-sm)",
        "soft-md": "var(--shadow-md)",
        "soft-lg": "var(--shadow-lg)",
        "soft-xl": "var(--shadow-xl)",
        "glow-primary": "var(--glow-primary)",
        "glow-accent": "var(--glow-accent)",
        "glow-premium": "var(--glow-premium)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.19, 1, 0.22, 1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
