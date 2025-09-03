export default function CalendarLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* 헤더 스켈레톤 */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
        <div>
          <div className="h-8 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-12 h-8 bg-gray-200 rounded-md mx-1 animate-pulse"></div>
            ))}
          </div>
          <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      </div>

      {/* 네비게이션 스켈레톤 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-12 animate-pulse"></div>
        </div>
        
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
        
        <div className="h-8 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>

      {/* 캘린더 뷰 스켈레톤 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6">
          <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>

      {/* 이벤트 목록 스켈레톤 */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4 animate-pulse"></div>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-48 mb-1 animate-pulse"></div>
                <div className="h-4 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
                <div className="flex items-center space-x-4">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}