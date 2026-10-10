import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#090d16',
        surface: {
          DEFAULT: '#111827',
          elevated: '#1f2937',
          subtle: '#162032',
          border: '#374151',
        },
        primary: {
          DEFAULT: '#10b981', // Emerald for navigation progression
          hover: '#059669',
          light: '#34d399',
          dim: '#064e3b',
        },
        accent: {
          DEFAULT: '#0ea5e9', // Sky blue for route geometry
          hover: '#0284c7',
          dim: '#0c4a6e',
        },
        warning: {
          DEFAULT: '#f59e0b', // Amber for GPS uncertainty & road crossing alerts
          dim: '#78350f',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
