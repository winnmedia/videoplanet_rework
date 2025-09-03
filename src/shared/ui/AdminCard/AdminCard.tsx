import { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

const adminCardVariants = cva(
  'bg-background-card border border-border-light rounded-admin shadow-admin-card transition-shadow duration-200',
  {
    variants: {
      size: {
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      variant: {
        default: 'hover:shadow-admin-hover',
        interactive: 'hover:shadow-admin-hover cursor-pointer',
        danger: 'border-admin-error bg-red-50',
        warning: 'border-admin-warning bg-amber-50',
        success: 'border-admin-success bg-green-50',
        info: 'border-admin-info bg-blue-50',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      fullWidth: true,
    },
  }
)

export interface AdminCardProps extends VariantProps<typeof adminCardVariants> {
  /** 카드 내용 */
  children: ReactNode
  /** 카드 헤더 제목 */
  title?: string
  /** 카드 헤더 액션 버튼 */
  action?: ReactNode
  /** 추가 CSS 클래스 */
  className?: string
  /** 클릭 이벤트 핸들러 */
  onClick?: () => void
  /** 접근성을 위한 역할 */
  role?: string
  /** 접근성을 위한 라벨 */
  'aria-label'?: string
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

export function AdminCard({
  children,
  title,
  action,
  size,
  variant,
  fullWidth,
  className,
  onClick,
  role = 'region',
  'aria-label': ariaLabel,
  'data-testid': testId,
  ...props
}: AdminCardProps) {
  const Component = onClick ? 'button' : 'div'
  
  return (
    <Component
      className={clsx(adminCardVariants({ size, variant, fullWidth }), className)}
      onClick={onClick}
      role={role}
      aria-label={ariaLabel || title}
      data-testid={testId}
      {...props}
    >
      {(title || action) && (
        <header className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-neutral-900">
              {title}
            </h3>
          )}
          {action && (
            <div className="flex items-center gap-2">
              {action}
            </div>
          )}
        </header>
      )}
      
      <div className="text-sm text-neutral-700">
        {children}
      </div>
    </Component>
  )
}

export default AdminCard