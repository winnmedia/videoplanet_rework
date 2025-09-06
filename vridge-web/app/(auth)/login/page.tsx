import { Metadata } from 'next'

import { LoginForm } from '@/features/auth/ui/LoginForm'
import { SocialAuthButtons } from '@/features/auth/ui/SocialAuthButtons'

export const metadata: Metadata = {
  title: '로그인',
  description: 'VideoPlanet에 로그인하여 AI 비디오 제작을 시작하세요'
}

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          로그인
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          계정에 로그인하여 비디오 제작을 시작하세요
        </p>
      </div>

      <LoginForm />

      <SocialAuthButtons mode="login" />
    </div>
  )
}