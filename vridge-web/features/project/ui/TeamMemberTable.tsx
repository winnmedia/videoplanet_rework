'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/shared/ui'

type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked'

interface TeamInvite {
  id: string
  email: string
  role: string
  status: InviteStatus
  expiryDate: string
  sentAt: string
  lastSentAt?: string | null
}

interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  joinedAt: string
  avatar?: string | null
}

interface TeamMemberTableProps {
  invites: TeamInvite[]
  members: TeamMember[]
  onResendInvite: (inviteId: string) => void
  onRevokeInvite: (inviteId: string) => void
  onRemoveMember: (memberId: string) => void
  cooldownSeconds?: number
}

/**
 * 팀원 초대 및 멤버 관리 테이블 컴포넌트
 * 초대 상태 추적, 재전송/철회, 검색/필터 기능
 */
export function TeamMemberTable({ 
  invites, 
  members, 
  onResendInvite, 
  onRevokeInvite, 
  onRemoveMember,
  cooldownSeconds = 60
}: TeamMemberTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | InviteStatus>('all')
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})

  // 검색 및 필터링
  const filteredInvites = useMemo(() => {
    return invites.filter(invite => {
      const matchesSearch = invite.email.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || invite.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [invites, searchTerm, statusFilter])

  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      return member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
             member.name.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [members, searchTerm])

  // 상태별 배지 스타일
  const getStatusBadge = (status: InviteStatus) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      revoked: 'bg-gray-100 text-gray-800'
    }

    const labels = {
      pending: '대기중',
      accepted: '수락됨',
      expired: '만료됨',
      revoked: '철회됨'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${badges[status]}`}>
        {labels[status]}
      </span>
    )
  }

  // 재전송 핸들러 (쿨다운 적용)
  const handleResendInvite = (inviteId: string) => {
    onResendInvite(inviteId)
    
    // 쿨다운 시작
    setCooldowns(prev => ({ ...prev, [inviteId]: cooldownSeconds }))
    
    const timer = setInterval(() => {
      setCooldowns(prev => {
        const newCooldowns = { ...prev }
        if (newCooldowns[inviteId] > 1) {
          newCooldowns[inviteId] -= 1
        } else {
          delete newCooldowns[inviteId]
          clearInterval(timer)
        }
        return newCooldowns
      })
    }, 1000)
  }

  // 철회 확인 핸들러
  const handleRevokeInvite = (inviteId: string) => {
    if (window.confirm('정말 초대를 철회하시겠습니까?')) {
      onRevokeInvite(inviteId)
    }
  }

  // 멤버 제거 확인 핸들러
  const handleRemoveMember = (memberId: string) => {
    if (window.confirm('정말 팀에서 제거하시겠습니까?')) {
      onRemoveMember(memberId)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* 검색 및 필터 헤더 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* 상태 필터 */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | InviteStatus)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              aria-label="상태 필터"
            >
              <option value="all">모든 상태</option>
              <option value="pending">대기중</option>
              <option value="accepted">수락됨</option>
              <option value="expired">만료됨</option>
              <option value="revoked">철회됨</option>
            </select>
          </div>
        </div>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                사용자
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                역할
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                날짜
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                작업
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {/* 멤버 목록 */}
            {filteredMembers.map((member) => (
              <tr key={`member-${member.id}`}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      {member.avatar ? (
                        <img
                          className="h-8 w-8 rounded-full"
                          src={member.avatar}
                          alt=""
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{member.role}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    활성
                  </span>
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="text-red-600 hover:text-red-900"
                    aria-label={`${member.name} 제거`}
                  >
                    제거
                  </button>
                </td>
              </tr>
            ))}
            
            {/* 초대 목록 */}
            {filteredInvites.map((invite) => (
              <tr key={`invite-${invite.id}`}>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8">
                      <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {invite.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">{invite.email}</div>
                      <div className="text-sm text-gray-500">초대됨</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{invite.role}</div>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {getStatusBadge(invite.status)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(invite.sentAt).toLocaleDateString('ko-KR')}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {invite.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResendInvite(invite.id)}
                          disabled={!!cooldowns[invite.id]}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400"
                          aria-label={`${invite.email} 초대 재전송`}
                          title={cooldowns[invite.id] ? `${cooldowns[invite.id]}초 후 재전송 가능` : ''}
                        >
                          {cooldowns[invite.id] ? `재전송 (${cooldowns[invite.id]}s)` : '재전송'}
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="text-red-600 hover:text-red-900"
                          aria-label={`${invite.email} 초대 철회`}
                        >
                          철회
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 빈 상태 */}
      {filteredInvites.length === 0 && filteredMembers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다.' : '아직 팀원이 없습니다.'}
          </p>
        </div>
      )}
    </div>
  )
}