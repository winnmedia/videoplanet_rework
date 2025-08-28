'use client'

import { useState, KeyboardEvent } from 'react'
import { Button } from '@/shared/ui'

const ROLES = [
  { value: 'Owner', label: '소유자' },
  { value: 'Admin', label: '관리자' },
  { value: 'Editor', label: '편집자' },
  { value: 'Reviewer', label: '검토자' },
  { value: 'Viewer', label: '뷰어' }
]

interface TeamInviteData {
  emails: string[]
  role: string
  expiryDate: string
}

interface TeamInviteFormProps {
  onInvite: (data: TeamInviteData) => void
}

/**
 * 팀원 초대 폼 컴포넌트
 * 이메일 칩, 역할 선택, 만료일 지정 기능
 */
export function TeamInviteForm({ onInvite }: TeamInviteFormProps) {
  const [emails, setEmails] = useState<string[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [role, setRole] = useState('Editor')
  const [expiryDate, setExpiryDate] = useState('')
  const [error, setError] = useState('')

  // 이메일 유효성 검증
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 이메일 추가
  const addEmail = (email: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    
    if (!trimmedEmail) return
    
    if (!validateEmail(trimmedEmail)) {
      setError('유효한 이메일 주소를 입력해주세요')
      return
    }
    
    if (emails.includes(trimmedEmail)) {
      setError('이미 추가된 이메일입니다')
      return
    }
    
    setEmails(prev => [...prev, trimmedEmail])
    setCurrentEmail('')
    setError('')
  }

  // 이메일 제거
  const removeEmail = (emailToRemove: string) => {
    setEmails(prev => prev.filter(email => email !== emailToRemove))
  }

  // Enter 키 처리
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addEmail(currentEmail)
    }
  }

  // 폼 제출
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // 현재 입력된 이메일이 있으면 추가
    if (currentEmail.trim()) {
      addEmail(currentEmail)
    }
    
    if (emails.length === 0 && !currentEmail.trim()) {
      setError('최소 하나의 이메일을 입력해주세요')
      return
    }
    
    const finalEmails = currentEmail.trim() && validateEmail(currentEmail.trim()) 
      ? [...emails, currentEmail.trim().toLowerCase()]
      : emails

    onInvite({
      emails: finalEmails,
      role,
      expiryDate
    })

    // 폼 초기화
    setEmails([])
    setCurrentEmail('')
    setExpiryDate('')
    setError('')
  }

  // 기본 만료일 (30일 후)
  const defaultExpiryDate = new Date()
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30)
  const defaultExpiryDateString = defaultExpiryDate.toISOString().split('T')[0]

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-medium text-gray-900 mb-4">팀원 초대</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 이메일 입력 및 칩 */}
        <div>
          <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-2">
            이메일 주소 <span className="text-red-500">*</span>
          </label>
          
          {/* 이메일 칩들 */}
          {emails.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {emails.map((email, index) => (
                <div
                  key={index}
                  className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {email}
                  <button
                    type="button"
                    onClick={() => removeEmail(email)}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                    aria-label={`${email} 제거`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* 이메일 입력 필드 */}
          <input
            id="email-input"
            type="email"
            value={currentEmail}
            onChange={(e) => setCurrentEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="이메일을 입력하고 Enter를 누르세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="이메일 주소"
          />
          
          {error && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* 역할 선택 */}
        <div>
          <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">
            역할 <span className="text-red-500">*</span>
          </label>
          <select
            id="role-select"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="역할"
          >
            {ROLES.map((roleOption) => (
              <option key={roleOption.value} value={roleOption.value}>
                {roleOption.label}
              </option>
            ))}
          </select>
        </div>

        {/* 만료일 */}
        <div>
          <label htmlFor="expiry-date" className="block text-sm font-medium text-gray-700 mb-2">
            만료일
          </label>
          <input
            id="expiry-date"
            type="date"
            value={expiryDate || defaultExpiryDateString}
            onChange={(e) => setExpiryDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="만료일"
          />
          <p className="mt-1 text-sm text-gray-500">
            기본값: 30일 후 ({defaultExpiryDateString})
          </p>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={emails.length === 0 && !currentEmail.trim()}
          >
            초대 보내기
          </Button>
        </div>
      </form>
    </div>
  )
}