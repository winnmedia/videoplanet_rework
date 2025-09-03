/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/widgets/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/entities/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/shared/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Admin Panel Design System
      colors: {
        // Primary Brand Colors
        primary: {
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
          950: '#082f49',
          DEFAULT: '#0ea5e9',
          dark: '#0369a1', // alias for 700
        },
        
        // Admin Status Colors
        admin: {
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
          pending: '#8b5cf6',
        },
        
        // Role-based Colors
        role: {
          owner: '#dc2626',
          admin: '#ea580c',
          editor: '#ca8a04',
          reviewer: '#059669',
          viewer: '#6b7280',
        },
        
        // Neutral Colors
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        
        // Background Colors
        background: {
          primary: '#ffffff',
          secondary: '#f8fafc',
          tertiary: '#f1f5f9',
          dark: '#0f172a',
          card: '#ffffff',
          overlay: 'rgba(0, 0, 0, 0.5)',
        },
        
        // Border Colors
        border: {
          light: '#e2e8f0',
          medium: '#cbd5e1',
          dark: '#475569',
          focus: '#3b82f6',
        },
      },
      
      // Typography
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      
      // Spacing
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
        '128': '32rem',
      },
      
      // Component Sizes
      maxWidth: {
        'dashboard': '1440px',
        'content': '1024px',
        'form': '672px',
        'sidebar': '320px',
      },
      
      // Shadow System
      boxShadow: {
        'admin-card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'admin-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'admin-focus': '0 0 0 3px rgba(59, 130, 246, 0.1)',
        'admin-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      
      // Border Radius
      borderRadius: {
        'admin': '0.375rem',
        'admin-lg': '0.5rem',
        'admin-xl': '0.75rem',
      },
      
      // Animation
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 2s infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      
      // Grid Template
      gridTemplateColumns: {
        'admin-sidebar': '320px 1fr',
        'admin-table': 'auto 1fr auto auto',
        'admin-form': '1fr 2fr',
      },
    },
  },
  plugins: [
    // Forms plugin for better form styling
    require('@tailwindcss/forms'),
    
    // Custom utilities plugin
    function({ addUtilities }) {
      const newUtilities = {
        '.table-auto-fit': {
          'table-layout': 'auto',
          'width': '100%',
        },
        '.scrollbar-thin': {
          'scrollbar-width': 'thin',
          'scrollbar-color': '#cbd5e1 #f1f5f9',
        },
        '.focus-ring': {
          '&:focus': {
            'outline': '2px solid transparent',
            'outline-offset': '2px',
            'box-shadow': '0 0 0 3px rgba(59, 130, 246, 0.1)',
          },
        },
      }
      addUtilities(newUtilities)
    },
  ],
}