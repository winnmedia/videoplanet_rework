'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@widgets/Header'

interface ConditionalHeaderProps {
  leftItems: Array<{
    type: 'img' | 'string'
    src?: string
    text?: string
    className: string
  }>
  rightItems: Array<{
    type: 'img' | 'string'
    src?: string
    text?: string
    className: string
  }>
}

export function ConditionalHeader({ leftItems, rightItems }: ConditionalHeaderProps) {
  const pathname = usePathname()
  
  // 랜딩 페이지에서는 헤더를 렌더링하지 않음
  if (pathname === '/') {
    return null
  }
  
  return <Header leftItems={leftItems} rightItems={rightItems} />
}