'use client'

import { FeedbackList } from '@/widgets/feedback'
import { FeedbackFilter } from '@/features/feedback'

export default function FeedbackPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">피드백</h1>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">피드백 목록</p>
        <FeedbackFilter />
      </div>
      
      <FeedbackList />
    </div>
  )
}