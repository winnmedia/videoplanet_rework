import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
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
    // 완전히 새로운 초미니멀 디자인 시스템
    fontFamily: {
      sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
      mono: ['SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', 'Courier New', 'monospace'],
    },
    fontSize: {
      // 미니멀한 타이포그래피 스케일 (1.25 ratio)
      '2xs': ['0.625rem', { lineHeight: '0.75rem' }], // 10px
      xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
      base: ['1rem', { lineHeight: '1.5rem' }], // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
      '5xl': ['3rem', { lineHeight: '3rem' }], // 48px
    },
    colors: {
      // 초미니멀 컬러 팔레트
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      
      // VRidge 브랜드 컬러 (정제됨)
      vridge: {
        50: '#f0f4ff',
        100: '#e0e8ff',
        200: '#c7d5ff',
        300: '#a5b8ff',
        400: '#7e8fff',
        500: '#0031ff', // Primary Brand Color
        600: '#0025cc',
        700: '#001d99',
        800: '#001566',
        900: '#000c33',
        950: '#000619',
      },
      
      // 뉴트럴 그레이 스케일 (세련됨)
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
      
      // 시맨틱 컬러 (미니멀)
      success: {
        50: '#f0fdfa',
        500: '#10b981',
        600: '#059669',
        700: '#047857',
      },
      error: {
        50: '#fef2f2',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
      },
      warning: {
        50: '#fffbeb',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
      },
      
      // 별칭 (편의성)
      primary: {
        DEFAULT: '#0031ff',
        50: '#f0f4ff',
        100: '#e0e8ff',
        500: '#0031ff',
        600: '#0025cc',
        700: '#001d99',
      },
      gray: {
        DEFAULT: '#737373',
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
      },
    },
    spacing: {
      // 미니멀한 간격 시스템 (8px 기준)
      px: '1px',
      0: '0px',
      0.5: '0.125rem', // 2px
      1: '0.25rem',    // 4px
      1.5: '0.375rem', // 6px
      2: '0.5rem',     // 8px
      2.5: '0.625rem', // 10px
      3: '0.75rem',    // 12px
      3.5: '0.875rem', // 14px
      4: '1rem',       // 16px
      5: '1.25rem',    // 20px
      6: '1.5rem',     // 24px
      7: '1.75rem',    // 28px
      8: '2rem',       // 32px
      9: '2.25rem',    // 36px
      10: '2.5rem',    // 40px
      11: '2.75rem',   // 44px
      12: '3rem',      // 48px
      14: '3.5rem',    // 56px
      16: '4rem',      // 64px
      18: '4.5rem',    // 72px
      20: '5rem',      // 80px
      24: '6rem',      // 96px
      28: '7rem',      // 112px
      32: '8rem',      // 128px
      36: '9rem',      // 144px
      40: '10rem',     // 160px
      44: '11rem',     // 176px
      48: '12rem',     // 192px
      52: '13rem',     // 208px
      56: '14rem',     // 224px
      60: '15rem',     // 240px
      64: '16rem',     // 256px
      72: '18rem',     // 288px
      80: '20rem',     // 320px
      96: '24rem',     // 384px
    },
    borderRadius: {
      none: '0px',
      sm: '0.125rem',  // 2px
      DEFAULT: '0.25rem', // 4px (미니멀)
      md: '0.375rem',  // 6px
      lg: '0.5rem',    // 8px
      xl: '0.75rem',   // 12px
      '2xl': '1rem',   // 16px
      '3xl': '1.5rem', // 24px
      full: '9999px',
    },
    boxShadow: {
      // 극도로 세련된 그림자 시스템
      none: '0 0 #0000',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
    },
    extend: {
      // VRidge 전용 확장
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
        container: '1200px',
        narrow: '640px',
        form: '384px',
        sidebar: '280px',
        'sidebar-collapsed': '80px',
      },
      width: {
        sidebar: '280px',
        'sidebar-collapsed': '80px',
      },
      margin: {
        sidebar: '280px', // ml-sidebar 클래스를 위한 토큰
        'sidebar-collapsed': '80px',
      },
      inset: {
        sidebar: '280px', // left positioning for submenu
      },
      height: {
        input: '2.75rem', // 44px (미니멀)
        button: '2.75rem', // 44px
        'button-sm': '2rem', // 32px
        'button-lg': '3rem', // 48px
        header: '4rem', // 64px
        'mobile-header': '3.5rem', // 56px
      },
      minHeight: {
        input: '2.75rem',
        button: '2.75rem',
        content: 'calc(100vh - 4rem)', // 전체 높이 - 헤더 높이
        'mobile-content': 'calc(100vh - 3.5rem)',
      },
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        backdrop: '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
        toast: '1080',
        // Custom z-index values for layout hierarchy
        '40': '40',
        '45': '45',
        '50': '50',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.15s ease-in',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'slide-in': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'slide-out-left': 'slideOutLeft 0.2s ease-in',
        'scale-in': 'scaleIn 0.15s ease-out',
        'scale-out': 'scaleOut 0.1s ease-in',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'expand': 'expand 0.2s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-0.5rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOutLeft: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        expand: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        bounceSubtle: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      // 다크모드 대비 및 반응형 강화
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1680px',
        '4xl': '1920px',
      },
      // 그리드 시스템
      gridTemplateColumns: {
        'sidebar': '280px 1fr',
        'sidebar-collapsed': '80px 1fr',
        'auto-fit-200': 'repeat(auto-fit, minmax(200px, 1fr))',
        'auto-fit-250': 'repeat(auto-fit, minmax(250px, 1fr))',
        'auto-fit-300': 'repeat(auto-fit, minmax(300px, 1fr))',
      },
      // 모던 그라데이션
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
      },
      // 더 정교한 그림자 시스템
      dropShadow: {
        'glow': '0 0 6px rgb(0 49 255 / 0.4)',
        'glow-lg': '0 0 20px rgb(0 49 255 / 0.35)',
      },
      // 추가 transform 유틸리티
      scale: {
        '102': '1.02',
        '105': '1.05',
      },
      // 추가 line-height 유틸리티
      lineHeight: {
        'extra-tight': '1.1',
        'extra-loose': '2',
      },
      // 커스텀 스크롤바 유틸리티
      scrollbar: {
        thin: '8px',
        track: '#f1f1f1',
        thumb: '#c1c1c1',
        'thumb-hover': '#a8a8a8',
      },
    },
  },
  plugins: [],
} satisfies Config;