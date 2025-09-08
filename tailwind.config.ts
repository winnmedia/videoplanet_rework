import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './widgets/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './entities/**/*.{ts,tsx}',
    './shared/**/*.{ts,tsx}',
    './processes/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',

      vridge: {
        500: '#0031ff',
        600: '#006ae8',
        700: '#0059db',
      },

      gray: {
        50: '#fafafa',
        100: '#f8f9ff',
        200: '#eeeeee',
        300: '#e4e4e4',
        500: '#919191',
        600: '#6b7280',
        700: '#555555',
        900: '#333333',
      },

      success: {
        500: '#15803d',
        600: '#166534',
      },
      error: {
        500: '#b91c1c',
        600: '#991b1b',
      },
      primary: {
        DEFAULT: '#0031ff',
        500: '#0031ff',
        600: '#006ae8',
        700: '#0059db',
      },
    },
    spacing: {
      px: '1px',
      0: '0px',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
      10: '40px',
      11: '44px',
      12: '48px',
      16: '64px',
      20: '80px',
      24: '96px',
    },
    borderRadius: {
      none: '0px',
      sm: '4px',
      DEFAULT: '8px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    boxShadow: {
      none: 'none',
      sm: '0 2px 4px rgba(0, 0, 0, 0.06)',
      DEFAULT: '0 4px 8px rgba(0, 0, 0, 0.08)',
      lg: '0 8px 16px rgba(0, 0, 0, 0.1)',
      xl: '0 12px 24px rgba(0, 0, 0, 0.12)',
    },
    extend: {
      maxWidth: {
        container: '1200px',
        sidebar: '280px',
      },
      width: {
        sidebar: '280px',
      },
      margin: {
        sidebar: '280px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
