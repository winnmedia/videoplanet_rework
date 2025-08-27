'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'

import type { HeaderProps, HeaderItem } from '../model/types'

/**
 * Header 위젯 컴포넌트
 * FSD 아키텍처의 widgets 레이어에 위치
 */
export function Header({ leftItems = [], rightItems = [] }: HeaderProps) {
  const router = useRouter()

  const renderItem = (item: HeaderItem, index: number) => {
    if (item.type === 'img') {
      return (
        <div key={index} className={item.className}>
          <Image
            src={item.src}
            alt={`header-img-${index}`}
            width={150}
            height={40}
            className="cursor-pointer"
            onClick={item.onClick ?? (() => router.push('/dashboard'))}
            priority
          />
        </div>
      )
    }

    if (item.type === 'string') {
      return (
        <div key={index} className={item.className}>
          {item.text}
        </div>
      )
    }

    return null
  }

  // 프로필 섹션 특별 처리
  const renderRightSection = () => {
    const nickIndex = rightItems.findIndex(item => 
      item.type === 'string' && item.className?.includes('nick')
    )
    
    if (nickIndex !== -1) {
      const nickItem = rightItems[nickIndex] as Extract<HeaderItem, { type: 'string' }>
      const mailItem = rightItems[nickIndex + 1]
      
      return (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center text-white text-base">
            {nickItem.text}
          </div>
          {mailItem?.type === 'string' && (
            <span className="text-sm text-gray-600">
              {mailItem.text}
            </span>
          )}
        </div>
      )
    }
    
    return <>{rightItems.map(renderItem)}</>
  }

  return (
    <header className="flex items-center justify-between h-20 px-8 bg-white border-b border-gray-200">
      <div className="flex items-center space-x-4">
        {leftItems.map(renderItem)}
      </div>
      
      <div className="flex items-center space-x-3">
        {renderRightSection()}
      </div>
    </header>
  )
}