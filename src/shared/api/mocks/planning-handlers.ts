import { http, HttpResponse } from 'msw'
import { 
  type GenerateStoryRequest,
  type Generate4ActRequest,
  type Generate12ShotRequest,
  type ExportPlanRequest,
  type StoryResponse,
  type Act4Response,
  type Shot12Response,
  type ExportPlanResponse
} from '@/features/video-planning/model/schemas'

// Mock data for different genres and scenarios
const MOCK_STORY_DATA: Record<string, StoryResponse> = {
  adventure: {
    story: "젊은 탐험가 알렉스는 잃어버린 고대 도시를 찾아 아마존 정글 깊숙이 들어간다. 위험한 야생동물과 자연재해를 피해가며, 마침내 황금으로 이루어진 신비로운 도시를 발견한다. 하지만 그곳에는 더 큰 비밀이 숨겨져 있었다.",
    themes: ["모험", "용기", "발견", "자연과의 조화"],
    characters: ["알렉스 (탐험가)", "마리아 (현지 가이드)", "톰슨 박사 (고고학자)", "족장 (원주민)"]
  },
  drama: {
    story: "한때 성공한 의사였던 준호는 의료사고로 모든 것을 잃고 작은 시골 마을에서 새로운 삶을 시작한다. 마을 사람들의 차가운 시선 속에서도 그는 진정한 치료의 의미를 되찾아간다.",
    themes: ["구원", "용서", "재기", "공동체"],
    characters: ["준호 (전직 의사)", "미영 (마을 간호사)", "할머니 (마을 어른)", "소년 (환자)"]
  },
  comedy: {
    story: "서툰 요리사 민수는 고급 레스토랑에서 일하게 되지만 실수투성이다. 하지만 그의 엉뚱한 요리법이 의외의 히트를 치면서 새로운 미식 트렌드를 만들어낸다.",
    themes: ["실패와 성공", "창의성", "웃음", "자신감"],
    characters: ["민수 (요리사)", "세프 (주방장)", "유리 (웨이트리스)", "사장 (레스토랑 사장)"]
  },
  default: {
    story: "평범한 대학생 지민은 우연히 발견한 신비로운 책을 통해 특별한 능력을 얻게 된다. 하지만 이 능력에는 큰 책임이 따른다는 것을 깨닫게 되는데...",
    themes: ["성장", "책임", "선택", "우정"],
    characters: ["지민 (대학생)", "수연 (친구)", "교수님 (멘토)", "라이벌 (경쟁자)"]
  }
}

const MOCK_4ACT_DATA: Act4Response = {
  act1: {
    title: "상황 설정",
    description: "주인공의 평범한 일상과 사건의 발단이 시작됩니다. 캐릭터의 배경과 목표가 명확히 제시됩니다.",
    duration: "25%"
  },
  act2: {
    title: "갈등 심화", 
    description: "첫 번째 장애물이 나타나고 주인공이 이를 극복하려 노력합니다. 갈등이 점차 고조됩니다.",
    duration: "25%"
  },
  act3: {
    title: "위기와 절정",
    description: "가장 큰 위기가 찾아오고 주인공이 최대의 시련에 직면합니다. 모든 것이 절망적으로 보입니다.",
    duration: "25%"
  },
  act4: {
    title: "해결과 결말",
    description: "주인공이 위기를 극복하고 성장합니다. 갈등이 해결되고 새로운 균형이 이루어집니다.",
    duration: "25%"
  }
}

const MOCK_12SHOT_DATA: Shot12Response = {
  shots: [
    {
      shotNumber: 1,
      type: "Wide Shot",
      description: "전체적인 배경과 상황을 보여주는 설정 샷",
      duration: "10초",
      location: "외부 - 도시 전경",
      notes: "황금 시간대 촬영 권장"
    },
    {
      shotNumber: 2,
      type: "Medium Shot", 
      description: "주인공의 첫 등장 장면",
      duration: "8초",
      location: "카페 내부",
      notes: "자연스러운 표정 연출"
    },
    {
      shotNumber: 3,
      type: "Close-up",
      description: "주인공의 감정을 강조하는 클로즈업",
      duration: "5초",
      location: "카페 내부",
      notes: "눈빛에 집중"
    },
    {
      shotNumber: 4,
      type: "Over the Shoulder",
      description: "대화 장면을 위한 숄더샷",
      duration: "12초",
      location: "카페 내부",
      notes: "두 캐릭터 간의 관계 표현"
    },
    {
      shotNumber: 5,
      type: "Tracking Shot",
      description: "주인공이 움직이는 모습을 따라가는 샷",
      duration: "15초",
      location: "거리",
      notes: "부드러운 카메라 무빙"
    },
    {
      shotNumber: 6,
      type: "Dutch Angle",
      description: "긴장감을 연출하는 틸트 샷",
      duration: "6초",
      location: "사무실",
      notes: "15도 각도 틸트"
    },
    {
      shotNumber: 7,
      type: "Extreme Close-up",
      description: "중요한 오브젝트나 디테일 강조",
      duration: "4초",
      location: "사무실",
      notes: "매크로 렌즈 사용"
    },
    {
      shotNumber: 8,
      type: "Two Shot",
      description: "두 캐릭터가 함께 나오는 장면",
      duration: "18초",
      location: "공원",
      notes: "균형잡힌 구도"
    },
    {
      shotNumber: 9,
      type: "Bird's Eye View",
      description: "위에서 내려다보는 전경 샷",
      duration: "8초",
      location: "공원",
      notes: "드론 촬영"
    },
    {
      shotNumber: 10,
      type: "Low Angle",
      description: "주인공을 웅장하게 보여주는 로우 앵글",
      duration: "7초",
      location: "빌딩 앞",
      notes: "권위감 연출"
    },
    {
      shotNumber: 11,
      type: "Reaction Shot",
      description: "다른 캐릭터의 반응을 보여주는 샷",
      duration: "5초", 
      location: "빌딩 내부",
      notes: "자연스러운 리액션"
    },
    {
      shotNumber: 12,
      type: "Master Shot",
      description: "전체적인 마무리와 여운을 남기는 샷",
      duration: "20초",
      location: "옥상",
      notes: "일몰 배경 활용"
    }
  ]
}

// Simulate API delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export const planningHandlers = [
  // Generate Story - Updated to match RTK Query endpoints
  http.post('/api/v1/projects/:projectId/planning/generate-story/', async ({ request, params }) => {
    await delay(2000) // Simulate AI processing time
    
    const body = await request.json() as GenerateStoryRequest
    
    // Simulate validation errors
    if (!body.outline || body.outline.length < 10) {
      return HttpResponse.json(
        { message: '스토리 개요는 최소 10자 이상이어야 합니다.' },
        { status: 400 }
      )
    }
    
    if (!body.genre) {
      return HttpResponse.json(
        { message: '장르를 선택해주세요.' },
        { status: 400 }
      )
    }
    
    // Return genre-specific story or default
    const storyData = MOCK_STORY_DATA[body.genre] || MOCK_STORY_DATA.default
    
    return HttpResponse.json(storyData)
  }),
  
  // Generate 4-Act Structure
  http.post('/api/v1/projects/:projectId/planning/generate-4act/', async ({ request, params }) => {
    await delay(3000) // Simulate longer AI processing
    
    const body = await request.json() as Generate4ActRequest
    
    if (!body.story) {
      return HttpResponse.json(
        { message: '스토리 데이터가 필요합니다.' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json(MOCK_4ACT_DATA)
  }),
  
  // Generate 12-Shot List
  http.post('/api/v1/projects/:projectId/planning/generate-12shot/', async ({ request, params }) => {
    await delay(4000) // Simulate longest AI processing
    
    const body = await request.json() as Generate12ShotRequest
    
    if (!body.story || !body.acts) {
      return HttpResponse.json(
        { message: '스토리와 4막 구조 데이터가 필요합니다.' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json(MOCK_12SHOT_DATA)
  }),
  
  // Unified Export endpoint - handles both PDF and JSON based on format parameter
  http.post('/api/v1/projects/:projectId/planning/export/', async ({ request, params }) => {
    const body = await request.json() as ExportPlanRequest & { format?: string }
    const projectId = params.projectId as string
    
    // Validate project ID
    if (!projectId || projectId === 'test-project') {
      // Allow test project ID for testing
    } else if (!/^\d+$/.test(projectId)) {
      return HttpResponse.json(
        { message: '유효하지 않은 프로젝트 ID입니다.' },
        { status: 400 }
      )
    }
    
    if (!body.story || !body.acts || !body.shots) {
      return HttpResponse.json(
        { message: '모든 기획 데이터가 필요합니다.' },
        { status: 400 }
      )
    }
    
    const format = body.format || 'pdf'
    const isJson = format === 'json'
    const delayTime = isJson ? 1000 : 2000 // JSON is faster to generate
    
    await delay(delayTime)
    
    const fileExtension = isJson ? 'json' : 'pdf'
    const response: ExportPlanResponse = {
      url: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/mock-exports/video-plan-${Date.now()}.${fileExtension}`,
      fileName: `비디오_기획서_${new Date().toISOString().split('T')[0]}.${fileExtension}`
    }
    
    return HttpResponse.json(response)
  }),
  
  // Error scenarios for testing - Updated endpoints
  http.post('/api/v1/projects/:projectId/planning/generate-story-error/', () => {
    return HttpResponse.json(
      { message: 'AI 서비스에 일시적인 문제가 발생했습니다.' },
      { status: 500 }
    )
  }),
  
  http.post('/api/v1/projects/:projectId/planning/generate-story-timeout/', async () => {
    await delay(65000) // Timeout after 65 seconds
    return HttpResponse.json({ message: 'Request timeout' }, { status: 408 })
  }),
  
  http.post('/api/v1/projects/:projectId/planning/rate-limit/', () => {
    return HttpResponse.json(
      { message: '요청 한도를 초과했습니다.' },
      { status: 429 }
    )
  }),
]