import {
  Button,
  Container,
  Heading,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

import { BaseEmailTemplate } from './BaseEmailTemplate'

interface FeedbackNotificationTemplateProps {
  projectName: string
  feedbackAuthor: string
  feedbackContent: string
  videoTitle: string
  timestamp?: string
  feedbackLink: string
  feedbackType: 'comment' | 'approval' | 'revision'
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'

const feedbackTypeConfig = {
  comment: {
    icon: '💬',
    title: '새로운 피드백',
    color: 'blue',
  },
  approval: {
    icon: '✅',
    title: '승인됨',
    color: 'green',
  },
  revision: {
    icon: '🔄',
    title: '수정 요청',
    color: 'orange',
  },
}

export const FeedbackNotificationTemplate: React.FC<FeedbackNotificationTemplateProps> = ({
  projectName,
  feedbackAuthor,
  feedbackContent,
  videoTitle,
  timestamp,
  feedbackLink,
  feedbackType,
}) => {
  const config = feedbackTypeConfig[feedbackType]
  
  return (
    <BaseEmailTemplate
      preview={`${feedbackAuthor}님이 ${projectName} 프로젝트에 피드백을 남겼습니다`}
      heading="피드백 알림"
    >
      <Container className="text-center">
        <div className={`bg-${config.color}-100 text-${config.color}-600 text-5xl rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6`}>
          {config.icon}
        </div>
        
        <Heading className="text-2xl font-semibold text-gray-800 mb-4">
          {config.title}
        </Heading>
        
        <Text className="text-gray-600 text-lg mb-6">
          <strong>{feedbackAuthor}</strong>님이
          <br />
          <span className="text-blue-600 font-bold">{projectName}</span> 프로젝트에
          피드백을 남겼습니다.
        </Text>

        <Section className="bg-gray-50 rounded-xl p-6 mb-6 text-left">
          <div className="space-y-3">
            <div className="flex items-start">
              <Text className="text-gray-500 font-semibold mr-2">프로젝트:</Text>
              <Text className="text-gray-700">{projectName}</Text>
            </div>
            <div className="flex items-start">
              <Text className="text-gray-500 font-semibold mr-2">비디오:</Text>
              <Text className="text-gray-700">{videoTitle}</Text>
            </div>
            {timestamp && (
              <div className="flex items-start">
                <Text className="text-gray-500 font-semibold mr-2">타임스탬프:</Text>
                <Text className="text-gray-700">{timestamp}</Text>
              </div>
            )}
          </div>
        </Section>

        <Section className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 mb-6 border-l-4 border-blue-500">
          <Heading className="text-sm font-semibold text-gray-600 mb-3 text-left">
            피드백 내용
          </Heading>
          <Text className="text-gray-800 text-left whitespace-pre-line">
            {feedbackContent}
          </Text>
        </Section>

        <Section className="mb-6">
          <Button
            href={feedbackLink}
            className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-8 py-4 rounded-full font-semibold text-lg shadow-lg"
          >
            💬 피드백 확인하기
          </Button>
        </Section>

        <Section className="bg-blue-50 rounded-lg p-4">
          <Text className="text-blue-700 text-sm">
            <strong>💡 팁:</strong> VLANET에서 실시간으로 비디오를 보며 피드백에 답변할 수 있습니다.
            팀원들과 효율적으로 소통하고 프로젝트를 완성해보세요!
          </Text>
        </Section>
      </Container>
    </BaseEmailTemplate>
  )
}