import React, { useState, useEffect, useCallback } from 'react'
import { Button, Typography } from '@/shared/ui'
import { sendTeamInvite } from '@/shared/api'

// 역할 타입 정의
type UserRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'

// 팀 초대 폼 데이터
interface TeamInviteFormData {
  email: string
  role: UserRole | ''
  message: string
}

interface TeamInviteFormProps {
  projectId: string
  onSuccess?: () => void
  onCancel?: () => void
}

// 역할별 권한 설명
const roleDescriptions: Record<UserRole, string> = {
  owner: '모든 권한을 가지며 프로젝트를 완전히 제어할 수 있습니다',
  admin: '프로젝트 관리 및 팀원 초대 권한을 가집니다',
  editor: '비디오 편집 및 업로드 권한을 가집니다',
  reviewer: '비디오 검토 및 피드백 제공 권한을 가집니다',
  viewer: '비디오 보기 및 댓글 작성만 가능합니다'
}

// 역할별 표시명
const roleDisplayNames: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  editor: 'Editor',
  reviewer: 'Reviewer',
  viewer: 'Viewer'
}

// 이메일 유효성 검사 함수
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const TeamInviteForm: React.FC<TeamInviteFormProps> = ({
  projectId,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState<TeamInviteFormData>({
    email: '',
    role: '',
    message: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // 60초 쿨다운 타이머
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (cooldownSeconds > 0) {
      interval = setInterval(() => {
        setCooldownSeconds(prev => prev - 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [cooldownSeconds])

  // 폼 검증 함수
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요'
    }

    if (!formData.role) {
      newErrors.role = '역할을 선택해주세요'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm() || cooldownSeconds > 0) return

    setIsLoading(true)
    setApiError('')
    setSuccessMessage('')

    try {
      const result = await sendTeamInvite({
        projectId,
        email: formData.email,
        role: formData.role as UserRole,
        message: formData.message || undefined
      })

      setSuccessMessage('초대가 성공적으로 전송되었습니다')
      setCooldownSeconds(60) // 60초 쿨다운 시작
      
      // 폼 초기화
      setFormData({
        email: '',
        role: '',
        message: ''
      })

      onSuccess?.()
    } catch (error: any) {
      const errorMessage = error.message || '초대 전송에 실패했습니다'
      
      if (errorMessage.includes('already invited')) {
        setApiError('이미 초대된 사용자입니다')
      } else {
        setApiError('초대 전송에 실패했습니다')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 입력 필드 변경 핸들러
  const handleChange = (field: keyof TeamInviteFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 에러 초기화
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6 bg-background rounded-lg">
      {/* 폼 제목 */}
      <Typography variant="h3" className="mb-6">
        팀 초대
      </Typography>

      {/* 성공 메시지 */}
      {successMessage && (
        <div className="mb-4 p-3 bg-success-light text-success-dark rounded-md">
          {successMessage}
        </div>
      )}

      {/* API 에러 표시 */}
      {apiError && (
        <div className="mb-4 p-3 bg-danger-light text-danger-dark rounded-md">
          {apiError}
        </div>
      )}

      {/* 이메일 주소 필드 */}
      <div className="mb-4">
        <label htmlFor="invite-email" className="block text-sm font-medium text-foreground mb-2">
          이메일 주소 *
        </label>
        <input
          id="invite-email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          aria-required="true"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="example@company.com"
        />
        {errors.email && (
          <div className="text-danger text-sm mt-1">{errors.email}</div>
        )}
      </div>

      {/* 역할 선택 필드 */}
      <div className="mb-4">
        <label htmlFor="invite-role" className="block text-sm font-medium text-foreground mb-2">
          역할 *
        </label>
        <select
          id="invite-role"
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
          aria-required="true"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">역할을 선택하세요</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
          <option value="editor">Editor</option>
          <option value="reviewer">Reviewer</option>
          <option value="viewer">Viewer</option>
        </select>
        {errors.role && (
          <div className="text-danger text-sm mt-1">{errors.role}</div>
        )}

        {/* 역할 설명 */}
        {formData.role && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md text-sm text-gray-600">
            {roleDescriptions[formData.role as UserRole]}
          </div>
        )}
      </div>

      {/* 초대 메시지 필드 */}
      <div className="mb-6">
        <label htmlFor="invite-message" className="block text-sm font-medium text-foreground mb-2">
          초대 메시지 (선택사항)
        </label>
        <textarea
          id="invite-message"
          value={formData.message}
          onChange={(e) => handleChange('message', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="팀원에게 전달할 메시지를 입력하세요..."
        />
      </div>

      {/* 버튼 그룹 */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          취소
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading || cooldownSeconds > 0}
        >
          {isLoading 
            ? '전송 중...' 
            : cooldownSeconds > 0 
              ? `${cooldownSeconds}초 후 다시 시도`
              : '초대 보내기'
          }
        </Button>
      </div>
    </form>
  )
}