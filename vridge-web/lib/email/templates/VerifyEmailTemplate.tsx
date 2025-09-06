import {
  Button,
  Container,
  Heading,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

import { BaseEmailTemplate } from './BaseEmailTemplate'

interface VerifyEmailTemplateProps {
  verificationCode: string
  userEmail: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'

export const VerifyEmailTemplate: React.FC<VerifyEmailTemplateProps> = ({
  verificationCode,
  userEmail,
}) => {
  return (
    <BaseEmailTemplate
      preview="VLANET 이메일 인증 - 비디오 피드백 플랫폼에 오신 것을 환영합니다!"
      heading="이메일 인증"
    >
      <Container className="text-center">
        <Heading className="text-2xl font-semibold text-gray-800 mb-4">
          환영합니다!
        </Heading>
        
        <Text className="text-gray-600 text-lg mb-6">
          <strong>VLANET</strong>은 혁신적인 비디오 피드백 플랫폼입니다.
          <br />
          실시간 협업과 스마트한 피드백으로 창작의 새로운 경험을 시작하세요.
        </Text>

        <Section className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-8 mb-6">
          <Text className="text-gray-700 mb-4">
            아래 6자리 인증번호를 입력해주세요
          </Text>
          
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-4xl font-bold py-6 px-4 rounded-lg tracking-widest shadow-lg">
            {verificationCode}
          </div>
          
          <Text className="text-red-600 text-sm mt-4 font-medium">
            ⏰ 10분 후 만료
          </Text>
        </Section>

        <Section className="bg-gray-50 rounded-lg p-6 mb-6">
          <Heading className="text-lg font-semibold text-gray-800 mb-4">
            🎯 VLANET으로 할 수 있는 것들
          </Heading>
          <ul className="text-left text-gray-600 space-y-2">
            <li>• 실시간 비디오 피드백 및 협업</li>
            <li>• AI 기반 스마트 피드백 분석</li>
            <li>• 프로젝트 관리 및 버전 컨트롤</li>
          </ul>
        </Section>

        <Button
          href={`${baseUrl}/signup`}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg"
        >
          🚀 회원가입 계속하기
        </Button>

        <Section className="bg-red-50 border-l-4 border-red-500 p-4 mt-6 text-left">
          <Text className="text-red-800 text-sm">
            <strong>🔒 보안 안내:</strong> 본인이 요청하지 않은 경우, 이 메일을 무시하고{' '}
            <a href="mailto:security@vlanet.net" className="text-blue-600">
              security@vlanet.net
            </a>
            으로 신고해주세요.
          </Text>
        </Section>
      </Container>
    </BaseEmailTemplate>
  )
}