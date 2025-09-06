import {
  Button,
  Container,
  Heading,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

import { BaseEmailTemplate } from './BaseEmailTemplate'

interface ResetPasswordTemplateProps {
  resetCode: string
  userEmail: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'

export const ResetPasswordTemplate: React.FC<ResetPasswordTemplateProps> = ({
  resetCode,
  userEmail,
}) => {
  return (
    <BaseEmailTemplate
      preview="VLANET 비밀번호 재설정 - 보안 인증번호"
      heading="비밀번호 재설정"
    >
      <Container className="text-center">
        <div className="bg-red-100 text-red-600 text-5xl rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          🔐
        </div>
        
        <Heading className="text-2xl font-semibold text-gray-800 mb-4">
          비밀번호 재설정 요청
        </Heading>
        
        <Text className="text-gray-600 text-lg mb-6">
          <strong>{userEmail}</strong> 계정의 비밀번호 재설정을 요청하셨습니다.
          <br />
          아래 인증번호를 입력하여 새로운 비밀번호를 설정하세요.
        </Text>

        <Section className="bg-red-50 rounded-xl p-8 mb-6 border-2 border-red-200">
          <Text className="text-red-800 font-semibold mb-4">
            보안 인증번호
          </Text>
          
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white text-4xl font-bold py-6 px-4 rounded-lg tracking-widest shadow-lg">
            {resetCode}
          </div>
          
          <Text className="text-red-600 text-sm mt-4 font-medium">
            ⏰ 10분 후 만료
          </Text>
        </Section>

        <Section className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
          <div className="text-4xl mb-4">⚠️</div>
          <Heading className="text-lg font-semibold text-red-800 mb-3">
            중요한 보안 안내
          </Heading>
          <Text className="text-red-700 text-sm">
            <strong>본인이 요청하지 않았다면</strong> 즉시 다음 조치를 취해주세요:
          </Text>
          <ul className="text-left text-red-700 text-sm mt-2 space-y-1">
            <li>1. 이 이메일을 무시하세요</li>
            <li>
              2.{' '}
              <a href="mailto:security@vlanet.net" className="text-red-600 font-semibold">
                security@vlanet.net
              </a>
              으로 신고하세요
            </li>
            <li>3. 계정 보안을 위해 비밀번호를 변경하세요</li>
          </ul>
        </Section>

        <Section className="bg-gray-50 rounded-lg p-6 mb-6">
          <Heading className="text-lg font-semibold text-gray-800 mb-4">
            📋 비밀번호 재설정 단계
          </Heading>
          <div className="space-y-3 text-left">
            <div className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">
                1
              </span>
              <Text className="text-gray-600">
                위의 6자리 인증번호를 복사하세요
              </Text>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">
                2
              </span>
              <Text className="text-gray-600">
                비밀번호 재설정 페이지에 인증번호를 입력하세요
              </Text>
            </div>
            <div className="flex items-start">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm mr-3 flex-shrink-0">
                3
              </span>
              <Text className="text-gray-600">
                새로운 비밀번호를 설정하세요 (8자 이상 권장)
              </Text>
            </div>
          </div>
        </Section>

        <Button
          href={`${baseUrl}/reset-password`}
          className="bg-gradient-to-r from-red-500 to-red-600 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg"
        >
          🔐 비밀번호 재설정하기
        </Button>
      </Container>
    </BaseEmailTemplate>
  )
}