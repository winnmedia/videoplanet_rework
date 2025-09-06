'use client'

import { PlusCircle, Users, Calendar, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import React from 'react'

interface QuickAction {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  color: string
}

const quickActions: QuickAction[] = [
  {
    id: 'new-project',
    label: '새 프로젝트',
    href: '/projects/create',
    icon: PlusCircle,
    description: '새로운 비디오 프로젝트를 시작하세요',
    color: 'bg-vridge-50 text-vridge-700 hover:bg-vridge-100'
  },
  {
    id: 'invite-team',
    label: '팀원 초대',
    href: '/projects/manage?tab=team',
    icon: Users,
    description: '협업할 팀원을 초대하세요',
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100'
  },
  {
    id: 'calendar',
    label: '일정 관리',
    href: '/calendar',
    icon: Calendar,
    description: '프로젝트 일정을 확인하세요',
    color: 'bg-green-50 text-green-700 hover:bg-green-100'
  },
  {
    id: 'analytics',
    label: '분석',
    href: '/dashboard?tab=analytics',
    icon: BarChart3,
    description: '프로젝트 진행 상황을 분석하세요',
    color: 'bg-purple-50 text-purple-700 hover:bg-purple-100'
  }
]

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {quickActions.map((action) => {
        const Icon = action.icon
        return (
          <Link
            key={action.id}
            href={action.href}
            className={`p-4 rounded-lg transition-colors ${action.color}`}
          >
            <div className="flex flex-col items-center text-center space-y-2">
              <Icon className="w-8 h-8" />
              <span className="font-medium text-sm">{action.label}</span>
              <span className="text-xs opacity-70">{action.description}</span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}