/**
 * Dashboard Redux Slice - 엔티티 레이어
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * 상태 관리 원칙:
 * 1. 도메인 중심 상태 설계 (Dashboard 엔티티)
 * 2. RTK Query와의 완전한 통합
 * 3. 에러 상태 및 로딩 상태 관리
 * 4. 캐시 최적화 및 무효화 전략
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { dashboardApi } from '@/shared/api/dashboard';
import type { DashboardData } from '@/shared/api/schemas/dashboard';
import type { DashboardViewModel } from '@/shared/lib/dashboard-mappers';

// =============================================================================
// Dashboard 엔티티 상태 타입 정의 (Dashboard Entity State Types)
// =============================================================================

/**
 * Dashboard 엔티티 상태
 */
export interface DashboardState {
  // 현재 데이터
  currentData: DashboardData | null;
  
  // View Model 캐시
  viewModelCache: DashboardViewModel | null;
  
  // UI 상태
  ui: {
    isRefreshing: boolean;
    lastRefreshTime: string | null;
    autoRefreshEnabled: boolean;
    selectedStatCard: string | null;
    expandedProject: string | null;
    showAllActivities: boolean;
  };
  
  // 설정
  preferences: {
    refreshInterval: number; // 초 단위
    statCardOrder: string[];
    hiddenQuickActions: string[];
    activityFilters: {
      showProjectUpdates: boolean;
      showFeedback: boolean;
      showSchedule: boolean;
      showTeamChanges: boolean;
    };
  };
  
  // 메타데이터
  meta: {
    schemaVersion: string;
    lastSyncTime: string | null;
    syncErrors: Array<{
      timestamp: string;
      error: string;
      retryCount: number;
    }>;
  };
}

/**
 * 초기 상태
 */
const initialState: DashboardState = {
  currentData: null,
  viewModelCache: null,
  ui: {
    isRefreshing: false,
    lastRefreshTime: null,
    autoRefreshEnabled: true,
    selectedStatCard: null,
    expandedProject: null,
    showAllActivities: false
  },
  preferences: {
    refreshInterval: 300, // 5분
    statCardOrder: ['active_projects', 'new_feedback', 'today_schedule', 'completed_videos'],
    hiddenQuickActions: [],
    activityFilters: {
      showProjectUpdates: true,
      showFeedback: true,
      showSchedule: true,
      showTeamChanges: true
    }
  },
  meta: {
    schemaVersion: '1.0.0',
    lastSyncTime: null,
    syncErrors: []
  }
};

// =============================================================================
// Dashboard Slice 정의 (Dashboard Slice Definition)
// =============================================================================

export const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    // UI 상태 관리
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.ui.isRefreshing = action.payload;
      if (!action.payload) {
        state.ui.lastRefreshTime = new Date().toISOString();
      }
    },
    
    setAutoRefreshEnabled: (state, action: PayloadAction<boolean>) => {
      state.ui.autoRefreshEnabled = action.payload;
    },
    
    setSelectedStatCard: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedStatCard = action.payload;
    },
    
    setExpandedProject: (state, action: PayloadAction<string | null>) => {
      state.ui.expandedProject = action.payload;
    },
    
    toggleShowAllActivities: (state) => {
      state.ui.showAllActivities = !state.ui.showAllActivities;
    },
    
    // 설정 관리
    updateRefreshInterval: (state, action: PayloadAction<number>) => {
      state.preferences.refreshInterval = action.payload;
    },
    
    reorderStatCards: (state, action: PayloadAction<string[]>) => {
      state.preferences.statCardOrder = action.payload;
    },
    
    toggleQuickAction: (state, action: PayloadAction<string>) => {
      const actionId = action.payload;
      const hiddenActions = state.preferences.hiddenQuickActions;
      const index = hiddenActions.indexOf(actionId);
      
      if (index >= 0) {
        hiddenActions.splice(index, 1);
      } else {
        hiddenActions.push(actionId);
      }
    },
    
    updateActivityFilters: (state, action: PayloadAction<Partial<DashboardState['preferences']['activityFilters']>>) => {
      state.preferences.activityFilters = {
        ...state.preferences.activityFilters,
        ...action.payload
      };
    },
    
    // View Model 캐시 관리
    setViewModelCache: (state, action: PayloadAction<DashboardViewModel | null>) => {
      state.viewModelCache = action.payload;
    },
    
    clearViewModelCache: (state) => {
      state.viewModelCache = null;
    },
    
    // 에러 관리
    addSyncError: (state, action: PayloadAction<{ error: string; retryCount?: number }>) => {
      const { error, retryCount = 0 } = action.payload;
      state.meta.syncErrors.push({
        timestamp: new Date().toISOString(),
        error,
        retryCount
      });
      
      // 최대 10개의 에러만 보관
      if (state.meta.syncErrors.length > 10) {
        state.meta.syncErrors.shift();
      }
    },
    
    clearSyncErrors: (state) => {
      state.meta.syncErrors = [];
    },
    
    // 상태 초기화
    resetDashboard: () => initialState
  },
  
  // =============================================================================
  // RTK Query 통합 (RTK Query Integration)
  // =============================================================================
  extraReducers: (builder) => {
    builder
      // Dashboard 요약 데이터 로딩
      .addMatcher(
        dashboardApi.endpoints.getDashboardSummary.matchPending,
        (state) => {
          state.ui.isRefreshing = true;
          state.meta.lastSyncTime = new Date().toISOString();
        }
      )
      .addMatcher(
        dashboardApi.endpoints.getDashboardSummary.matchFulfilled,
        (state, action) => {
          state.ui.isRefreshing = false;
          state.currentData = action.payload;
          state.ui.lastRefreshTime = new Date().toISOString();
          
          // 성공 시 에러 초기화
          if (state.meta.syncErrors.length > 0) {
            state.meta.syncErrors = [];
          }
        }
      )
      .addMatcher(
        dashboardApi.endpoints.getDashboardSummary.matchRejected,
        (state, action) => {
          state.ui.isRefreshing = false;
          
          // 에러 추가
          const errorMessage = action.error.message || 'Dashboard 데이터를 불러올 수 없습니다';
          state.meta.syncErrors.push({
            timestamp: new Date().toISOString(),
            error: errorMessage,
            retryCount: 0
          });
        }
      )
      
      // 통계 데이터만 로딩
      .addMatcher(
        dashboardApi.endpoints.getDashboardStats.matchFulfilled,
        (state, action) => {
          // 기존 데이터가 있다면 통계만 업데이트
          if (state.currentData) {
            state.currentData.stats = action.payload;
          }
        }
      )
      
      // 알림 요약 데이터 로딩
      .addMatcher(
        dashboardApi.endpoints.getNotificationSummary.matchFulfilled,
        (state, action) => {
          // 기존 데이터가 있다면 알림만 업데이트
          if (state.currentData) {
            state.currentData.notifications = action.payload;
          }
        }
      );
  }
});

// =============================================================================
// Actions Export (액션 내보내기)
// =============================================================================

export const {
  setRefreshing,
  setAutoRefreshEnabled,
  setSelectedStatCard,
  setExpandedProject,
  toggleShowAllActivities,
  updateRefreshInterval,
  reorderStatCards,
  toggleQuickAction,
  updateActivityFilters,
  setViewModelCache,
  clearViewModelCache,
  addSyncError,
  clearSyncErrors,
  resetDashboard
} = dashboardSlice.actions;

// =============================================================================
// 셀렉터 정의 (Selectors Definition)
// =============================================================================

import type { RootState } from '@/app/store';

/**
 * 기본 셀렉터들
 */
export const selectDashboardState = (state: RootState) => state.dashboard;
export const selectCurrentData = (state: RootState) => state.dashboard.currentData;
export const selectViewModelCache = (state: RootState) => state.dashboard.viewModelCache;
export const selectUIState = (state: RootState) => state.dashboard.ui;
export const selectPreferences = (state: RootState) => state.dashboard.preferences;
export const selectSyncErrors = (state: RootState) => state.dashboard.meta.syncErrors;

/**
 * 계산된 셀렉터들
 */
export const selectIsStale = (state: RootState) => {
  const { currentData, ui } = state.dashboard;
  if (!currentData || !ui.lastRefreshTime) return true;
  
  const lastRefresh = new Date(ui.lastRefreshTime);
  const staleTime = new Date(currentData.meta.cache_expires_at);
  
  return new Date() > staleTime;
};

export const selectHasErrors = (state: RootState) => {
  return state.dashboard.meta.syncErrors.length > 0;
};

export const selectFilteredActivities = (state: RootState) => {
  const { currentData, preferences } = state.dashboard;
  if (!currentData) return [];
  
  const { activityFilters } = preferences;
  
  return currentData.recent_activities.filter(activity => {
    switch (activity.type) {
      case 'project_created':
      case 'project_updated':
        return activityFilters.showProjectUpdates;
      case 'feedback_received':
        return activityFilters.showFeedback;
      case 'schedule_created':
        return activityFilters.showSchedule;
      case 'team_member_added':
        return activityFilters.showTeamChanges;
      default:
        return true;
    }
  });
};

export const selectVisibleQuickActions = (state: RootState) => {
  const { currentData, preferences } = state.dashboard;
  if (!currentData) return [];
  
  return currentData.quick_actions.filter(
    action => !preferences.hiddenQuickActions.includes(action.id)
  );
};

// =============================================================================
// 비동기 Thunk 액션들 (Async Thunk Actions)
// =============================================================================

import { createAsyncThunk } from '@reduxjs/toolkit';
import { transformDashboardToViewModel, validateViewModel } from '@/shared/lib/dashboard-mappers';

/**
 * View Model 생성 및 캐시 업데이트 Thunk
 */
export const updateViewModelCache = createAsyncThunk(
  'dashboard/updateViewModelCache',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const currentData = state.dashboard.currentData;
    
    if (!currentData) {
      throw new Error('Dashboard 데이터가 없습니다');
    }
    
    try {
      // DTO → View Model 변환
      const viewModel = transformDashboardToViewModel(currentData);
      
      // View Model 검증
      if (!validateViewModel(viewModel)) {
        throw new Error('생성된 View Model이 유효하지 않습니다');
      }
      
      // 캐시 업데이트
      dispatch(setViewModelCache(viewModel));
      
      return viewModel;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'View Model 생성 실패';
      dispatch(addSyncError({ error: errorMessage }));
      throw error;
    }
  }
);

/**
 * 자동 새로고침 Thunk
 */
export const performAutoRefresh = createAsyncThunk(
  'dashboard/performAutoRefresh',
  async (_, { getState, dispatch }) => {
    const state = getState() as RootState;
    const { ui, preferences } = state.dashboard;
    
    if (!ui.autoRefreshEnabled) {
      return null;
    }
    
    const lastRefresh = ui.lastRefreshTime ? new Date(ui.lastRefreshTime) : new Date(0);
    const now = new Date();
    const refreshInterval = preferences.refreshInterval * 1000; // 밀리초로 변환
    
    if (now.getTime() - lastRefresh.getTime() >= refreshInterval) {
      // RTK Query refetch 실행
      dispatch(dashboardApi.endpoints.getDashboardSummary.initiate(undefined, { forceRefetch: true }));
    }
    
    return null;
  }
);

// Reducer 내보내기
export default dashboardSlice.reducer;