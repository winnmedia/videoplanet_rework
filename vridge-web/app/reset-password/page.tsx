'use client'

import { ResetPasswordForm } from '@/features/auth/ui/ResetPasswordForm'

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            비밀번호 재설정
          </h1>
          <p className="text-gray-600">
            가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        {/* 폼 컨테이너 */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-xl border border-gray-100">
          <ResetPasswordForm />
        </div>

        {/* 추가 링크 */}
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-500">
            <a 
              href="/login" 
              className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors"
            >
              로그인 페이지로 돌아가기
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}