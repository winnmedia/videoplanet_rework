// Public API for shared UI components
// 기존 컴포넌트들 (레거시)
export { Button } from './Button/Button'
export { Input } from './Input/Input'
export { Select } from './Select/Select'
export { StoreProvider } from './StoreProvider/StoreProvider'
export { EmptyState } from './EmptyState/EmptyState'
// export { Skeleton, SkeletonCard, SkeletonList } from './Skeleton/Skeleton'

// 모던 컴포넌트들 (React 19 + Tailwind CSS)
export { Modal } from './Modal'
export { Dropdown } from './Dropdown'
export { Form, FormField, FormGroup } from './Form'
export { Card } from './Card'

// 4개 모듈용 공통 컴포넌트들
export { LoadingSpinner } from './LoadingSpinner/LoadingSpinner'
export { ErrorBoundary } from './ErrorBoundary/ErrorBoundary'
// export { ConfirmModal } from './ConfirmModal/ConfirmModal'
// export { Toast, ToastContainer, toast } from './Toast/Toast'
// Legacy Card는 주석 처리 (Modern Card 사용)
export { SubMenu } from './SubMenu/SubMenu'
export { SubMenuImproved } from './SubMenu/SubMenu.improved'
// export { MenuButton } from './MenuButton/MenuButton'
export { MenuButtonImproved } from './MenuButton/MenuButton.improved'
export { GlobalSubMenu } from './GlobalSubMenu/GlobalSubMenu'
export { NotificationCenter } from './NotificationCenter/NotificationCenter'
// export { Badge } from './Badge/Badge'  // TODO: Badge 컴포넌트 구현 필요  
// export { ProgressBar } from './ProgressBar/ProgressBar'  // TODO: ProgressBar 컴포넌트 구현 필요

// 컴포넌트 타입들
// 모던 컴포넌트 타입
export type { ModalProps } from './Modal'
export type { DropdownProps, DropdownOption } from './Dropdown'
export type { FormProps, FormFieldProps, FormGroupProps, FormData, FormErrors, FormOption, ValidateFunction } from './Form'

// 기존 컴포넌트 타입
export type { LoadingSpinnerProps } from './LoadingSpinner/LoadingSpinner'
export type { ErrorBoundaryProps } from './ErrorBoundary/ErrorBoundary'
export type { ConfirmModalProps } from './ConfirmModal/ConfirmModal'
export type { ToastProps, ToastContainerProps, ToastType } from './Toast/Toast'
export type { CardProps } from './Card/Card'
export type { GlobalSubMenuProps, GlobalSubMenuItem } from './GlobalSubMenu/types'
export type { NotificationCenterProps, Notification } from './NotificationCenter/types'
// export type { BadgeProps } from './Badge/Badge'  // TODO: Badge 컴포넌트 구현 필요
// export type { ProgressBarProps } from './ProgressBar/ProgressBar'  // TODO: ProgressBar 컴포넌트 구현 필요