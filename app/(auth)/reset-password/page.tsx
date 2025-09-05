import { Metadata } from 'next'

import { ResetPasswordForm } from '@/features/auth/ui/ResetPasswordFormNew'

export const metadata: Metadata = {
  title: '비밀번호 재설정',
  description: 'VideoPlanet 계정의 비밀번호를 재설정합니다'
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />
}