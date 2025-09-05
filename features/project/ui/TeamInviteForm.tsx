'use client'

import { Clock, Mail, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { useState, KeyboardEvent, useEffect } from 'react'

import { useAppDispatch, useAppSelector } from '@/app/store/store'
import { 
  inviteTeamMember,
  selectIsInviting,
  selectInviteError,
  selectInvitationCooldown,
  clearInviteError
} from '@/entities/project'
import { 
  PROJECT_ROLES, 
  getRoleDisplayName, 
  getRoleDescription,
  type ProjectRole
} from '@/shared/lib/rbac'
import { SendGridService } from '@/shared/lib/sendgrid-service'
import { Button } from '@/shared/ui'

// RBAC 기반 역할 정의
const AVAILABLE_ROLES: Array<{ value: ProjectRole; label: string; description: string }> = [
  { 
    value: 'admin', 
    label: getRoleDisplayName('admin'), 
    description: getRoleDescription('admin')
  },
  { 
    value: 'editor', 
    label: getRoleDisplayName('editor'), 
    description: getRoleDescription('editor')
  },
  { 
    value: 'reviewer', 
    label: getRoleDisplayName('reviewer'), 
    description: getRoleDescription('reviewer')
  },
  { 
    value: 'viewer', 
    label: getRoleDisplayName('viewer'), 
    description: getRoleDescription('viewer')
  }
]

interface TeamInviteFormProps {
  projectId: string
  projectTitle: string
  currentUserRole?: ProjectRole
}

/**
 * 팀원 초대 폼 컴포넌트 (SendGrid + RBAC 통합)
 * DEVPLAN.md 요구사항: 60초 쿨다운, SendGrid API, RBAC 권한 시스템
 */
export function TeamInviteForm({ 
  projectId, 
  projectTitle,
  currentUserRole = 'owner'
}: TeamInviteFormProps) {
  const dispatch = useAppDispatch()
  
  // Redux state
  const isInviting = useAppSelector(selectIsInviting)
  const inviteError = useAppSelector(selectInviteError)
  
  // Local state
  const [emails, setEmails] = useState<string[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [role, setRole] = useState<ProjectRole>('editor')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [invitationSuccess, setInvitationSuccess] = useState<string>('')
  
  // 쿨다운 상태
  const cooldownTime = useAppSelector(selectInvitationCooldown(currentEmail))
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  // 쿨다운 타이머
  useEffect(() => {
    if (cooldownTime) {
      const now = Date.now()
      const remaining = Math.max(0, 60000 - (now - cooldownTime))
      setCooldownRemaining(remaining)
      
      if (remaining > 0) {
        const timer = setInterval(() => {
          const newRemaining = Math.max(0, 60000 - (Date.now() - cooldownTime))
          setCooldownRemaining(newRemaining)
          
          if (newRemaining === 0) {
            clearInterval(timer)
          }
        }, 1000)
        
        return () => clearInterval(timer)
      }
    }
  }, [cooldownTime])

  // 컴포넌트 언마운트 시 에러 클리어
  useEffect(() => {
    return () => {
      dispatch(clearInviteError())
    }
  }, [dispatch])

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

  // 폼 제출 (Redux + SendGrid)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const trimmedEmail = currentEmail.trim().toLowerCase()
    
    if (!trimmedEmail) {
      setError('이메일 주소를 입력해주세요')
      return
    }
    
    if (!validateEmail(trimmedEmail)) {
      setError('유효한 이메일 주소를 입력해주세요')
      return
    }
    
    // 쿨다운 확인
    if (cooldownRemaining > 0) {
      setError(`${Math.ceil(cooldownRemaining / 1000)}초 후에 다시 시도할 수 있습니다`)
      return
    }
    
    setError('')
    setInvitationSuccess('')
    
    try {
      // Redux async thunk 호출
      const result = await dispatch(inviteTeamMember({
        projectId,
        invitation: {
          email: trimmedEmail,
          role: role as 'editor' | 'viewer', // API 호환성을 위한 타입 변환
          message: message || undefined
        }
      }))
      
      if (inviteTeamMember.fulfilled.match(result)) {
        setInvitationSuccess(`${trimmedEmail}로 초대 이메일이 전송되었습니다.`)
        // 폼 초기화
        setCurrentEmail('')
        setMessage('')
        setRole('editor')
      } else if (inviteTeamMember.rejected.match(result)) {
        // 에러는 Redux state에서 관리되지만 로컬 상태도 업데이트
        console.error('초대 전송 실패:', result.payload)
      }
      
    } catch (error) {
      console.error('초대 전송 중 예외 발생:', error)
      setError('초대 전송에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 기본 만료일 (30일 후)
  const defaultExpiryDate = new Date()
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30)
  const defaultExpiryDateString = defaultExpiryDate.toISOString().split('T')[0]

  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin'
  const isFormDisabled = isInviting || cooldownRemaining > 0

  return (
    <div className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
      <div className="flex items-center mb-4">
        <Mail className="w-5 h-5 text-primary mr-2" />
        <h3 className="text-lg font-medium text-gray-900">팀원 초대</h3>
        
        {/* 권한 인디케이터 */}
        {!canInvite && (
          <div className="ml-3 flex items-center text-amber-600">
            <Shield className="w-4 h-4 mr-1" />
            <span className="text-sm">권한 필요</span>
          </div>
        )}
      </div>

      {!canInvite ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
            <p className="text-sm text-amber-800">
              팀원을 초대하려면 소유자 또는 관리자 권한이 필요합니다.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 성공 메시지 */}
          {invitationSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <p className="text-sm text-green-800">{invitationSuccess}</p>
              </div>
            </div>
          )}

          {/* Redux 에러 메시지 */}
          {inviteError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-sm text-red-800">{inviteError}</p>
              </div>
            </div>
          )}

          {/* 이메일 입력 */}
          <div>
            <label htmlFor="email-input" className="block text-sm font-medium text-gray-700 mb-2">
              이메일 주소 <span className="text-red-500">*</span>
            </label>
            
            <div className="relative">
              <input
                id="email-input"
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                placeholder="초대할 팀원의 이메일을 입력하세요"
                disabled={isFormDisabled}
                className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  isFormDisabled 
                    ? 'bg-gray-50 text-gray-500 border-gray-200' 
                    : 'border-gray-300'
                } ${error ? 'border-red-500' : ''}`}
                aria-label="이메일 주소"
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              
              {/* 쿨다운 표시 */}
              {cooldownRemaining > 0 && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center text-orange-600">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">
                    {Math.ceil(cooldownRemaining / 1000)}s
                  </span>
                </div>
              )}
            </div>
            
            {error && (
              <p className="mt-1 text-sm text-red-600 flex items-center" role="alert">
                <AlertCircle className="w-4 h-4 mr-1" />
                {error}
              </p>
            )}
          </div>

          {/* 역할 선택 */}
          <div>
            <label htmlFor="role-select" className="block text-sm font-medium text-gray-700 mb-2">
              역할 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {AVAILABLE_ROLES.map((roleOption) => (
                <label key={roleOption.value} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="role"
                    value={roleOption.value}
                    checked={role === roleOption.value}
                    onChange={(e) => setRole(e.target.value as ProjectRole)}
                    disabled={isFormDisabled}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{roleOption.label}</div>
                    <div className="text-sm text-gray-500">{roleOption.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 초대 메시지 (선택사항) */}
          <div>
            <label htmlFor="invite-message" className="block text-sm font-medium text-gray-700 mb-2">
              초대 메시지 (선택사항)
            </label>
            <textarea
              id="invite-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="팀원에게 전달할 개인적인 메시지를 입력하세요"
              disabled={isFormDisabled}
              rows={3}
              maxLength={500}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none ${
                isFormDisabled 
                  ? 'bg-gray-50 text-gray-500 border-gray-200' 
                  : 'border-gray-300'
              }`}
            />
            <div className="mt-1 text-right text-sm text-gray-500">
              {message.length}/500자
            </div>
          </div>

          {/* 60초 쿨다운 안내 */}
          {cooldownRemaining === 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center text-blue-800">
                <Clock className="w-4 h-4 mr-2" />
                <p className="text-sm">
                  초대 이메일 전송 후 동일한 이메일로 60초간 재전송이 제한됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button
              type="submit"
              variant="primary"
              disabled={!currentEmail.trim() || isFormDisabled}
              className="min-w-32"
            >
              {isInviting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  전송 중...
                </div>
              ) : (
                '초대 보내기'
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}