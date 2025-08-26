'use client'

export function ProjectList() {
  const projects = [
    { id: 1, title: '회사 소개 영상', status: 'active', progress: 65 },
    { id: 2, title: '제품 홍보 비디오', status: 'active', progress: 30 },
    { id: 3, title: '교육 콘텐츠 시리즈', status: 'pending', progress: 0 },
    { id: 4, title: '브랜드 캠페인', status: 'completed', progress: 100 }
  ]
  
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'active': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'completed': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }
  
  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'active': return '진행중'
      case 'pending': return '대기'
      case 'completed': return '완료'
      default: return status
    }
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map(project => (
        <div key={project.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
          <h3 className="font-semibold text-lg mb-2">{project.title}</h3>
          <div className="flex justify-between items-center mb-4">
            <span className={`text-sm ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
            <span className="text-sm text-gray-500">{project.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}