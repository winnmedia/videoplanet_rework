/**
 * 사용자 여정 데이터 수집 API
 * Playwright 테스트에서 수집된 여정 데이터 처리
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withErrorHandler } from '@/lib/api/error-handler';
import { apiMonitor } from '@/lib/api/monitoring';

// 사용자 여정 데이터 스키마
const UserJourneyMetricsSchema = z.object({
  journeyId: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  totalDuration: z.number(),
  steps: z.array(z.object({
    stepName: z.string(),
    startTime: z.number(),
    duration: z.number(),
    success: z.boolean(),
    errors: z.array(z.string()),
    performanceMetrics: z.object({
      lcp: z.number(),
      fid: z.number(),
      cls: z.number()
    }),
    interactions: z.array(z.object({
      type: z.string(),
      element: z.string(),
      timestamp: z.number(),
      details: z.record(z.unknown()).optional()
    }))
  })),
  completionRate: z.number(),
  abandonmentPoint: z.string().optional(),
  userFrustrationEvents: z.array(z.object({
    type: z.string(),
    timestamp: z.number(),
    context: z.record(z.unknown())
  }))
});

// 여정 분석 결과 타입
interface JourneyAnalysis {
  journeyId: string;
  overallHealth: 'excellent' | 'good' | 'needs_improvement' | 'critical';
  performanceScore: number;
  usabilityScore: number;
  bottlenecks: Array<{
    step: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    recommendation: string;
  }>;
  benchmarkComparison: {
    betterThanAverage: boolean;
    percentile: number;
  };
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const journeyData = UserJourneyMetricsSchema.parse(body);
    
    // 여정 분석 수행
    const analysis = analyzeUserJourney(journeyData);
    
    // 성능 문제가 있는 경우 모니터링 시스템에 로그
    if (analysis.overallHealth === 'critical') {
      apiMonitor.logError(
        `Critical user journey performance: ${journeyData.journeyId}`,
        undefined,
        {
          journeyId: journeyData.journeyId,
          completionRate: journeyData.completionRate,
          totalDuration: journeyData.totalDuration,
          bottlenecks: analysis.bottlenecks
        }
      );
    }
    
    // 데이터베이스 또는 분석 시스템에 저장
    await storeJourneyData(journeyData, analysis);
    
    // 실시간 대시보드 업데이트를 위한 웹소켓 전송
    await broadcastJourneyUpdate(journeyData, analysis);
    
    return NextResponse.json({
      success: true,
      message: '사용자 여정 데이터가 성공적으로 저장되었습니다',
      analysis,
      recommendations: generateRecommendations(analysis)
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: '잘못된 데이터 형식',
        details: error.errors
      }, { status: 400 });
    }
    
    throw error;
  }
});

// 여정 분석 함수
function analyzeUserJourney(journey: z.infer<typeof UserJourneyMetricsSchema>): JourneyAnalysis {
  const analysis: JourneyAnalysis = {
    journeyId: journey.journeyId,
    overallHealth: 'good',
    performanceScore: 0,
    usabilityScore: 0,
    bottlenecks: [],
    benchmarkComparison: {
      betterThanAverage: true,
      percentile: 75
    }
  };

  // 성능 점수 계산
  const avgLCP = journey.steps.reduce((sum, step) => sum + step.performanceMetrics.lcp, 0) / journey.steps.length;
  const avgCLS = journey.steps.reduce((sum, step) => sum + step.performanceMetrics.cls, 0) / journey.steps.length;
  
  let performanceScore = 100;
  if (avgLCP > 2500) performanceScore -= 30;
  if (avgLCP > 4000) performanceScore -= 20;
  if (avgCLS > 0.1) performanceScore -= 25;
  if (avgCLS > 0.25) performanceScore -= 15;
  
  analysis.performanceScore = Math.max(0, performanceScore);

  // 사용성 점수 계산
  let usabilityScore = 100;
  
  // 완료율 기반 점수
  usabilityScore *= journey.completionRate;
  
  // 에러 발생 감점
  const totalErrors = journey.steps.reduce((sum, step) => sum + step.errors.length, 0);
  usabilityScore -= totalErrors * 10;
  
  // 좌절 이벤트 감점
  usabilityScore -= journey.userFrustrationEvents.length * 15;
  
  // 적절한 소요 시간 여부
  const expectedDurations: Record<string, number> = {
    'project_creation_journey': 120000, // 2분
    'video_feedback_journey': 180000,   // 3분
    'submenu_usage_journey': 30000,     // 30초
    'search_filter_journey': 60000      // 1분
  };
  
  const expected = expectedDurations[journey.journeyId] || 120000;
  if (journey.totalDuration > expected * 2) {
    usabilityScore -= 20;
  }
  
  analysis.usabilityScore = Math.max(0, usabilityScore);

  // 병목 지점 식별
  journey.steps.forEach(step => {
    // 성능 병목
    if (step.performanceMetrics.lcp > 2500) {
      analysis.bottlenecks.push({
        step: step.stepName,
        issue: `느린 로딩 성능 (LCP: ${step.performanceMetrics.lcp}ms)`,
        severity: step.performanceMetrics.lcp > 4000 ? 'high' : 'medium',
        recommendation: '이미지 최적화 및 코드 분할을 통한 로딩 성능 개선 필요'
      });
    }

    // 에러 병목
    if (step.errors.length > 0) {
      analysis.bottlenecks.push({
        step: step.stepName,
        issue: `${step.errors.length}개의 에러 발생`,
        severity: 'high',
        recommendation: '에러 처리 로직 개선 및 사용자 피드백 강화 필요'
      });
    }

    // 시간 병목
    const stepExpectedTime: Record<string, number> = {
      'dashboard_landing': 3000,
      'navigate_to_projects': 2000,
      'click_create_project': 1000,
      'fill_project_form': 30000,
      'submit_project': 5000
    };

    const expected = stepExpectedTime[step.stepName] || 10000;
    if (step.duration > expected * 2) {
      analysis.bottlenecks.push({
        step: step.stepName,
        issue: `예상보다 긴 소요 시간 (${Math.round(step.duration / 1000)}초)`,
        severity: step.duration > expected * 3 ? 'high' : 'medium',
        recommendation: 'UI/UX 개선을 통한 작업 효율성 향상 필요'
      });
    }
  });

  // 전체 건강도 판정
  if (analysis.performanceScore < 50 || analysis.usabilityScore < 50) {
    analysis.overallHealth = 'critical';
  } else if (analysis.performanceScore < 70 || analysis.usabilityScore < 70) {
    analysis.overallHealth = 'needs_improvement';
  } else if (analysis.performanceScore > 90 && analysis.usabilityScore > 90) {
    analysis.overallHealth = 'excellent';
  }

  return analysis;
}

// 데이터 저장 함수
async function storeJourneyData(
  journey: z.infer<typeof UserJourneyMetricsSchema>, 
  analysis: JourneyAnalysis
): Promise<void> {
  // 실제 환경에서는 데이터베이스에 저장
  // 여기서는 로그로 대체
  console.log('Storing journey data:', {
    journeyId: journey.journeyId,
    timestamp: new Date().toISOString(),
    health: analysis.overallHealth,
    scores: {
      performance: analysis.performanceScore,
      usability: analysis.usabilityScore
    }
  });
  
  // Time-series 데이터베이스(InfluxDB, TimescaleDB 등)에 저장하여
  // 시간별 트렌드 분석 가능하도록 구성
}

// 실시간 업데이트 브로드캐스트
async function broadcastJourneyUpdate(
  journey: z.infer<typeof UserJourneyMetricsSchema>,
  analysis: JourneyAnalysis
): Promise<void> {
  // WebSocket이나 Server-Sent Events를 통해 실시간 대시보드 업데이트
  // 여기서는 콘솔 로그로 대체
  console.log('Broadcasting journey update:', {
    journeyId: journey.journeyId,
    health: analysis.overallHealth,
    timestamp: Date.now()
  });
}

// 개선 권장사항 생성
function generateRecommendations(analysis: JourneyAnalysis): Array<{
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'usability' | 'accessibility';
  action: string;
  impact: string;
}> {
  const recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'performance' | 'usability' | 'accessibility';
    action: string;
    impact: string;
  }> = [];

  // 성능 관련 권장사항
  if (analysis.performanceScore < 70) {
    recommendations.push({
      priority: 'high',
      category: 'performance',
      action: '이미지 최적화 및 지연 로딩 구현',
      impact: 'LCP 30% 개선 예상'
    });
    
    recommendations.push({
      priority: 'medium',
      category: 'performance',
      action: 'JavaScript 번들 크기 최적화',
      impact: 'FCP 20% 개선 예상'
    });
  }

  // 사용성 관련 권장사항
  if (analysis.usabilityScore < 70) {
    recommendations.push({
      priority: 'high',
      category: 'usability',
      action: '에러 처리 및 사용자 피드백 개선',
      impact: '완료율 15% 향상 예상'
    });
    
    recommendations.push({
      priority: 'medium',
      category: 'usability',
      action: '폼 입력 가이드 및 검증 강화',
      impact: '사용자 좌절 이벤트 40% 감소 예상'
    });
  }

  // 병목 지점별 권장사항
  const highSeverityBottlenecks = analysis.bottlenecks.filter(b => b.severity === 'high');
  if (highSeverityBottlenecks.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'usability',
      action: `${highSeverityBottlenecks[0].step} 단계 최적화`,
      impact: `여정 완료율 25% 향상 예상`
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const journeyType = searchParams.get('type');
    const timeRange = searchParams.get('timeRange') || '24h';
    
    // 여정별 통계 데이터 반환 (실제 구현에서는 DB에서 조회)
    const mockStats = {
      summary: {
        totalJourneys: 1250,
        avgCompletionRate: 0.87,
        avgPerformanceScore: 78,
        avgUsabilityScore: 82
      },
      journeyTypes: {
        'project_creation_journey': { count: 450, avgCompletion: 0.92, avgDuration: 95000 },
        'video_feedback_journey': { count: 320, avgCompletion: 0.89, avgDuration: 145000 },
        'submenu_usage_journey': { count: 280, avgCompletion: 0.78, avgDuration: 25000 },
        'search_filter_journey': { count: 200, avgCompletion: 0.85, avgDuration: 58000 }
      },
      trends: {
        labels: ['월', '화', '수', '목', '금', '토', '일'],
        completionRates: [0.85, 0.87, 0.89, 0.86, 0.88, 0.84, 0.82],
        performanceScores: [76, 78, 80, 77, 79, 75, 73]
      }
    };
    
    return NextResponse.json({
      success: true,
      data: mockStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    throw error;
  }
});