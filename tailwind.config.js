/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0B1020",
        panel: "rgba(255, 255, 255, 0.05)",
        "panel-border": "rgba(255, 255, 255, 0.10)",
        primary: "#E7ECF5",
        muted: "#94A3B8",
        accent: "#14B8A6",
        teal: {
          400: "#2dd4bf",
          500: "#14B8A6",
          600: "#0d9488",
        },
        review: "#F59E0B",
        fail: "#EF4444",
        agent: "#8B5CF6",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-teal': '0 0 35px -5px rgba(20, 184, 166, 0.3)',
        'glow-amber': '0 0 35px -5px rgba(245, 158, 11, 0.3)',
        'glow-red': '0 0 35px -5px rgba(239, 68, 68, 0.3)',
      }
    },
  },
  plugins: [],
}
