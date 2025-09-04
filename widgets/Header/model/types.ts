/**
 * Header 위젯의 타입 정의
 */

export type HeaderItem = 
  | {
      type: 'img'
      src: string
      className?: string
      onClick?: () => void
    }
  | {
      type: 'string'
      text: string
      className?: string
    }

export interface HeaderProps {
  leftItems?: HeaderItem[]
  rightItems?: HeaderItem[]
  children?: React.ReactNode
}