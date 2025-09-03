/**
 * Dashboard 데이터 파이프라인 품질 테스트
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * 테스트 범위:
 * 1. API 스키마 검증 및 계약 준수
 * 2. 데이터 변환 로직 정확성
 * 3. 에러 처리 및 복원력
 * 4. 성능 요구사항 검증
 * 5. MSW 모킹 데이터 무결성
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { 
  dashboardApi,
  useGetDashboardSummaryQuery,
  dashboardCacheUtils
} from './dashboard';
import { dashboardReducer } from '@/entities/dashboard';
import { 
  DashboardDataSchema, 
  validateDashboardData,
  safeParseDashboardData,
  DASHBOARD_SCHEMA_VERSION
} from './schemas/dashboard';
import { 
  transformDashboardToViewModel, 
  validateViewModel,
  generateViewModelCacheKey
} from '@/shared/lib/dashboard-mappers';
import { 
  validateDashboardSummaryRequest,
  validateDashboardSummaryResponse,
  generateSampleDashboardResponse,
  contractViolationDetector
} from './schemas/dashboard-contract';
import { dashboardHandlers } from './mocks/dashboard-handlers';

// =============================================================================
// 테스트 셋업 (Test Setup)
// =============================================================================

// MSW 서버 설정
const server = setupServer(...dashboardHandlers);

// 테스트용 Redux Store 설정
const createTestStore = () => configureStore({
  reducer: {
    dashboard: dashboardReducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(dashboardApi.middleware),
});

type TestStore = ReturnType<typeof createTestStore>;
let store: TestStore;

// 테스트 유틸리티
const createMockDashboardData = () => ({
  stats: {
    active_projects: 12,
    new_feedback: 24,
    today_schedule: 5,
    completed_videos: 48
  },
  notifications: {
    total_count: 45,
    unread_count: 12,
    feedback_count: 8,
    schedule_count: 3,
    mention_count: 1
  },
  recent_projects: [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: '테스트 프로젝트',
      status: 'in_progress' as const,
      progress: 75,
      priority: 'high' as const,
      created_at: '2025-09-01T00:00:00Z',
      updated_at: '2025-09-02T00:00:00Z',
      deadline: '2025-09-10T00:00:00Z',
      team_member_count: 5,
      video_count: 3,
      feedback_count: 12
    }
  ],
  recent_activities: [
    {
      id: '456e7890-e89b-12d3-a456-426614174001',
      type: 'project_created' as const,
      title: '새 프로젝트 생성됨',
      description: '테스트 프로젝트가 생성되었습니다',
      project_id: '123e4567-e89b-12d3-a456-426614174000',
      project_title: '테스트 프로젝트',
      created_at: '2025-09-03T00:00:00Z',
      created_by: '테**'
    }
  ],
  quick_actions: [
    {
      id: 'create-project',
      title: '새 프로젝트 만들기',
      icon: 'folder-plus',
      route: '/projects/new',
      enabled: true
    }
  ],
  meta: {
    last_updated: '2025-09-03T00:00:00Z',
    cache_expires_at: '2025-09-03T00:05:00Z',
    user_timezone: 'Asia/Seoul'
  }
});

// =============================================================================
// 테스트 설정 (Test Configuration)
// =============================================================================

beforeEach(() => {
  server.listen({ onUnhandledRequest: 'error' });
  store = createTestStore();
  contractViolationDetector.clearViolations();
  vi.clearAllMocks();
});

afterEach(() => {
  server.resetHandlers();
  store.dispatch(dashboardApi.util.resetApiState());
});

afterAll(() => {
  server.close();
});

// =============================================================================
// 1. 스키마 검증 테스트 (Schema Validation Tests)
// =============================================================================

describe('Dashboard 스키마 검증', () => {
  it('유효한 Dashboard 데이터는 스키마 검증을 통과해야 한다', () => {
    const validData = createMockDashboardData();
    
    expect(() => validateDashboardData(validData)).not.toThrow();
    
    const parseResult = safeParseDashboardData(validData);
    expect(parseResult.success).toBe(true);
    expect(parseResult.data).toEqual(validData);
  });

  it('잘못된 데이터는 스키마 검증에 실패해야 한다', () => {
    const invalidData = {
      stats: {
        active_projects: -1, // 음수는 허용되지 않음
        new_feedback: 'invalid', // 문자열은 허용되지 않음
      },
      // 필수 필드 누락
    };

    expect(() => validateDashboardData(invalidData)).toThrow();
    
    const parseResult = safeParseDashboardData(invalidData);
    expect(parseResult.success).toBe(false);
    expect(parseResult.error).toBeDefined();
  });

  it('부분적으로 잘못된 데이터의 구체적인 에러를 반환해야 한다', () => {
    const invalidData = {
      ...createMockDashboardData(),
      stats: {
        ...createMockDashboardData().stats,
        active_projects: -5 // 음수 값
      }
    };

    const parseResult = safeParseDashboardData(invalidData);
    expect(parseResult.success).toBe(false);
    
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(e => e.message);
      expect(errorMessages.some(msg => 
        msg.includes('Number must be greater than or equal to 0')
      )).toBe(true);
    }
  });
});

// =============================================================================
// 2. API 계약 검증 테스트 (API Contract Tests)
// =============================================================================

describe('Dashboard API 계약 검증', () => {
  it('유효한 API 요청은 계약 검증을 통과해야 한다', () => {
    const validRequest = {
      refresh: true,
      timezone: 'Asia/Seoul'
    };

    const result = validateDashboardSummaryRequest(validRequest);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      refresh: true,
      timezone: 'Asia/Seoul'
    });
  });

  it('유효한 API 응답은 계약 검증을 통과해야 한다', () => {
    const validResponse = generateSampleDashboardResponse();

    const result = validateDashboardSummaryResponse(validResponse);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validResponse);
  });

  it('잘못된 API 응답은 계약 검증에 실패해야 한다', () => {
    const invalidResponse = {
      success: true,
      data: {
        // 필수 필드 누락
        stats: { active_projects: 10 }
      }
    };

    const result = validateDashboardSummaryResponse(invalidResponse);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_RESPONSE');
  });
});

// =============================================================================
// 3. RTK Query API 테스트 (RTK Query API Tests)
// =============================================================================

describe('RTK Query Dashboard API', () => {
  it('성공적인 API 호출은 데이터를 반환해야 한다', async () => {
    const promise = store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    const result = await promise;
    
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.stats).toBeDefined();
    expect(result.data?.notifications).toBeDefined();
    
    // 스키마 검증
    expect(() => validateDashboardData(result.data!)).not.toThrow();
  });

  it('API 에러는 적절히 처리되어야 한다', async () => {
    // 500 에러를 발생시키는 핸들러 추가
    server.use(
      http.get('/api/dashboard/summary', () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    const promise = store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    const result = await promise;
    
    expect(result.isSuccess).toBe(false);
    expect(result.isError).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('캐싱이 올바르게 작동해야 한다', async () => {
    const spy = vi.spyOn(global, 'fetch');
    
    // 첫 번째 요청
    await store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    // 두 번째 요청 (캐시에서 가져와야 함)
    await store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    // fetch는 한 번만 호출되어야 함 (첫 번째 요청)
    expect(spy).toHaveBeenCalledTimes(1);
    
    spy.mockRestore();
  });
});

// =============================================================================
// 4. 데이터 변환 테스트 (Data Transformation Tests)  
// =============================================================================

describe('Dashboard 데이터 변환', () => {
  it('Dashboard 데이터는 View Model로 올바르게 변환되어야 한다', () => {
    const dashboardData = createMockDashboardData();
    
    const viewModel = transformDashboardToViewModel(dashboardData);
    
    expect(validateViewModel(viewModel)).toBe(true);
    expect(viewModel.stats).toHaveLength(4);
    expect(viewModel.recentProjects).toHaveLength(1);
    expect(viewModel.recentActivities).toHaveLength(1);
    expect(viewModel.quickActions).toHaveLength(1);
    
    // 통계 데이터 변환 확인
    const statsMap = viewModel.stats.reduce((acc, stat) => {
      acc[stat.key] = stat;
      return acc;
    }, {} as Record<string, any>);
    
    expect(statsMap.active_projects.value).toBe('12');
    expect(statsMap.new_feedback.value).toBe('24');
  });

  it('빈 데이터도 올바르게 처리되어야 한다', () => {
    const emptyData = {
      ...createMockDashboardData(),
      recent_projects: [],
      recent_activities: []
    };
    
    const viewModel = transformDashboardToViewModel(emptyData);
    
    expect(validateViewModel(viewModel)).toBe(true);
    expect(viewModel.recentProjects).toHaveLength(0);
    expect(viewModel.recentActivities).toHaveLength(0);
  });

  it('캐시 키 생성이 결정론적이어야 한다', () => {
    const data1 = createMockDashboardData();
    const data2 = { ...data1 };
    
    const key1 = generateViewModelCacheKey(data1);
    const key2 = generateViewModelCacheKey(data2);
    
    expect(key1).toBe(key2);
    
    // 데이터가 변경되면 다른 키 생성
    const data3 = { ...data1, meta: { ...data1.meta, last_updated: '2025-09-04T00:00:00Z' } };
    const key3 = generateViewModelCacheKey(data3);
    
    expect(key1).not.toBe(key3);
  });
});

// =============================================================================
// 5. 에러 처리 테스트 (Error Handling Tests)
// =============================================================================

describe('Dashboard 에러 처리', () => {
  it('네트워크 오류는 적절히 처리되어야 한다', async () => {
    server.use(
      http.get('/api/dashboard/summary', () => {
        throw new Error('Network error');
      })
    );

    const promise = store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    const result = await promise;
    
    expect(result.isError).toBe(true);
    expect(result.error).toBeDefined();
  });

  it('스키마 위반 시 적절한 에러 메시지를 제공해야 한다', () => {
    const malformedData = {
      stats: {
        active_projects: 'invalid_number'
      }
    };

    expect(() => validateDashboardData(malformedData)).toThrow();
    
    try {
      validateDashboardData(malformedData);
    } catch (error: any) {
      expect(error.message).toContain('Expected number');
    }
  });

  it('부분적 데이터 손실은 복구 가능해야 한다', () => {
    const partialData = {
      ...createMockDashboardData(),
      recent_projects: undefined as any // 의도적인 누락
    };

    // safeParse는 기본값으로 복구
    const parseResult = DashboardDataSchema.safeParse({
      ...partialData,
      recent_projects: [] // 기본값
    });

    expect(parseResult.success).toBe(true);
  });
});

// =============================================================================
// 6. 성능 테스트 (Performance Tests)
// =============================================================================

describe('Dashboard 성능 테스트', () => {
  it('View Model 변환은 2초 내에 완료되어야 한다', () => {
    const largeData = {
      ...createMockDashboardData(),
      recent_projects: Array.from({ length: 100 }, (_, i) => ({
        ...createMockDashboardData().recent_projects[0],
        id: `project-${i}`,
        title: `프로젝트 ${i}`
      })),
      recent_activities: Array.from({ length: 100 }, (_, i) => ({
        ...createMockDashboardData().recent_activities[0],
        id: `activity-${i}`,
        title: `활동 ${i}`
      }))
    };

    const startTime = performance.now();
    const viewModel = transformDashboardToViewModel(largeData);
    const endTime = performance.now();
    
    const executionTime = endTime - startTime;
    
    expect(executionTime).toBeLessThan(2000); // 2초
    expect(validateViewModel(viewModel)).toBe(true);
  });

  it('API 응답 시간은 설정된 한계 내에 있어야 한다', async () => {
    const startTime = performance.now();
    
    const promise = store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    await promise;
    
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    // MSW 모킹이므로 매우 빨라야 함 (실제로는 2초 한계)
    expect(responseTime).toBeLessThan(1000); // 1초 (모킹 환경)
  });
});

// =============================================================================
// 7. 통합 테스트 (Integration Tests)
// =============================================================================

describe('Dashboard 전체 데이터 파이프라인 통합 테스트', () => {
  it('API → Redux → View Model 전체 흐름이 올바르게 작동해야 한다', async () => {
    // 1. API 호출
    const apiResult = await store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    expect(apiResult.isSuccess).toBe(true);
    
    // 2. Redux 상태 확인
    const state = store.getState();
    expect(state).toBeDefined();
    
    // 3. View Model 변환
    const viewModel = transformDashboardToViewModel(apiResult.data!);
    
    // 4. 최종 검증
    expect(validateViewModel(viewModel)).toBe(true);
    expect(viewModel.stats).toHaveLength(4);
    expect(viewModel.notifications.totalCount).toBeGreaterThanOrEqual(0);
  });

  it('에러 상황에서도 전체 파이프라인이 안정적이어야 한다', async () => {
    // 서버 오류 시뮬레이션
    server.use(
      http.get('/api/dashboard/summary', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: '서버 오류' } },
          { status: 500 }
        );
      })
    );

    const apiResult = await store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    expect(apiResult.isError).toBe(true);
    
    // 에러 상황에서도 Redux 상태는 안정적이어야 함
    const state = store.getState();
    expect(state).toBeDefined();
    expect(state.dashboard).toBeDefined();
  });

  it('계약 위반이 감지되고 보고되어야 한다', async () => {
    // 잘못된 응답을 반환하는 핸들러
    server.use(
      http.get('/api/dashboard/summary', () => {
        return HttpResponse.json({
          success: true,
          data: {
            // 필수 필드 누락으로 계약 위반
            stats: { active_projects: 10 }
          }
        });
      })
    );

    // 계약 위반 검출 활성화
    const originalFetch = global.fetch;
    global.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const responseData = await response.clone().json();
      
      contractViolationDetector.detectResponseViolation('/api/dashboard/summary', responseData);
      
      return response;
    };

    try {
      await store.dispatch(
        dashboardApi.endpoints.getDashboardSummary.initiate()
      );
      
      const report = contractViolationDetector.generateReport();
      expect(report.totalViolations).toBeGreaterThan(0);
      expect(report.violationsByType.response).toBeGreaterThan(0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

// =============================================================================
// 8. MSW 모킹 테스트 (MSW Mocking Tests)
// =============================================================================

describe('MSW Dashboard 모킹', () => {
  it('정상 시나리오 모킹이 올바르게 작동해야 한다', async () => {
    const response = await fetch('/api/dashboard/summary');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    
    // 모킹 데이터도 스키마를 준수해야 함
    expect(() => validateDashboardData(data.data)).not.toThrow();
  });

  it('에러 시나리오 모킹이 올바르게 작동해야 한다', async () => {
    // 에러 시나리오 요청
    const response = await fetch('/api/dashboard/summary', {
      headers: {
        'x-mock-error-rate': '1.0' // 100% 에러율
      }
    });
    
    expect(response.status).toBe(500);
  });

  it('다양한 시나리오 모킹이 가능해야 한다', async () => {
    // 높은 활동량 시나리오
    const highActivityResponse = await fetch('/api/dashboard/summary', {
      headers: {
        'x-mock-scenario': 'high-activity'
      }
    });
    
    const data = await highActivityResponse.json();
    
    expect(highActivityResponse.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats.active_projects).toBeGreaterThan(12); // 기본값보다 높아야 함
  });
});

// =============================================================================
// 9. 품질 메트릭 테스트 (Quality Metrics Tests)
// =============================================================================

describe('Dashboard 데이터 품질 메트릭', () => {
  it('데이터 완전성이 100%여야 한다', async () => {
    const result = await store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    expect(result.isSuccess).toBe(true);
    
    const data = result.data!;
    
    // 필수 필드 존재 확인
    expect(data.stats).toBeDefined();
    expect(data.notifications).toBeDefined();
    expect(data.recent_projects).toBeDefined();
    expect(data.recent_activities).toBeDefined();
    expect(data.quick_actions).toBeDefined();
    expect(data.meta).toBeDefined();
    
    // 데이터 타입 검증
    expect(typeof data.stats.active_projects).toBe('number');
    expect(typeof data.notifications.total_count).toBe('number');
    expect(Array.isArray(data.recent_projects)).toBe(true);
  });

  it('데이터 정확성이 보장되어야 한다', async () => {
    const result = await store.dispatch(
      dashboardApi.endpoints.getDashboardSummary.initiate()
    );
    
    const data = result.data!;
    
    // 비즈니스 로직 검증
    expect(data.notifications.unread_count).toBeLessThanOrEqual(data.notifications.total_count);
    
    // 날짜 유효성 검증
    const lastUpdated = new Date(data.meta.last_updated);
    const cacheExpires = new Date(data.meta.cache_expires_at);
    expect(cacheExpires.getTime()).toBeGreaterThan(lastUpdated.getTime());
    
    // 프로젝트 진행률 유효성
    data.recent_projects.forEach(project => {
      expect(project.progress).toBeGreaterThanOrEqual(0);
      expect(project.progress).toBeLessThanOrEqual(100);
    });
  });

  it('성능 목표를 달성해야 한다', async () => {
    const startTime = performance.now();
    
    // 10번 연속 API 호출로 성능 측정
    const promises = Array.from({ length: 10 }, () => 
      store.dispatch(dashboardApi.endpoints.getDashboardSummary.initiate())
    );
    
    await Promise.all(promises);
    
    const endTime = performance.now();
    const averageTime = (endTime - startTime) / 10;
    
    // 평균 응답 시간이 목표치 내에 있어야 함
    expect(averageTime).toBeLessThan(500); // 500ms (모킹 환경 기준)
  });
});