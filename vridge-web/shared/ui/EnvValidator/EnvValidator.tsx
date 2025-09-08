/**
 * 환경 변수 검증 컴포넌트
 * 앱 시작 시 환경 변수를 자동 검증하고 설정 가이드를 제공
 * FSD 아키텍처: shared/ui 레이어
 */

'use client'

import { useEffect, useState } from 'react'
import { checkEnvHealth } from '@/shared/lib/env-validation'
import { checkSendGridHealth } from '@/shared/lib/env-validation/sendgrid'

interface EnvValidatorProps {
  children: React.ReactNode
}

interface EnvError {
  service: string
  message: string
  suggestions?: string[]
}

/**
 * 환경 변수 검증 및 오류 처리 컴포넌트
 */
export function EnvValidator({ children }: EnvValidatorProps) {
  const [envErrors, setEnvErrors] = useState<EnvError[]>([])
  const [isValidating, setIsValidating] = useState(true)

  useEffect(() => {
    const validateEnvironment = async () => {
      const errors: EnvError[] = []

      try {
        // 전체 환경 변수 상태 확인 (개발환경에서만 로그 출력)
        checkEnvHealth()
      } catch (error) {
        errors.push({
          service: '환경 변수',
          message: `환경 변수 검증 실패: ${error instanceof Error ? error.message : 'Unknown error'}`,
          suggestions: [
            '.env.local 파일에 필요한 환경 변수가 설정되었는지 확인하세요',
            'CLAUDE.md 문서의 환경 변수 가이드를 참조하세요',
          ],
        })
      }

      // SendGrid 전용 검증
      try {
        if (process.env.NODE_ENV === 'development') {
          checkSendGridHealth()
        } else {
          // 프로덕션에서는 조용한 검증만 수행
          const { validateSendGridEnv } = await import('@/shared/lib/env-validation/sendgrid')
          validateSendGridEnv()
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown SendGrid error'
        
        errors.push({
          service: 'SendGrid',
          message: errorMessage,
          suggestions: [
            'SENDGRID_API_KEY 환경 변수를 확인하세요 (SG.로 시작해야 함)',
            'SENDGRID_FROM_EMAIL에 유효한 이메일 주소를 설정하세요',
            'SendGrid 대시보드에서 발신자 인증을 완료하세요',
            'Vercel 환경 변수 설정을 확인하세요',
          ],
        })
      }

      setEnvErrors(errors)
      setIsValidating(false)
    }

    validateEnvironment()
  }, [])

  // 프로덕션에서는 에러가 있어도 앱을 계속 실행
  // 개발환경에서는 에러 정보를 표시
  if (process.env.NODE_ENV === 'development' && envErrors.length > 0) {
    return (
      <div className="min-h-screen bg-red-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg">⚠️</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-red-800">
                  환경 변수 설정 필요
                </h3>
                <p className="text-red-600">
                  개발을 시작하기 전에 다음 환경 변수 문제를 해결해주세요.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {envErrors.map((error, index) => (
                <div key={index} className="bg-red-50 rounded-md p-4">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    {error.service} 오류
                  </h4>
                  <p className="text-sm text-red-700 mb-3">{error.message}</p>
                  
                  {error.suggestions && (
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-2">해결 방법:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {error.suggestions.map((suggestion, suggestionIndex) => (
                          <li key={suggestionIndex} className="text-sm text-red-700">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                환경 변수 설정 가이드
              </h4>
              <div className="text-sm text-blue-700">
                <p className="mb-2">프로젝트 루트에 <code>.env.local</code> 파일을 생성하고 다음 변수들을 설정하세요:</p>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{`# SendGrid 이메일 서비스
SENDGRID_API_KEY=SG.your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=YourAppName
VERIFIED_SENDER=noreply@yourdomain.com`}
                </pre>
              </div>
            </div>

            <div className="mt-6 flex space-x-4">
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
              >
                다시 확인
              </button>
              <button
                onClick={() => setEnvErrors([])}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
              >
                무시하고 계속 (권장하지 않음)
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 검증 중일 때 로딩 표시 (개발환경에서만)
  if (process.env.NODE_ENV === 'development' && isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 flex items-center space-x-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div>
            <p className="text-gray-900 font-medium">환경 변수 검증 중...</p>
            <p className="text-gray-600 text-sm">앱을 안전하게 시작하기 위해 설정을 확인하고 있습니다.</p>
          </div>
        </div>
      </div>
    )
  }

  // 검증 완료 또는 프로덕션 환경에서는 정상적으로 앱 렌더링
  return <>{children}</>
}