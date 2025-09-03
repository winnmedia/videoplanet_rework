import { http, HttpResponse } from 'msw';
import type { 
  FourActStructure, 
  TwelveShotPlan, 
  QualityMetrics,
  Act,
  Shot 
} from './types';

// 모킹 데이터
const mockFourActStructure: Omit<FourActStructure, 'projectId'> = {
  acts: [
    {
      id: 'act-1',
      title: '도입부 - 상황 설정',
      description: '주인공과 배경 소개, 일상의 모습을 보여주며 갈등의 씨앗을 심는다.',
      duration: 30,
      order: 1,
    },
    {
      id: 'act-2', 
      title: '갈등 발생 - 사건의 시작',
      description: '예상치 못한 사건이 발생하여 주인공이 어려움에 처하게 된다.',
      duration: 60,
      order: 2,
    },
    {
      id: 'act-3',
      title: '클라이맥스 - 절정의 순간',
      description: '갈등이 최고조에 달하며, 주인공이 중요한 결정을 내려야 하는 순간.',
      duration: 90,
      order: 3,
    },
    {
      id: 'act-4',
      title: '해결 - 마무리',
      description: '갈등이 해결되고 새로운 균형을 찾으며 이야기가 마무리된다.',
      duration: 30,
      order: 4,
    },
  ] as [Act, Act, Act, Act],
  totalDuration: 210,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

const mockQualityMetrics: QualityMetrics = {
  consistency: 88,
  characterDevelopment: 82,
  narrativeFlow: 90,
  overallScore: 87,
};

const mockTwelveShotPlan: Omit<TwelveShotPlan, 'projectId' | 'actId'> = {
  shots: [
    {
      id: 'shot-1',
      actId: 'act-1',
      title: '오프닝 샷',
      description: '도시의 전경을 보여주는 와이드 샷',
      duration: 5,
      cameraAngle: '와이드 샷',
      order: 1,
    },
    {
      id: 'shot-2',
      actId: 'act-1', 
      title: '주인공 등장',
      description: '주인공이 걸어오는 미디움 샷',
      duration: 8,
      cameraAngle: '미디움 샷',
      action: '주인공이 카메라를 향해 걸어온다',
      order: 2,
    },
    {
      id: 'shot-3',
      actId: 'act-1',
      title: '클로즈업',
      description: '주인공의 표정을 클로즈업으로 담는다',
      duration: 3,
      cameraAngle: '클로즈업',
      dialogue: '또 다른 하루가 시작되는구나',
      order: 3,
    },
  ] as Shot[],
  totalDuration: 16,
  createdAt: new Date('2024-01-01T00:00:00Z'),
};

// MSW 핸들러들
export const geminiHandlers = [
  // Gemini API 모킹 (실제로는 Google API를 호출하므로 실제 endpoint는 다름)
  // 여기서는 우리 애플리케이션 내부 API를 모킹
  http.post('/api/story/generate-four-act', async ({ request }) => {
    const body = await request.json() as any;
    
    // 요청 검증
    if (!body.projectId || !body.briefing) {
      return new HttpResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 모킹된 성공 응답
    const response = {
      structure: {
        ...mockFourActStructure,
        projectId: body.projectId,
      },
      qualityMetrics: mockQualityMetrics,
      suggestions: [
        '캐릭터의 동기를 더 명확하게 설정하면 좋겠습니다',
        '2막에서 갈등을 더욱 강화할 필요가 있습니다',
        '4막의 해결 부분을 더 상세히 다루면 완성도가 높아질 것 같습니다',
      ],
    };

    return HttpResponse.json(response);
  }),

  http.post('/api/story/generate-twelve-shot', async ({ request }) => {
    const body = await request.json() as any;

    if (!body.projectId || !body.actId) {
      return new HttpResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const response = {
      ...mockTwelveShotPlan,
      projectId: body.projectId,
      actId: body.actId,
      shots: mockTwelveShotPlan.shots.map(shot => ({
        ...shot,
        actId: body.actId,
      })),
    };

    return HttpResponse.json(response);
  }),

  // API 오류 시뮬레이션
  http.post('/api/story/generate-four-act-error', () => {
    return new HttpResponse(
      JSON.stringify({ error: 'Gemini API rate limit exceeded' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }),

  // 네트워크 지연 시뮬레이션
  http.post('/api/story/generate-slow', async () => {
    // 5초 지연
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return HttpResponse.json({
      structure: mockFourActStructure,
      qualityMetrics: mockQualityMetrics,
      suggestions: [],
    });
  }),
];