import { Metadata } from 'next'
import { VideoPlanningWidget } from '@/widgets/VideoPlanning'

export const metadata: Metadata = {
  title: '영상 기획 - VLANET',
  description: '한 줄 스토리에서 12숏 콘티까지 AI 기반 영상 기획 도구'
}

export default function PlanningPage() {
  return <VideoPlanningWidget projectId="planning-demo" />
}