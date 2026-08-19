import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        water: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs:   ['0.8125rem',  { lineHeight: '1.25rem' }],   // 13px
        sm:   ['0.9375rem',  { lineHeight: '1.5rem'  }],   // 15px
        base: ['1rem',       { lineHeight: '1.625rem'}],   // 16px
        lg:   ['1.125rem',   { lineHeight: '1.75rem' }],   // 18px
        xl:   ['1.25rem',    { lineHeight: '1.875rem'}],   // 20px
        '2xl':['1.5rem',     { lineHeight: '2rem'    }],   // 24px
        '3xl':['1.875rem',   { lineHeight: '2.25rem' }],   // 30px
        '4xl':['2.25rem',    { lineHeight: '2.5rem'  }],   // 36px
      },
      screens: {
        xs: '400px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
} satisfies Config;
