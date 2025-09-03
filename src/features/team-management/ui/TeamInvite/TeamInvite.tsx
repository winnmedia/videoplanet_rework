import React, { useState } from 'react'
import { Button, Typography, Input } from '@/shared/ui'
import { teamApi } from '@/shared/api'

// 팀 초대 폼 데이터 타입 정의
interface TeamInviteFormData {
  email: string
  role: 'admin' | 'editor' | 'viewer' | ''
  message: string
}

// 팀 초대 컴포넌트 Props 인터페이스
export interface TeamInviteProps {
  projectId: string
  onSuccess?: (inviteData: any) => void
  onCancel?: () => void
}

// 이메일 검증 함수
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 팀 초대 컴포넌트
export const TeamInvite: React.FC<TeamInviteProps> = ({
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

  // 폼 검증 함수
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.email.trim()) {
      newErrors.email = '이메일 주소를 입력해주세요'
    } else if (!validateEmail(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요'
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
    
    if (!validateForm()) return

    setIsLoading(true)
    setApiError('')

    try {
      const inviteData = {
        projectId,
        email: formData.email,
        role: formData.role,
        message: formData.message
      }

      const result = await teamApi.sendInvitation(inviteData)
      onSuccess?.(result)
      
      // 성공 시 폼 초기화
      setFormData({
        email: '',
        role: '',
        message: ''
      })
    } catch (error) {
      setApiError('초대 전송에 실패했습니다')
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
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 bg-background rounded-lg border border-gray-200">
      {/* 폼 제목 */}
      <Typography variant="h3" className="mb-6">
        팀 멤버 초대
      </Typography>

      {/* API 에러 표시 */}
      {apiError && (
        <div 
          role="alert"
          className="mb-4 p-3 bg-danger-light text-danger-dark rounded-md border border-danger-light"
        >
          {apiError}
        </div>
      )}

      {/* 이메일 주소 필드 */}
      <div className="mb-4">
        <Input
          label="이메일 주소"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          required
          error={errors.email}
          helperText="초대할 팀 멤버의 이메일 주소를 입력하세요"
        />
      </div>

      {/* 역할 선택 필드 */}
      <div className="mb-4">
        <label 
          htmlFor="invite-role" 
          className="block text-sm font-medium text-foreground mb-2"
        >
          역할 *
        </label>
        <select
          id="invite-role"
          value={formData.role}
          onChange={(e) => handleChange('role', e.target.value)}
          aria-required="true"
          aria-invalid={!!errors.role}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        >
          <option value="">역할을 선택하세요</option>
          <option value="admin">관리자 - 모든 권한</option>
          <option value="editor">편집자 - 편집 권한</option>
          <option value="viewer">뷰어 - 보기 권한만</option>
        </select>
        {errors.role && (
          <div 
            role="alert" 
            className="text-danger text-sm mt-1"
            aria-live="polite"
          >
            {errors.role}
          </div>
        )}
      </div>

      {/* 초대 메시지 필드 */}
      <div className="mb-6">
        <Input
          label="초대 메시지 (선택사항)"
          value={formData.message}
          onChange={(e) => handleChange('message', e.target.value)}
          multiline
          rows={3}
          placeholder="프로젝트 참여에 대한 간단한 메시지를 작성해보세요..."
        />
      </div>

      {/* 역할 설명 섹션 */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <Typography variant="h6" className="mb-2">
          역할별 권한 안내
        </Typography>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between">
            <span className="font-medium text-primary">관리자:</span>
            <span>프로젝트 설정, 멤버 관리, 모든 편집 권한</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-secondary">편집자:</span>
            <span>콘텐츠 편집, 댓글 작성, 파일 업로드</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-500">뷰어:</span>
            <span>보기, 댓글 작성만 가능</span>
          </div>
        </div>
      </div>

      {/* 버튼 그룹 */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          취소
        </Button>
        <Button
          type="submit"
          loading={isLoading}
          disabled={isLoading}
        >
          {isLoading ? '초대 중...' : '초대 보내기'}
        </Button>
      </div>
    </form>
  )
}