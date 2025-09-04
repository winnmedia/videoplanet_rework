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
      // 기본 색상
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      
      // VRidge 브랜드 컬러 (레거시 SCSS 정확히 매핑)
      vridge: {
        50: '#f8f9ff',      // $color-gray-100 매핑
        100: '#e6ecff',     // $color-primary-lighter 정확히 매핑
        200: '#c7d5ff',     // 중간 단계
        300: '#a5b8ff',     // 중간 단계
        400: '#7e8fff',     // 중간 단계
        500: '#0031ff',     // $color-primary 정확히 매핑
        600: '#006ae8',     // $color-primary-light 정확히 매핑
        700: '#0059db',     // $color-primary-dark 정확히 매핑
        800: '#004bc4',     // $color-primary-darker 정확히 매핑
        900: '#000c33',     // 다크 변형
        950: '#000619',     // 매우 다크
      },
      
      // 뉴트럴 그레이 (레거시 SCSS 정확히 매핑)
      neutral: {
        50: '#fafafa',      // $color-gray-50 정확히 매핑
        100: '#f8f9ff',     // $color-gray-100 정확히 매핑
        200: '#eeeeee',     // $color-gray-200 정확히 매핑
        300: '#e4e4e4',     // $color-gray-300 정확히 매핑 (border)
        400: '#9ca3af',     // $color-gray-400 정확히 매핑
        500: '#919191',     // $color-gray-500 정확히 매핑
        600: '#6b7280',     // $color-gray-600 정확히 매핑
        700: '#555555',     // $color-gray-700 정확히 매핑 ($color-text-secondary)
        800: '#1f2937',     // $color-gray-800 정확히 매핑
        900: '#333333',     // $color-gray-900 정확히 매핑
        950: '#25282f',     // $color-dark 정확히 매핑 ($color-text-primary)
      },
      
      // 시맨틱 컬러 (레거시 SCSS 정확히 매핑)
      success: {
        50: '#f0f9ff',      // $color-success-lighter 매핑
        100: '#f0f9ff',     // Toast 배경색
        200: '#10b981',     // $color-success-light (Toast용)
        500: '#28a745',     // $color-success 정확히 매핑
        600: '#218838',     // $color-success-dark 정확히 매핑
        700: '#1c7430',     // $color-success-darker 정확히 매핑
        800: '#065f46',     // $color-success-text (Toast 텍스트)
      },
      error: {
        50: '#fef2f2',      // $color-error-lighter 정확히 매핑
        100: '#fef2f2',     // Toast 배경색
        200: '#ef4444',     // $color-error-light (Toast용) 
        500: '#d93a3a',     // $color-error 정확히 매핑
        600: '#b02a2a',     // $color-error-dark 정확히 매핑
        700: '#9d2424',     // $color-error-darker 정확히 매핑
        800: '#991b1b',     // $color-error-text (Toast 텍스트)
        weekend: '#ff6b6b', // DatePicker 주말 색상
      },
      warning: {
        50: '#fffbeb',      // $color-warning-lighter 정확히 매핑
        100: '#fffbeb',     // Toast 배경색
        200: '#f59e0b',     // $color-warning-light (Toast용)
        500: '#ffc107',     // $color-warning 정확히 매핑
        600: '#cc9a06',     // $color-warning-dark 정확히 매핑
        700: '#e6a000',     // $color-warning-darker (ProjectStatusCard용)
        800: '#92400e',     // $color-warning-text (Toast 텍스트)
      },
      info: {
        50: '#f0f9ff',      // $color-info-lighter 정확히 매핑
        100: '#f0f9ff',     // Toast 배경색
        200: '#3b82f6',     // $color-info-light (Toast용)
        500: '#17a2b8',     // $color-info 정확히 매핑
        600: '#128299',     // $color-info-dark 정확히 매핑
        700: '#0e6b7e',     // $color-info-darker 정확히 매핑
        800: '#1e40af',     // $color-info-text (Toast 텍스트)
      },
      
      // Legacy 호환성 별칭
      accent: {
        500: '#3dcdbf',     // $color-accent 정확히 매핑
        600: '#33b3a6',     // $color-accent-dark 정확히 매핑
      },
      
      // 편의성 별칭 (기존 코드 호환성)
      primary: {
        DEFAULT: '#0031ff', // $color-primary
        50: '#f8f9ff',
        100: '#e6ecff',
        500: '#0031ff',
        600: '#006ae8',
        700: '#0059db',
        800: '#004bc4',
      },
      gray: {
        DEFAULT: '#919191', // $color-gray-500
        50: '#fafafa',
        100: '#f8f9ff',
        200: '#eeeeee',
        300: '#e4e4e4',
        400: '#9ca3af',
        500: '#919191',
        600: '#6b7280',
        700: '#555555',
        800: '#1f2937',
        900: '#333333',
      },
      
      // Background 색상 (레거시 매핑)
      background: {
        primary: '#ffffff',    // $bg-primary
        secondary: '#f8f9ff',  // $bg-secondary
        tertiary: '#ecefff',   // $bg-tertiary
        dark: '#25282f',       // $bg-dark
      },
      
      // Border 색상 (레거시 매핑)
      border: {
        DEFAULT: '#e4e4e4',   // $color-border
        light: '#eeeeee',     // $color-border-light
        dark: '#9ca3af',      // $color-border-dark
      },
    },
    spacing: {
      // 8px Grid System (레거시 SCSS 정확히 매핑)
      px: '1px',
      0: '0px',       // $spacing-0
      0.5: '2px',     // $spacing-xs-half (절반 단위)
      1: '4px',       // $spacing-xs
      2: '8px',       // $spacing-sm (기본 8px 그리드)
      3: '12px',      // 중간값
      4: '16px',      // $spacing-md
      5: '20px',      // 중간값
      6: '24px',      // $spacing-lg
      7: '28px',      // 중간값
      8: '32px',      // $spacing-xl
      9: '36px',      // $button-height-sm, $datepicker-day-size
      10: '40px',     // $spacing-2xl, $avatar-size-md
      11: '44px',     // $button-height-md, $input-height-md, $submenu-min-touch-target
      12: '48px',     // $spacing-3xl, $avatar-size-lg
      14: '54px',     // $button-height-lg, $input-height-lg
      16: '64px',     // $spacing-4xl, $avatar-size-xl
      18: '72px',     // 중간값
      20: '80px',     // $spacing-5xl, $avatar-size-2xl
      24: '96px',     // $spacing-6xl, $avatar-size-3xl
      28: '112px',    // 중간값
      32: '128px',    // $spacing-7xl
      36: '144px',    // 중간값
      40: '160px',    // 큰 간격
      44: '176px',    // 중간값
      48: '192px',    // 중간값
      52: '208px',    // 중간값
      56: '224px',    // 중간값
      60: '240px',    // 중간값
      64: '256px',    // 중간값
      72: '288px',    // 중간값
      80: '320px',    // $datepicker-width
      96: '384px',    // 큰 간격
      
      // 컴포넌트별 특수 간격 (레거시 매핑)
      'xs-half': '2px',      // $spacing-xs-half
      'xs': '4px',           // $spacing-xs
      'sm': '8px',           // $spacing-sm
      'md': '16px',          // $spacing-md
      'lg': '24px',          // $spacing-lg
      'xl': '32px',          // $spacing-xl
      '2xl': '40px',         // $spacing-2xl
      '3xl': '48px',         // $spacing-3xl
      '4xl': '64px',         // $spacing-4xl
      '5xl': '80px',         // $spacing-5xl
      '6xl': '96px',         // $spacing-6xl
      '7xl': '128px',        // $spacing-7xl
    },
    borderRadius: {
      // 레거시 SCSS border radius 정확히 매핑
      none: '0px',        // $radius-none, $border-radius-none
      sm: '4px',          // $radius-sm, $border-radius-sm (정확히 매핑)
      DEFAULT: '8px',     // $radius-md, $border-radius-md (기본값)
      md: '8px',          // $radius-md, $border-radius-md
      lg: '12px',         // $radius-lg, $border-radius-lg (카드 기본값)
      xl: '16px',         // $radius-xl, $border-radius-xl (버튼 sm/md용)
      '2xl': '20px',      // $radius-2xl, $border-radius-2xl (버튼 lg용, legacy 카드)
      '3xl': '24px',      // $radius-3xl, $border-radius-3xl
      full: '9999px',     // $radius-full, $border-radius-full (원형 버튼)
    },
    boxShadow: {
      // VRidge 레거시 그림자 시스템 정확히 매핑
      none: 'none',                                           // $shadow-none
      xs: '0 1px 2px rgba(0, 0, 0, 0.05)',                  // $shadow-xs
      sm: '0 2px 4px rgba(0, 0, 0, 0.06)',                  // $shadow-sm
      DEFAULT: '0 4px 8px rgba(0, 0, 0, 0.08)',             // $shadow-md (기본)
      md: '0 4px 8px rgba(0, 0, 0, 0.08)',                  // $shadow-md
      lg: '0 8px 16px rgba(0, 0, 0, 0.1)',                  // $shadow-lg (카드 hover 기본)
      xl: '0 12px 24px rgba(0, 0, 0, 0.12)',                // $shadow-xl (카드 상승 효과)
      '2xl': '0 24px 48px rgba(0, 0, 0, 0.15)',             // $shadow-2xl
      primary: '0 5px 20px rgba(0, 49, 255, 0.3)',          // $shadow-primary (VRidge 브랜드)
      hover: '0 5px 15px rgba(0, 0, 0, 0.1)',               // $shadow-hover (호버 상승)
      inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',        // 내부 그림자
      
      // 레거시 카드 그림자 (호환성)
      legacy: '0 2px 8px rgba(0, 0, 0, 0.1)',               // Card.module.scss legacyStyle
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
      // 레거시 transition durations 매핑
      transitionDuration: {
        '50': '50ms',     // $duration-instant
        '100': '100ms',   // $duration-fast
        '150': '150ms',   // $transition-fast
        '200': '200ms',   // $transition-base, $duration-normal
        '300': '300ms',   // $transition-slow, $duration-slow
        '500': '500ms',   // $transition-slower, $duration-slower
        '1000': '1000ms', // $duration-slowest
        
        // Golden Ratio 애니메이션 (precision-craft-tokens)
        '162': '162ms',   // $animation-precision-fast (φ * 100ms)
        '262': '262ms',   // $animation-precision-medium (φ * 162ms)
        '424': '424ms',   // $animation-precision-slow (φ * 262ms)
      },
      
      // 레거시 easing 함수 매핑
      transitionTimingFunction: {
        'ease-in-out': 'ease-in-out',
        'precision': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // $transition-precision
      },
      
      animation: {
        // 레거시 애니메이션 (정확한 duration 매핑)
        'fade-in': 'fadeIn 200ms ease-out',      // $transition-base
        'fade-out': 'fadeOut 150ms ease-in',     // $transition-fast
        'slide-up': 'slideUp 200ms ease-out',    // $transition-base
        'slide-down': 'slideDown 200ms ease-out', // $transition-base
        'slide-in': 'slideInRight 300ms ease-out', // $transition-slow (Toast)
        'slide-in-left': 'slideInLeft 300ms ease-out',
        'slide-out-left': 'slideOutLeft 200ms ease-in',
        'scale-in': 'scaleIn 150ms ease-out',    // $transition-fast
        'scale-out': 'scaleOut 100ms ease-in',   // $duration-fast
        
        // 레거시 특수 애니메이션
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'expand': 'expand 200ms ease-out',       // $transition-base
        'bounce-subtle': 'bounceSubtle 600ms ease-out',
        'spinner': 'spinner 0.8s linear infinite', // 버튼 로딩 스피너
        
        // Golden Ratio 기반 정밀 애니메이션
        'precision-fast': 'fadeIn 162ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'precision-medium': 'fadeIn 262ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'precision-slow': 'fadeIn 424ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
      keyframes: {
        // 기본 페이드 애니메이션
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        
        // 슬라이드 애니메이션
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
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        
        // 스케일 애니메이션 (미묘한 변화)
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleOut: {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(0.95)', opacity: '0' },
        },
        
        // 확장 효과 (버튼 상호작용)
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
        
        // 부드러운 펄스 (로딩 상태)
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        
        // 시머 효과 (스켈레톤 로딩)
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        
        // 레거시 스피너 애니메이션 (Button.module.scss 매핑)
        spinner: {
          'to': { transform: 'rotate(360deg)' }
        },
        
        // Toast 슬라이드 인 애니메이션 (Toast.module.scss 정확히 매핑)
        slideIn: {
          'from': {
            transform: 'translateX(100%)',
            opacity: '0'
          },
          'to': {
            transform: 'translateX(0)',
            opacity: '1'
          }
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