'use client'

import { usePathname } from 'next/navigation'

import { Header, type HeaderItem } from '@widgets/Header'

interface ConditionalHeaderProps {
  leftItems?: HeaderItem[]
  rightItems?: HeaderItem[]
}

export function ConditionalHeader({ leftItems, rightItems }: ConditionalHeaderProps) {
  const pathname = usePathname()
  
  // 인증 관련 페이지에서는 헤더를 렌더링하지 않음
  const authPages = ['/', '/login', '/signup', '/reset-password', '/forgot-password']
  if (authPages.includes(pathname)) {
    return null
  }
  
  return <Header leftItems={leftItems} rightItems={rightItems} />
}