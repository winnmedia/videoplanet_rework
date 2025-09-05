import { Metadata } from 'next'

import { SignupForm } from '@/features/auth/ui/SignupFormNew'
import { SocialAuthButtons } from '@/features/auth/ui/SocialAuthButtons'

export const metadata: Metadata = {
  title: '회원가입',
  description: 'VideoPlanet에 가입하여 AI 비디오 제작을 시작하세요'
}

export default function SignupPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          회원가입
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          VideoPlanet과 함께 AI 비디오 제작을 시작하세요
        </p>
      </div>

      <SignupForm />

      <SocialAuthButtons mode="signup" />
    </div>
  )
}