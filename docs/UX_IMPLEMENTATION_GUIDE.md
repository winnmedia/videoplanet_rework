# UX Implementation Guide: Immediate Fixes

**Priority**: Fix critical UX issues while maintaining ultra-minimal sophisticated design  
**Timeline**: 4 weeks  
**Methodology**: Test-Driven, Slice-by-Slice Implementation

## Week 1: Design System Foundation

### 1.1 Create Design Tokens (Day 1-2)

**File**: `/shared/config/design-tokens.scss`

```scss
// Typography System
$font-family-primary: 'suit', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
$font-family-mono: 'suit-mono', 'SF Mono', Monaco, monospace;

// Type Scale (Perfect Fourth - 1.333 ratio)
$font-size-xs: 0.75rem;    // 12px
$font-size-sm: 0.875rem;   // 14px  
$font-size-base: 0.9375rem; // 15px (legacy standard)
$font-size-md: 1.125rem;   // 18px
$font-size-lg: 1.5rem;     // 24px
$font-size-xl: 2.25rem;    // 36px
$font-size-2xl: 2.875rem;  // 46px
$font-size-3xl: 3.75rem;   // 60px

// Font Weights
$font-weight-light: 300;
$font-weight-regular: 400;
$font-weight-semibold: 600;
$font-weight-bold: 700;

// Line Heights
$line-height-tight: 1.2;
$line-height-normal: 1.5;
$line-height-relaxed: 1.7;

// Color Palette
$color-primary: #0031ff;
$color-primary-dark: #0059db;
$color-primary-light: #006ae8;
$color-primary-gradient: linear-gradient(135deg, $color-primary 0%, $color-primary-dark 100%);

$color-secondary: #25282f;
$color-secondary-light: #404347;

$color-success: #28a745;
$color-warning: #ffc107;
$color-error: #d93a3a;
$color-info: #17a2b8;

// Grayscale
$color-white: #ffffff;
$color-gray-50: #f8f9ff;
$color-gray-100: #ecefff;
$color-gray-200: #e4e4e4;
$color-gray-300: #d1d5db;
$color-gray-400: #9ca3af;
$color-gray-500: #919191;
$color-gray-600: #767676; // WCAG AA minimum
$color-gray-700: #4b5563;
$color-gray-800: #25282f;
$color-gray-900: #111827;

// Semantic Colors
$color-text-primary: $color-gray-800;
$color-text-secondary: $color-gray-600;
$color-text-muted: $color-gray-500;
$color-text-inverse: $color-white;

$color-background: $color-white;
$color-background-alt: $color-gray-50;
$color-background-hover: $color-gray-100;

$color-border: $color-gray-200;
$color-border-hover: $color-primary;

// Spacing Scale (8px base)
$spacing-0: 0;
$spacing-xs: 0.5rem;   // 8px
$spacing-sm: 0.75rem;  // 12px
$spacing-md: 1rem;     // 16px
$spacing-lg: 1.5rem;   // 24px
$spacing-xl: 2rem;     // 32px
$spacing-2xl: 3rem;    // 48px
$spacing-3xl: 4rem;    // 64px
$spacing-4xl: 6rem;    // 96px
$spacing-5xl: 9.375rem; // 150px

// Border Radius
$radius-sm: 0.25rem;   // 4px
$radius-md: 0.5rem;    // 8px
$radius-lg: 0.9375rem; // 15px (legacy standard)
$radius-xl: 1.25rem;   // 20px
$radius-full: 9999px;

// Shadows
$shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
$shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
$shadow-primary: 0 5px 15px rgba(0, 49, 255, 0.3);
$shadow-hover: 5px 5px 10px #e8e8e8;

// Transitions
$transition-fast: 150ms ease-in-out;
$transition-base: 300ms ease-in-out;
$transition-slow: 500ms ease-in-out;

// Z-index layers
$z-base: 0;
$z-dropdown: 1000;
$z-sticky: 1020;
$z-fixed: 1030;
$z-modal-backdrop: 1040;
$z-modal: 1050;
$z-popover: 1060;
$z-tooltip: 1070;

// Breakpoints
$breakpoint-xs: 480px;
$breakpoint-sm: 640px;
$breakpoint-md: 768px;
$breakpoint-lg: 1024px;
$breakpoint-xl: 1280px;
$breakpoint-2xl: 1536px;

// Container widths
$container-sm: 640px;
$container-md: 768px;
$container-lg: 1024px;
$container-xl: 1280px;
$container-2xl: 1536px;
```

### 1.2 Update Global Styles (Day 2)

**File**: `/app/globals.css`

```css
/* Add after existing root variables */

/* Focus Visible Styles */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Skip Navigation Link */
.skip-nav {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--primary);
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-nav:focus {
  top: 0;
}

/* Improved Form Styles */
input.ty01[aria-invalid="true"],
input.ty01.error {
  border-color: var(--error);
  background-color: #fef2f2;
}

input.ty01[aria-invalid="true"]:focus {
  box-shadow: 0 0 0 3px rgba(217, 58, 58, 0.1);
}

/* Loading States */
.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Improved Button States */
button.ty01:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #cbd5e1;
}

button.ty01:focus-visible {
  box-shadow: 0 0 0 3px rgba(0, 49, 255, 0.2);
}

/* Screen Reader Only */
.visually-hidden {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
```

### 1.3 Fix Login Page (Day 3)

**File**: `/app/login/page.tsx`

```tsx
'use client'

import { LoginForm } from '@/features/auth'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import styles from './login.module.scss'

export default function LoginPage() {
  const router = useRouter()
  
  return (
    <div className={styles.container}>
      {/* Skip Navigation */}
      <a href="#login-form" className="skip-nav">
        로그인 폼으로 건너뛰기
      </a>
      
      {/* Left Side - Brand Story */}
      <section 
        className={styles.brand}
        aria-labelledby="brand-heading"
      >
        <div className={styles.brandContent}>
          <div className={styles.logo}>
            <Image 
              src="/images/Common/w_logo02.svg" 
              alt="VLANET - 영상 콘텐츠 협업 플랫폼" 
              width={140} 
              height={40}
              priority
            />
          </div>
          
          <h1 id="brand-heading" className={styles.headline}>
            영상 콘텐츠<br />
            협업의 <strong>새로운 기준</strong>
          </h1>
          
          <ul className={styles.features} role="list">
            <li>
              <svg aria-hidden="true" width="24" height="24">
                <use href="#icon-check" />
              </svg>
              <span>실시간 타임스탬프 피드백</span>
            </li>
            <li>
              <svg aria-hidden="true" width="24" height="24">
                <use href="#icon-check" />
              </svg>
              <span>팀 협업 최적화 도구</span>
            </li>
            <li>
              <svg aria-hidden="true" width="24" height="24">
                <use href="#icon-check" />
              </svg>
              <span>버전 관리 및 히스토리</span>
            </li>
          </ul>
        </div>
        
        <div className={styles.brandVisual} aria-hidden="true">
          <Image 
            src="/images/User/login_bg.png" 
            alt="" 
            fill
            style={{ objectFit: 'cover' }}
            priority
          />
        </div>
      </section>
      
      {/* Right Side - Login Form */}
      <section 
        className={styles.formSection}
        aria-labelledby="login-heading"
      >
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2 id="login-heading" className={styles.title}>
              다시 만나서 반가워요!
            </h2>
            <p className={styles.subtitle}>
              브이래닛으로 영상 제작의 새로운 세계를 경험하세요
            </p>
          </div>
          
          <div id="login-form" className={styles.formWrapper}>
            <LoginForm />
          </div>
          
          {/* Social Login */}
          <div className={styles.divider}>
            <span>또는 간편 로그인</span>
          </div>
          
          <div className={styles.socialLogin}>
            <button 
              className={styles.socialButton}
              onClick={() => {/* OAuth 구현 */}}
              aria-label="Google 계정으로 로그인"
            >
              <Image 
                src="/images/User/google_icon.svg" 
                alt="" 
                width={20} 
                height={20}
                aria-hidden="true"
              />
              <span>Google로 계속하기</span>
            </button>
            
            <button 
              className={styles.socialButton}
              onClick={() => {/* OAuth 구현 */}}
              aria-label="카카오 계정으로 로그인"
              style={{ background: '#FEE500', color: '#000' }}
            >
              <Image 
                src="/images/User/kakao_icon.svg" 
                alt="" 
                width={20} 
                height={20}
                aria-hidden="true"
              />
              <span>카카오로 계속하기</span>
            </button>
            
            <button 
              className={styles.socialButton}
              onClick={() => {/* OAuth 구현 */}}
              aria-label="네이버 계정으로 로그인"
              style={{ background: '#03C75A', color: '#fff' }}
            >
              <Image 
                src="/images/User/naver_icon.svg" 
                alt="" 
                width={20} 
                height={20}
                aria-hidden="true"
              />
              <span>네이버로 계속하기</span>
            </button>
          </div>
          
          {/* Footer Links */}
          <div className={styles.formFooter}>
            <p>
              아직 계정이 없으신가요?{' '}
              <button 
                onClick={() => router.push('/signup')}
                className={styles.textLink}
              >
                무료로 시작하기
              </button>
            </p>
            
            <button 
              onClick={() => router.push('/forgot-password')}
              className={styles.textLink}
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
```

### 1.4 Create Login SCSS Module (Day 3)

**File**: `/app/login/login.module.scss`

```scss
@import '@/shared/config/design-tokens';

.container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  
  @media (max-width: $breakpoint-lg) {
    grid-template-columns: 1fr;
  }
}

.brand {
  position: relative;
  background: $color-primary-gradient;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-3xl;
  
  @media (max-width: $breakpoint-lg) {
    display: none;
  }
}

.brandContent {
  position: relative;
  z-index: 1;
  max-width: 500px;
}

.logo {
  margin-bottom: $spacing-2xl;
}

.headline {
  font-size: $font-size-2xl;
  font-weight: $font-weight-light;
  color: $color-white;
  line-height: $line-height-tight;
  margin-bottom: $spacing-xl;
  
  strong {
    font-weight: $font-weight-bold;
  }
}

.features {
  list-style: none;
  padding: 0;
  margin: 0;
  
  li {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    color: rgba(255, 255, 255, 0.9);
    font-size: $font-size-md;
    margin-bottom: $spacing-lg;
    
    svg {
      flex-shrink: 0;
      color: #fff88f;
    }
  }
}

.brandVisual {
  position: absolute;
  inset: 0;
  opacity: 0.1;
}

.formSection {
  background: $color-background;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-2xl;
}

.formContainer {
  width: 100%;
  max-width: 440px;
}

.formHeader {
  text-align: center;
  margin-bottom: $spacing-2xl;
}

.title {
  font-size: $font-size-xl;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: $spacing-sm;
}

.subtitle {
  font-size: $font-size-base;
  color: $color-text-secondary;
}

.formWrapper {
  margin-bottom: $spacing-xl;
}

.divider {
  position: relative;
  text-align: center;
  margin: $spacing-xl 0;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 1px;
    background: $color-border;
  }
  
  span {
    position: relative;
    background: $color-background;
    padding: 0 $spacing-lg;
    color: $color-text-muted;
    font-size: $font-size-sm;
  }
}

.socialLogin {
  display: flex;
  flex-direction: column;
  gap: $spacing-md;
  margin-bottom: $spacing-xl;
}

.socialButton {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $spacing-sm;
  width: 100%;
  height: 54px;
  border: 1px solid $color-border;
  border-radius: $radius-lg;
  background: $color-white;
  font-size: $font-size-base;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: all $transition-base;
  
  &:hover {
    border-color: $color-primary;
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }
  
  &:focus-visible {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
  }
}

.formFooter {
  text-align: center;
  
  p {
    color: $color-text-secondary;
    font-size: $font-size-sm;
    margin-bottom: $spacing-md;
  }
}

.textLink {
  color: $color-primary;
  font-weight: $font-weight-semibold;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: underline;
  transition: color $transition-fast;
  
  &:hover {
    color: $color-primary-dark;
  }
  
  &:focus-visible {
    outline: 2px solid $color-primary;
    outline-offset: 2px;
    border-radius: $radius-sm;
  }
}
```

## Week 2: Component States & Accessibility

### 2.1 Enhanced Button Component

**File**: `/shared/ui/Button/Button.tsx`

```tsx
'use client'

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { cn } from '@/shared/lib/utils'
import styles from './Button.module.scss'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  children: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon,
    iconPosition = 'left',
    className,
    disabled,
    children,
    'aria-label': ariaLabel,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading
    
    return (
      <button
        ref={ref}
        className={cn(
          styles.button,
          styles[variant],
          styles[size],
          fullWidth && styles.fullWidth,
          loading && styles.loading,
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
        {...props}
      >
        {loading && (
          <span className={styles.spinner} aria-hidden="true">
            <svg className={styles.spinnerIcon} viewBox="0 0 24 24">
              <circle 
                className={styles.spinnerTrack}
                cx="12" 
                cy="12" 
                r="10" 
                strokeWidth="3"
              />
              <circle 
                className={styles.spinnerFill}
                cx="12" 
                cy="12" 
                r="10" 
                strokeWidth="3"
              />
            </svg>
          </span>
        )}
        
        {icon && iconPosition === 'left' && !loading && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
        
        <span className={styles.text}>
          {loading ? '처리중...' : children}
        </span>
        
        {icon && iconPosition === 'right' && !loading && (
          <span className={styles.icon} aria-hidden="true">
            {icon}
          </span>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
```

### 2.2 Empty State Component

**File**: `/shared/ui/EmptyState/EmptyState.tsx`

```tsx
import Image from 'next/image'
import { Button } from '../Button'
import styles from './EmptyState.module.scss'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ 
  icon = '/images/Common/empty_icon.png',
  title, 
  description, 
  action 
}: EmptyStateProps) {
  return (
    <div className={styles.container} role="status">
      <div className={styles.content}>
        {icon && (
          <div className={styles.icon}>
            <Image 
              src={icon} 
              alt="" 
              width={120} 
              height={120}
              aria-hidden="true"
            />
          </div>
        )}
        
        <h3 className={styles.title}>{title}</h3>
        
        {description && (
          <p className={styles.description}>{description}</p>
        )}
        
        {action && (
          <div className={styles.action}>
            <Button onClick={action.onClick} size="lg">
              {action.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 2.3 Loading Skeleton Component

**File**: `/shared/ui/Skeleton/Skeleton.tsx`

```tsx
import { cn } from '@/shared/lib/utils'
import styles from './Skeleton.module.scss'

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle'
  width?: string | number
  height?: string | number
  count?: number
  className?: string
}

export function Skeleton({ 
  variant = 'rect',
  width,
  height, 
  count = 1,
  className 
}: SkeletonProps) {
  const elements = Array.from({ length: count }, (_, i) => (
    <span
      key={i}
      className={cn(
        styles.skeleton,
        styles[variant],
        className
      )}
      style={{
        width: width || (variant === 'circle' ? height : '100%'),
        height: height || (variant === 'text' ? '1em' : '20px')
      }}
      aria-hidden="true"
    />
  ))
  
  return count > 1 ? (
    <div className={styles.group} role="status" aria-label="로딩 중">
      {elements}
    </div>
  ) : (
    <span role="status" aria-label="로딩 중">
      {elements}
    </span>
  )
}
```

## Week 3: Feature Enhancements

### 3.1 Enhanced Project List with States

**File**: `/widgets/projects/ui/ProjectList.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import { EmptyState } from '@/shared/ui/EmptyState'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Button } from '@/shared/ui/Button'
import styles from './ProjectList.module.scss'

export function ProjectList() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  useEffect(() => {
    fetchProjects()
  }, [])
  
  const fetchProjects = async () => {
    try {
      setLoading(true)
      // API call simulation
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProjects([
        { id: 1, title: '회사 소개 영상', status: 'active', progress: 65 },
        { id: 2, title: '제품 홍보 비디오', status: 'active', progress: 30 },
      ])
    } catch (err) {
      setError('프로젝트를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.toolbar}>
          <Skeleton width={120} height={40} />
          <Skeleton width={80} height={40} />
        </div>
        <div className={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className={styles.card}>
              <Skeleton height={200} />
              <div className={styles.cardContent}>
                <Skeleton variant="text" count={2} />
                <Skeleton height={8} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <EmptyState
        icon="/images/Common/error_icon.png"
        title="오류가 발생했습니다"
        description={error}
        action={{
          label: '다시 시도',
          onClick: fetchProjects
        }}
      />
    )
  }
  
  if (projects.length === 0) {
    return (
      <EmptyState
        title="프로젝트가 없습니다"
        description="첫 번째 프로젝트를 만들어 협업을 시작하세요"
        action={{
          label: '프로젝트 만들기',
          onClick: () => {/* Navigate to create */}
        }}
      />
    )
  }
  
  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.viewToggle} role="group" aria-label="보기 모드">
          <button
            onClick={() => setViewMode('grid')}
            className={viewMode === 'grid' ? styles.active : ''}
            aria-pressed={viewMode === 'grid'}
            aria-label="격자 보기"
          >
            <svg width="20" height="20" aria-hidden="true">
              <use href="#icon-grid" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={viewMode === 'list' ? styles.active : ''}
            aria-pressed={viewMode === 'list'}
            aria-label="목록 보기"
          >
            <svg width="20" height="20" aria-hidden="true">
              <use href="#icon-list" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className={viewMode === 'grid' ? styles.grid : styles.list}>
        {projects.map(project => (
          <article 
            key={project.id} 
            className={styles.card}
            tabIndex={0}
            role="button"
            aria-label={`${project.title} 프로젝트 열기`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                // Navigate to project
              }
            }}
          >
            <h3 className={styles.title}>{project.title}</h3>
            <div className={styles.meta}>
              <span 
                className={styles.status}
                aria-label={`상태: ${getStatusLabel(project.status)}`}
              >
                {getStatusLabel(project.status)}
              </span>
              <span aria-label={`진행률: ${project.progress}%`}>
                {project.progress}%
              </span>
            </div>
            <div 
              className={styles.progress}
              role="progressbar"
              aria-valuenow={project.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div 
                className={styles.progressFill}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: '진행중',
    pending: '대기',
    completed: '완료'
  }
  return labels[status] || status
}
```

## Week 4: Testing & Documentation

### 4.1 E2E Test Implementation

**File**: `/test/e2e/login.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })
  
  test('should display all required elements', async ({ page }) => {
    // Brand section
    await expect(page.getByRole('heading', { name: /영상 콘텐츠/ })).toBeVisible()
    
    // Form elements
    await expect(page.getByRole('heading', { name: '다시 만나서 반가워요!' })).toBeVisible()
    await expect(page.getByLabel('이메일 주소')).toBeVisible()
    await expect(page.getByLabel('비밀번호')).toBeVisible()
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible()
    
    // Social login buttons
    await expect(page.getByRole('button', { name: 'Google 계정으로 로그인' })).toBeVisible()
    await expect(page.getByRole('button', { name: '카카오 계정으로 로그인' })).toBeVisible()
    await expect(page.getByRole('button', { name: '네이버 계정으로 로그인' })).toBeVisible()
  })
  
  test('should show validation errors', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: '로그인' })
    
    // Submit empty form
    await submitButton.click()
    
    // Check for validation messages
    await expect(page.getByText('이메일을 입력해주세요')).toBeVisible()
    await expect(page.getByText('비밀번호를 입력해주세요')).toBeVisible()
    
    // Check ARIA attributes
    const emailInput = page.getByLabel('이메일 주소')
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-describedby', /error/)
  })
  
  test('should navigate with keyboard', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab') // Skip to main
    await page.keyboard.press('Tab') // Email field
    
    const emailInput = page.getByLabel('이메일 주소')
    await expect(emailInput).toBeFocused()
    
    await page.keyboard.press('Tab') // Password field
    const passwordInput = page.getByLabel('비밀번호')
    await expect(passwordInput).toBeFocused()
    
    await page.keyboard.press('Tab') // Remember me
    await page.keyboard.press('Tab') // Login button
    
    const loginButton = page.getByRole('button', { name: '로그인' })
    await expect(loginButton).toBeFocused()
  })
  
  test('should login successfully', async ({ page }) => {
    // Fill form
    await page.getByLabel('이메일 주소').fill('user@example.com')
    await page.getByLabel('비밀번호').fill('ValidPassword123!')
    
    // Submit
    await page.getByRole('button', { name: '로그인' }).click()
    
    // Check loading state
    await expect(page.getByRole('button', { name: '처리중...' })).toBeVisible()
    
    // Check redirect
    await page.waitForURL('/dashboard')
    await expect(page).toHaveURL('/dashboard')
  })
})
```

### 4.2 Accessibility Test Suite

**File**: `/test/a11y/accessibility.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Accessibility Tests', () => {
  test('login page should not have accessibility violations', async ({ page }) => {
    await page.goto('/login')
    await injectAxe(page)
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      }
    })
  })
  
  test('dashboard should be accessible', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByLabel('이메일 주소').fill('test@example.com')
    await page.getByLabel('비밀번호').fill('password')
    await page.getByRole('button', { name: '로그인' }).click()
    await page.waitForURL('/dashboard')
    
    await injectAxe(page)
    await checkA11y(page)
  })
  
  test('color contrast should meet WCAG AA', async ({ page }) => {
    await page.goto('/')
    await injectAxe(page)
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true }
      }
    })
  })
})
```

## Deliverables Checklist

### Week 1 ✓
- [ ] Design tokens SCSS created
- [ ] Global styles updated with accessibility improvements
- [ ] Login page refactored with proper semantics
- [ ] Login SCSS module created

### Week 2 ✓
- [ ] Enhanced Button component with states
- [ ] Empty state component created
- [ ] Loading skeleton component created
- [ ] Form validation improvements

### Week 3 ✓
- [ ] Project list with all states
- [ ] Responsive navigation menu
- [ ] Keyboard navigation support
- [ ] ARIA attributes implementation

### Week 4 ✓
- [ ] E2E tests for critical paths
- [ ] Accessibility test suite
- [ ] Performance optimization
- [ ] Documentation updates

## KPI Tracking

```typescript
// Analytics implementation
window.dataLayer = window.dataLayer || []

// Track task success
function trackTaskSuccess(task: string, success: boolean) {
  window.dataLayer.push({
    event: 'task_completion',
    task_name: task,
    success: success,
    timestamp: Date.now()
  })
}

// Track time to task
function trackTimeToTask(task: string, startTime: number) {
  const duration = Date.now() - startTime
  window.dataLayer.push({
    event: 'task_duration',
    task_name: task,
    duration_ms: duration,
    duration_seconds: duration / 1000
  })
}

// Track drop-off
function trackDropOff(page: string, reason?: string) {
  window.dataLayer.push({
    event: 'page_exit',
    page_name: page,
    exit_reason: reason,
    time_on_page: performance.now()
  })
}
```

## Next Steps

1. **Immediate Actions**:
   - Set up design token system
   - Fix critical accessibility issues
   - Implement loading states

2. **Short Term** (2 weeks):
   - Complete component standardization
   - Add E2E test coverage
   - Deploy accessibility monitoring

3. **Long Term** (1 month):
   - Full design system implementation
   - Complete test coverage
   - Performance optimization

---
*Implementation Guide by Eleanor, UX Lead*  
*Following FSD Architecture & TDD Principles*