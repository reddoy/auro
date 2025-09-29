/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-down": {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(204, 53, 151, 0.4)" },
          "50%": { boxShadow: "0 0 40px rgba(204, 53, 151, 0.8)" },
        },
        "float-orb": {
          "0%, 100%": { transform: "translateY(0px) translateX(0px) rotate(0deg)" },
          "25%": { transform: "translateY(-20px) translateX(10px) rotate(90deg)" },
          "50%": { transform: "translateY(-10px) translateX(-15px) rotate(180deg)" },
          "75%": { transform: "translateY(-30px) translateX(5px) rotate(270deg)" },
        },
        "mobile-iphone-float": {
          "0%, 100%": { transform: "translateY(0px) rotateY(0deg)" },
          "50%": { transform: "translateY(-15px) rotateY(5deg)" },
        },
        "mobile-glow-pulse": {
          "0%, 100%": { opacity: "0.6", transform: "translate(-50%, -50%) scale(1)" },
          "50%": { opacity: "0.8", transform: "translate(-50%, -50%) scale(1.1)" },
        },
        "mobile-text-slide-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "fade-in-down": "fade-in-down 0.6s ease-out",
        "slide-in-left": "slide-in-left 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.6s ease-out",
        "float": "float 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float-orb": "float-orb 8s ease-in-out infinite",
        "mobile-iphone-float": "mobile-iphone-float 6s ease-in-out infinite",
        "mobile-glow-pulse": "mobile-glow-pulse 3s ease-in-out infinite",
        "mobile-text-slide-up": "mobile-text-slide-up 1s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}