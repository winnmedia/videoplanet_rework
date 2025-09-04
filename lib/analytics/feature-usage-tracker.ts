/**
 * 페이지 기능 활용도 측정 시스템
 * 각 페이지별 기능 사용 패턴 분석 및 최적화 방안 도출
 */

import { behaviorTracker } from './behavior-tracker';

export interface FeatureUsageMetrics {
  featureId: string;
  featureName: string;
  category: 'primary' | 'secondary' | 'tertiary';
  page: string;
  usageCount: number;
  uniqueUsers: Set<string>;
  avgSessionDuration: number;
  completionRate: number;
  errorRate: number;
  lastUsed: number;
}

export class FeatureUsageTracker {
  private features: Map<string, FeatureUsageMetrics> = new Map();
  private activeFeatureSessions: Map<string, {
    startTime: number;
    userId?: string;
    sessionId: string;
    steps: string[];
  }> = new Map();

  // VRidge 특화 기능 정의
  private readonly FEATURE_DEFINITIONS = {
    // Dashboard 기능들
    'dashboard.project_overview': { name: '프로젝트 개요', category: 'primary' as const, page: '/dashboard' },
    'dashboard.recent_activity': { name: '최근 활동', category: 'secondary' as const, page: '/dashboard' },
    'dashboard.quick_actions': { name: '빠른 작업', category: 'primary' as const, page: '/dashboard' },
    
    // Projects 기능들
    'projects.list_view': { name: '프로젝트 목록', category: 'primary' as const, page: '/projects' },
    'projects.create_new': { name: '프로젝트 생성', category: 'primary' as const, page: '/projects' },
    'projects.filter': { name: '프로젝트 필터링', category: 'secondary' as const, page: '/projects' },
    'projects.search': { name: '프로젝트 검색', category: 'secondary' as const, page: '/projects' },
    
    // Video Planning 기능들
    'planning.storyboard': { name: '스토리보드', category: 'primary' as const, page: '/planning' },
    'planning.script_editor': { name: '스크립트 편집', category: 'primary' as const, page: '/planning' },
    'planning.shot_list': { name: '샷 리스트', category: 'secondary' as const, page: '/planning' },
    'planning.collaboration': { name: '협업', category: 'secondary' as const, page: '/planning' },
    
    // Feedback 기능들
    'feedback.video_player': { name: '비디오 재생', category: 'primary' as const, page: '/feedback' },
    'feedback.timeline_comments': { name: '타임라인 코멘트', category: 'primary' as const, page: '/feedback' },
    'feedback.approval_flow': { name: '승인 플로우', category: 'primary' as const, page: '/feedback' },
    
    // Calendar 기능들
    'calendar.month_view': { name: '월간 보기', category: 'primary' as const, page: '/calendar' },
    'calendar.event_creation': { name: '일정 생성', category: 'primary' as const, page: '/calendar' },
    'calendar.deadline_tracking': { name: '마감일 추적', category: 'secondary' as const, page: '/calendar' }
  };

  constructor() {
    this.initializeFeatureDefinitions();
  }

  private initializeFeatureDefinitions(): void {
    Object.entries(this.FEATURE_DEFINITIONS).forEach(([featureId, definition]) => {
      this.features.set(featureId, {
        featureId,
        featureName: definition.name,
        category: definition.category,
        page: definition.page,
        usageCount: 0,
        uniqueUsers: new Set(),
        avgSessionDuration: 0,
        completionRate: 0,
        errorRate: 0,
        lastUsed: 0
      });
    });
  }

  // 기능 사용 시작 추적
  trackFeatureStart(featureId: string, userId?: string, context?: Record<string, unknown>): void {
    const sessionId = `${featureId}_${Date.now()}`;
    
    this.activeFeatureSessions.set(sessionId, {
      startTime: Date.now(),
      userId,
      sessionId,
      steps: []
    });

    const feature = this.features.get(featureId);
    if (feature) {
      feature.usageCount++;
      if (userId) feature.uniqueUsers.add(userId);
      feature.lastUsed = Date.now();
    }

    behaviorTracker.track({
      category: 'interaction',
      action: 'feature_start',
      component: 'Feature',
      label: featureId,
      customProperties: {
        featureId,
        featureName: feature?.featureName,
        category: feature?.category,
        context
      }
    });
  }

  // 기능 사용 단계 추적
  trackFeatureStep(featureId: string, step: string, data?: Record<string, unknown>): void {
    const activeSession = Array.from(this.activeFeatureSessions.entries())
      .find(([sessionId, session]) => sessionId.startsWith(featureId) && Date.now() - session.startTime < 300000); // 5분 내

    if (activeSession) {
      const [sessionId, session] = activeSession;
      session.steps.push(step);
    }

    behaviorTracker.track({
      category: 'engagement',
      action: 'feature_step',
      component: 'Feature',
      label: `${featureId}.${step}`,
      customProperties: {
        featureId,
        step,
        stepData: data,
        stepIndex: activeSession?.[1].steps.length || 0
      }
    });
  }

  // 기능 사용 완료 추적
  trackFeatureComplete(featureId: string, success: boolean, result?: Record<string, unknown>): void {
    const activeSessionEntry = Array.from(this.activeFeatureSessions.entries())
      .find(([sessionId, session]) => sessionId.startsWith(featureId) && Date.now() - session.startTime < 300000);

    if (activeSessionEntry) {
      const [sessionId, session] = activeSessionEntry;
      const duration = Date.now() - session.startTime;
      
      // 기능별 통계 업데이트
      const feature = this.features.get(featureId);
      if (feature) {
        // 평균 세션 시간 업데이트
        const totalSessions = feature.usageCount;
        feature.avgSessionDuration = ((feature.avgSessionDuration * (totalSessions - 1)) + duration) / totalSessions;
        
        // 완료율 업데이트 (성공한 세션 / 전체 세션)
        const successCount = success ? 1 : 0;
        feature.completionRate = ((feature.completionRate * (totalSessions - 1)) + successCount) / totalSessions;
      }

      behaviorTracker.track({
        category: 'engagement',
        action: 'feature_complete',
        component: 'Feature',
        label: featureId,
        value: duration,
        customProperties: {
          featureId,
          success,
          duration,
          stepsCompleted: session.steps.length,
          stepSequence: session.steps,
          result,
          efficiency: this.calculateFeatureEfficiency(featureId, session.steps.length, duration)
        }
      });

      this.activeFeatureSessions.delete(sessionId);
    }
  }

  // 기능 사용 에러 추적
  trackFeatureError(featureId: string, error: {
    type: string;
    message: string;
    step?: string;
    critical?: boolean;
  }): void {
    const feature = this.features.get(featureId);
    if (feature) {
      feature.errorRate = (feature.errorRate * feature.usageCount + 1) / (feature.usageCount + 1);
    }

    behaviorTracker.track({
      category: 'error',
      action: 'feature_error',
      component: 'Feature',
      label: featureId,
      customProperties: {
        featureId,
        errorType: error.type,
        errorMessage: error.message,
        step: error.step,
        critical: error.critical || false
      }
    });
  }

  // 기능별 사용 통계 조회
  getFeatureStats(featureId: string): FeatureUsageMetrics | undefined {
    return this.features.get(featureId);
  }

  // 전체 기능 사용률 리포트
  generateUsageReport(): {
    topFeatures: Array<{ featureId: string; usageCount: number; category: string }>;
    underutilizedFeatures: Array<{ featureId: string; usageCount: number; category: string }>;
    categoryStats: Record<string, { totalUsage: number; avgCompletion: number; avgError: number }>;
    pageEfficiency: Record<string, number>;
  } {
    const featureArray = Array.from(this.features.values());
    
    // 상위 사용 기능
    const topFeatures = featureArray
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 10)
      .map(f => ({ featureId: f.featureId, usageCount: f.usageCount, category: f.category }));

    // 저활용 기능 (primary/secondary 카테고리에서 사용률 낮은 기능)
    const underutilizedFeatures = featureArray
      .filter(f => ['primary', 'secondary'].includes(f.category))
      .sort((a, b) => a.usageCount - b.usageCount)
      .slice(0, 5)
      .map(f => ({ featureId: f.featureId, usageCount: f.usageCount, category: f.category }));

    // 카테고리별 통계
    const categoryStats: Record<string, { totalUsage: number; avgCompletion: number; avgError: number }> = {};
    ['primary', 'secondary', 'tertiary'].forEach(category => {
      const categoryFeatures = featureArray.filter(f => f.category === category);
      categoryStats[category] = {
        totalUsage: categoryFeatures.reduce((sum, f) => sum + f.usageCount, 0),
        avgCompletion: categoryFeatures.reduce((sum, f) => sum + f.completionRate, 0) / categoryFeatures.length,
        avgError: categoryFeatures.reduce((sum, f) => sum + f.errorRate, 0) / categoryFeatures.length
      };
    });

    // 페이지별 효율성
    const pageEfficiency: Record<string, number> = {};
    const pages = [...new Set(featureArray.map(f => f.page))];
    pages.forEach(page => {
      const pageFeatures = featureArray.filter(f => f.page === page);
      const avgCompletion = pageFeatures.reduce((sum, f) => sum + f.completionRate, 0) / pageFeatures.length;
      const avgError = pageFeatures.reduce((sum, f) => sum + f.errorRate, 0) / pageFeatures.length;
      pageEfficiency[page] = (avgCompletion * 0.7) + ((1 - avgError) * 0.3); // 완료율 70%, 에러율 30% 가중치
    });

    return {
      topFeatures,
      underutilizedFeatures,
      categoryStats,
      pageEfficiency
    };
  }

  // 기능 효율성 계산
  private calculateFeatureEfficiency(featureId: string, stepsCompleted: number, duration: number): number {
    // 기능별 예상 단계 수와 시간 정의
    const expectedMetrics: Record<string, { steps: number; duration: number }> = {
      'projects.create_new': { steps: 5, duration: 120000 }, // 2분
      'planning.script_editor': { steps: 8, duration: 300000 }, // 5분
      'feedback.timeline_comments': { steps: 3, duration: 60000 }, // 1분
      // ... 다른 기능들
    };

    const expected = expectedMetrics[featureId] || { steps: 3, duration: 180000 };
    const stepEfficiency = Math.min(1, expected.steps / stepsCompleted);
    const timeEfficiency = Math.min(1, expected.duration / duration);
    
    return (stepEfficiency * 0.4 + timeEfficiency * 0.6) * 100;
  }

  // 기능별 개선 권장사항 생성
  generateImprovementSuggestions(): Array<{
    featureId: string;
    issue: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }> {
    const suggestions: Array<{
      featureId: string;
      issue: string;
      severity: 'low' | 'medium' | 'high';
      suggestion: string;
    }> = [];

    this.features.forEach((feature, featureId) => {
      // 낮은 완료율
      if (feature.completionRate < 0.7 && feature.category === 'primary') {
        suggestions.push({
          featureId,
          issue: `낮은 완료율 (${(feature.completionRate * 100).toFixed(1)}%)`,
          severity: 'high',
          suggestion: '사용자 플로우 단순화 및 명확한 가이드 제공 필요'
        });
      }

      // 높은 에러율
      if (feature.errorRate > 0.1) {
        suggestions.push({
          featureId,
          issue: `높은 에러율 (${(feature.errorRate * 100).toFixed(1)}%)`,
          severity: 'high',
          suggestion: '에러 처리 로직 개선 및 사용자 피드백 강화 필요'
        });
      }

      // 저활용 핵심 기능
      if (feature.category === 'primary' && feature.usageCount < 10) {
        suggestions.push({
          featureId,
          issue: `핵심 기능 저활용 (사용횟수: ${feature.usageCount})`,
          severity: 'medium',
          suggestion: 'UI/UX 개선으로 접근성 향상 및 사용자 교육 강화 필요'
        });
      }
    });

    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }
}

export const featureUsageTracker = new FeatureUsageTracker();

// React Hook
export function useFeatureUsageTracker() {
  return {
    trackStart: featureUsageTracker.trackFeatureStart.bind(featureUsageTracker),
    trackStep: featureUsageTracker.trackFeatureStep.bind(featureUsageTracker),
    trackComplete: featureUsageTracker.trackFeatureComplete.bind(featureUsageTracker),
    trackError: featureUsageTracker.trackFeatureError.bind(featureUsageTracker),
    getStats: featureUsageTracker.getFeatureStats.bind(featureUsageTracker),
    generateReport: featureUsageTracker.generateUsageReport.bind(featureUsageTracker)
  };
}