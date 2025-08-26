'use client'

export function ProjectStats() {
  const stats = [
    { label: '전체 프로젝트', value: 12, color: 'bg-blue-500' },
    { label: '진행중', value: 5, color: 'bg-green-500' },
    { label: '검토 대기', value: 3, color: 'bg-yellow-500' },
    { label: '완료', value: 4, color: 'bg-gray-500' }
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {stats.map(stat => (
        <div key={stat.label} className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full ${stat.color} mr-2`} />
            <span className="text-sm text-gray-600">{stat.label}</span>
          </div>
          <div className="mt-2 text-2xl font-bold">{stat.value}</div>
        </div>
      ))}
    </div>
  )
}