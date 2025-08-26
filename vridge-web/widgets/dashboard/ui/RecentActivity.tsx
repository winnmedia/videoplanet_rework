'use client'

export function RecentActivity() {
  const activities = [
    { id: 1, type: 'comment', message: '새로운 피드백이 추가되었습니다', time: '5분 전' },
    { id: 2, type: 'update', message: '프로젝트 상태가 변경되었습니다', time: '1시간 전' },
    { id: 3, type: 'upload', message: '새로운 비디오가 업로드되었습니다', time: '3시간 전' },
    { id: 4, type: 'complete', message: '프로젝트가 완료되었습니다', time: '1일 전' }
  ]
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">최근 활동</h3>
      <div className="space-y-4">
        {activities.map(activity => (
          <div key={activity.id} className="flex items-start">
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-gray-900">{activity.message}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}