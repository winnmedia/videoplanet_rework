import {
  Button,
  Container,
  Heading,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

import { BaseEmailTemplate } from './BaseEmailTemplate'

interface InviteMemberTemplateProps {
  projectName: string
  inviterName: string
  inviterEmail: string
  inviteLink: string
  role: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'

export const InviteMemberTemplate: React.FC<InviteMemberTemplateProps> = ({
  projectName,
  inviterName,
  inviterEmail,
  inviteLink,
  role,
}) => {
  return (
    <BaseEmailTemplate
      preview={`${inviterName}님이 VLANET 프로젝트에 초대했습니다`}
      heading="프로젝트 초대"
    >
      <Container className="text-center">
        <div className="bg-gradient-to-r from-green-100 to-blue-100 text-green-600 text-5xl rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
          👥
        </div>
        
        <Heading className="text-2xl font-semibold text-gray-800 mb-4">
          프로젝트 협업 초대
        </Heading>
        
        <Text className="text-gray-600 text-lg mb-6">
          <strong>{inviterName}</strong>님이 회원님을
          <br />
          <span className="text-blue-600 font-bold">{projectName}</span> 프로젝트에
          <br />
          <span className="text-purple-600 font-semibold">{role}</span>(으)로 초대했습니다.
        </Text>

        <Section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8 mb-6 border border-blue-200">
          <Heading className="text-lg font-semibold text-gray-800 mb-4">
            초대자 정보
          </Heading>
          <div className="space-y-2">
            <Text className="text-gray-600">
              <strong>이름:</strong> {inviterName}
            </Text>
            <Text className="text-gray-600">
              <strong>이메일:</strong> {inviterEmail}
            </Text>
            <Text className="text-gray-600">
              <strong>프로젝트:</strong> {projectName}
            </Text>
            <Text className="text-gray-600">
              <strong>역할:</strong> {role}
            </Text>
          </div>
        </Section>

        <Section className="bg-gray-50 rounded-lg p-6 mb-6">
          <Heading className="text-lg font-semibold text-gray-800 mb-4">
            🚀 프로젝트에서 할 수 있는 것들
          </Heading>
          <ul className="text-left text-gray-600 space-y-2">
            <li>• 비디오에 실시간 피드백 작성</li>
            <li>• 타임스탬프별 정확한 의견 공유</li>
            <li>• 팀원들과 효율적인 협업</li>
            <li>• 프로젝트 진행 상황 추적</li>
          </ul>
        </Section>

        <Section className="mb-6">
          <Button
            href={inviteLink}
            className="bg-gradient-to-r from-green-500 to-blue-500 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg mb-3"
          >
            ✅ 초대 수락하기
          </Button>
          <Text className="text-gray-500 text-sm">
            이 초대는 7일 후 만료됩니다.
          </Text>
        </Section>

        <Section className="bg-yellow-50 border-l-4 border-yellow-400 p-4 text-left">
          <Text className="text-yellow-800 text-sm">
            <strong>📌 알림:</strong> 이 초대를 예상하지 못했거나 원하지 않는 경우,
            이 이메일을 무시하셔도 됩니다. 초대를 수락하지 않으면 프로젝트에 추가되지 않습니다.
          </Text>
        </Section>
      </Container>
    </BaseEmailTemplate>
  )
}