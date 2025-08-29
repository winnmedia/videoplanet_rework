'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { SideBar } from '@/widgets'

export default function FeedbackDetailPage() {
  const params = useParams()
  const id = params?.id as string
  const [activeTab, setActiveTab] = useState<'comments' | 'team' | 'project'>('comments')
  const [currentTime, setCurrentTime] = useState('00:00.000')
  const [commentInput, setCommentInput] = useState('')
  const [showScreenshotModal, setShowScreenshotModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  // params가 없거나 id가 없을 경우 에러 처리
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">잘못된 접근</h1>
              <p className="text-gray-600">피드백 ID가 필요합니다.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }
  
  // Mock 비디오 피드백 프로젝트 데이터
  const mockProjects = {
    '1': {
      title: '웹사이트 리뉴얼 프로젝트',
      version: 'v2.1.3',
      duration: '05:42',
      resolution: '1920x1080',
      videoUrl: '/mock-video.mp4',
      members: ['김철수', '이영희', '박민수'],
      sharing: { status: 'active', expiry: '2025-09-15' }
    },
    '2': {
      title: '모바일 앱 프로모션',
      version: 'v1.0.0',
      duration: '03:20',
      resolution: '1080x1920',
      videoUrl: '/mock-video-2.mp4',
      members: ['정수진', '최영민'],
      sharing: { status: 'private', expiry: null }
    }
  }

  const project = mockProjects[id as keyof typeof mockProjects]

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SideBar />
        <main className="flex-1 ml-sidebar pt-20 transition-all duration-300">
          <div className="container mx-auto px-4 py-8 max-w-7xl">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">피드백을 찾을 수 없습니다</h1>
              <p className="text-gray-600">요청하신 피드백이 존재하지 않습니다.</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const handleTimecodeComment = () => {
    // 중복 방지: 이미 타임코드가 있으면 추가하지 않음
    if (!commentInput.startsWith('[')) {
      const newComment = `[${currentTime}] ${commentInput}`
      setCommentInput(newComment)
    }
  }

  const handleScreenshot = () => {
    setShowScreenshotModal(true)
  }

  const generateScreenshotFilename = () => {
    const now = new Date()
    const projectSlug = project.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const timeCode = currentTime.replace(/[:.]/g, '')
    const timestamp = now.toISOString().replace(/[:-]/g, '').replace(/\..+/, '')
    return `project-${projectSlug}_TC${timeCode}_${timestamp}.jpg`
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  // 비디오 플레이어 시간 시뮬레이션
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime(prev => {
          const [minutes, seconds] = prev.split(':').map((part: string) => {
            const [sec, ms] = part.split('.')
            return [parseInt(sec) || 0, parseInt(ms) || 0]
          }).flat() as [number, number]
          
          let newMs = (seconds || 0) + 100
          let newSec = minutes || 0
          
          if (newMs >= 1000) {
            newMs = 0
            newSec += 1
            if (newSec >= 60) {
              newSec = 0
              // 분 증가 로직은 단순화
            }
          }
          
          return `${String(Math.floor(newSec / 60)).padStart(2, '0')}:${String(newSec % 60).padStart(2, '0')}.${String(newMs).padStart(3, '0')}`
        })
      }, 100)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying])

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target && (event.target as HTMLElement).tagName === 'TEXTAREA') {
        return // 텍스트 에리어에서는 단축키 비활성화
      }
      
      switch (event.key.toLowerCase()) {
        case 't':
          event.preventDefault()
          handleTimecodeComment()
          break
        case ' ':
          event.preventDefault()
          setIsPlaying(!isPlaying)
          break
        case 's':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleScreenshot()
          }
          break
        case 'escape':
          setShowScreenshotModal(false)
          setShowShareModal(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [commentInput, currentTime, isPlaying])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SideBar />
      <main className="flex-1 ml-[18.75rem] pt-20">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
            <p className="text-gray-600 mt-1">영상 피드백 및 협업</p>
          </div>
          
          {/* Main Layout: Video Left, Tabs Right */}
          <div data-testid="main-layout" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Video Player Section */}
            <div data-testid="video-player-section" className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Video Player */}
              <div 
                data-testid="video-player" 
                className="aspect-video bg-gray-900 rounded-t-lg flex items-center justify-center cursor-pointer relative"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                <div className="text-white text-center">
                  <div className="text-4xl mb-2">{isPlaying ? '⏸' : '▶'}</div>
                  <p className="text-sm opacity-80">
                    {isPlaying ? '재생 중' : '비디오 플레이어'} (Space로 재생/일시정지)
                  </p>
                </div>
                {isPlaying && (
                  <div className="absolute top-4 right-4 bg-red-600 text-white px-2 py-1 rounded text-xs">
                    LIVE
                  </div>
                )}
              </div>
              
              {/* Video Controls */}
              <div data-testid="video-controls" className="p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={handleTimecodeComment}
                      title="현재 시점 코멘트"
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      💬
                    </button>
                    <button
                      onClick={handleScreenshot}
                      title="스크린샷 캡처"
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      📷
                    </button>
                    <button
                      onClick={handleShare}
                      title="공유하기"
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      📤
                    </button>
                    <button
                      title="비디오 업로드/교체"
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      📁
                    </button>
                    <button
                      title="수동 새로고침"
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      🔄
                    </button>
                  </div>
                  <div className="text-sm text-gray-500 font-mono">
                    {currentTime} / {project.duration}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Tabs Section */}
            <div data-testid="feedback-tabs" className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    role="tab"
                    aria-selected={activeTab === 'comments'}
                    onClick={() => setActiveTab('comments')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 ${
                      activeTab === 'comments'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    코멘트
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'team'}
                    onClick={() => setActiveTab('team')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 ${
                      activeTab === 'team'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    팀원
                  </button>
                  <button
                    role="tab"
                    aria-selected={activeTab === 'project'}
                    onClick={() => setActiveTab('project')}
                    className={`flex-1 py-3 px-4 text-sm font-medium text-center border-b-2 ${
                      activeTab === 'project'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    프로젝트 정보
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-4 h-96 overflow-y-auto">
                {activeTab === 'comments' && (
                  <div data-testid="comments-content">
                    {/* Comment Input */}
                    <div className="mb-4">
                      <textarea
                        data-testid="comment-input"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        placeholder="코멘트를 입력하세요..."
                        className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex space-x-2">
                          <button title="좋아요" className="text-green-500 hover:bg-green-50 p-1 rounded">👍</button>
                          <button title="싫어요" className="text-red-500 hover:bg-red-50 p-1 rounded">👎</button>
                          <button title="질문 있어요" className="text-yellow-500 hover:bg-yellow-50 p-1 rounded">❓</button>
                        </div>
                        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
                          코멘트 추가
                        </button>
                      </div>
                    </div>

                    {/* Comment Sorting */}
                    <div className="mb-4 flex space-x-2 text-sm">
                      <button className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200">타임코드순</button>
                      <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">최신순</button>
                      <button className="px-3 py-1 text-gray-600 hover:bg-gray-100 rounded">해결됨</button>
                    </div>

                    {/* Comments List */}
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-sm">김철수</span>
                          <span className="text-xs text-gray-500 font-mono">00:01:23</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">색상 보정이 필요합니다.</p>
                        <div data-testid="screenshot-preview" className="mb-2">
                          <img 
                            src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlieiJoZWlnaHQ9IjEwMCUiIGZpbGw9IiNkZGQiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9Im1vbm9zcGFjZSIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPjEyMHg4MDwvdGV4dD48L3N2Zz4=" 
                            alt="스크린샷" 
                            className="rounded border w-30 h-20 object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div data-testid="reply-section" className="text-xs text-gray-500">
                          💬 답글 1개
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'team' && (
                  <div data-testid="team-content">
                    <h3 className="font-medium mb-4">이메일로 팀원 초대</h3>
                    <div className="mb-4">
                      <input
                        data-testid="email-input"
                        type="email"
                        placeholder="이메일 주소를 입력하세요"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button className="w-full mt-2 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700">
                        초대 전송
                      </button>
                    </div>
                    <div data-testid="team-members-list" className="space-y-2">
                      {project.members.map((member, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <span className="text-sm">{member}</span>
                          <span className="text-xs text-green-600">활성</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'project' && (
                  <div data-testid="project-info-content">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">프로젝트 정보</h4>
                        <div className="space-y-2 text-sm">
                          <div data-testid="project-title" className="flex justify-between">
                            <span className="text-gray-600">제목</span>
                            <span>{project.title}</span>
                          </div>
                          <div data-testid="project-version" className="flex justify-between">
                            <span className="text-gray-600">버전</span>
                            <span>{project.version}</span>
                          </div>
                          <div data-testid="video-duration" className="flex justify-between">
                            <span className="text-gray-600">길이</span>
                            <span>{project.duration}</span>
                          </div>
                          <div data-testid="video-resolution" className="flex justify-between">
                            <span className="text-gray-600">해상도</span>
                            <span>{project.resolution}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div data-testid="mini-gantt" className="p-3 bg-gray-50 rounded">
                        <h5 className="text-sm font-medium mb-2">편집 일정</h5>
                        <div className="text-xs text-gray-600">미니 간트 차트 영역</div>
                      </div>
                      
                      <div data-testid="sharing-settings">
                        <h5 className="text-sm font-medium mb-2">공유 설정</h5>
                        <div className="text-xs space-y-1">
                          <div>상태: {project.sharing.status === 'active' ? '공유 중' : '비공개'}</div>
                          {project.sharing.expiry && (
                            <div>만료: {project.sharing.expiry}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Screenshot Modal */}
        {showScreenshotModal && (
          <div data-testid="screenshot-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">스크린샷 캡처</h3>
              <div data-testid="screenshot-filename" className="text-sm text-gray-600 mb-4">
                파일명: {generateScreenshotFilename()}
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  onClick={() => setShowScreenshotModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  취소
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  저장
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Modal */}
        {showShareModal && (
          <div data-testid="share-modal" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">프로젝트 공유</h3>
              <div data-testid="share-permissions" className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">권한 설정</label>
                <select className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500">
                  <option>보기 전용</option>
                  <option>코멘트 가능</option>
                  <option>편집 가능</option>
                </select>
              </div>
              <div data-testid="share-expiry" className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">만료일</label>
                <input 
                  type="date" 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  취소
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                  공유 링크 생성
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}