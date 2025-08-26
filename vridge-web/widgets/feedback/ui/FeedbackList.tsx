'use client'

export function FeedbackList() {
  const feedbacks = [
    { 
      id: 1, 
      project: '회사 소개 영상', 
      timecode: '00:01:23', 
      comment: '색상 보정이 필요합니다',
      author: '김철수',
      createdAt: '2025-01-20'
    },
    { 
      id: 2, 
      project: '제품 홍보 비디오', 
      timecode: '00:02:45', 
      comment: '배경 음악 볼륨을 낮춰주세요',
      author: '이영희',
      createdAt: '2025-01-19'
    },
    { 
      id: 3, 
      project: '교육 콘텐츠 시리즈', 
      timecode: '00:05:12', 
      comment: '자막 오타가 있습니다',
      author: '박민수',
      createdAt: '2025-01-18'
    }
  ]
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              프로젝트
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              타임코드
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              코멘트
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              작성자
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              날짜
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {feedbacks.map(feedback => (
            <tr key={feedback.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {feedback.project}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {feedback.timecode}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {feedback.comment}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {feedback.author}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {feedback.createdAt}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}