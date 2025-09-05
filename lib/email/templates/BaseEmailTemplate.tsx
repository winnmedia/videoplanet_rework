import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BaseEmailTemplateProps {
  preview: string
  heading: string
  children: React.ReactNode
  footerText?: string
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet-vlanets-projects.vercel.app'

export const BaseEmailTemplate: React.FC<BaseEmailTemplateProps> = ({
  preview,
  heading,
  children,
  footerText = 'VLANET - Video Feedback Platform',
}) => {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gradient-to-br from-indigo-500 to-purple-600 font-sans">
          <Container className="mx-auto max-w-2xl bg-white shadow-2xl">
            {/* Header */}
            <Section className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-center">
              <Img
                src={`${baseUrl}/images/Common/logo.svg`}
                width="120"
                height="48"
                alt="VLANET"
                className="mx-auto mb-4"
              />
              <Heading className="text-3xl font-bold text-white">
                {heading}
              </Heading>
            </Section>

            {/* Main Content */}
            <Section className="px-8 py-10">
              {children}
            </Section>

            {/* Footer */}
            <Section className="bg-gray-800 px-8 py-6 text-center">
              <Text className="text-gray-400 text-sm">
                {footerText}
              </Text>
              <Hr className="my-4 border-gray-600" />
              <div className="flex justify-center gap-4">
                <Link
                  href={baseUrl}
                  className="text-cyan-400 text-xs no-underline"
                >
                  홈페이지
                </Link>
                <Text className="text-gray-600 text-xs">|</Text>
                <Link
                  href="mailto:support@vlanet.net"
                  className="text-cyan-400 text-xs no-underline"
                >
                  고객지원
                </Link>
                <Text className="text-gray-600 text-xs">|</Text>
                <Link
                  href={`${baseUrl}/privacy`}
                  className="text-cyan-400 text-xs no-underline"
                >
                  개인정보처리방침
                </Link>
              </div>
              <Text className="mt-4 text-xs text-gray-500">
                © 2025 VLANET. 모든 권리 보유.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}