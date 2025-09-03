/**
 * Dashboard Entity Public API
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * FSD 아키텍처 규칙:
 * - 모든 Dashboard 엔티티 관련 코드는 이 파일을 통해 import
 * - 내부 구현 세부사항 은닉
 * - 타입 안전성 및 계약 준수
 */

// Redux Slice
export {
  default as dashboardReducer,
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
  resetDashboard,
  updateViewModelCache,
  performAutoRefresh,
  selectDashboardState,
  selectCurrentData,
  selectViewModelCache,
  selectUIState,
  selectPreferences,
  selectSyncErrors,
  selectIsStale,
  selectHasErrors,
  selectFilteredActivities,
  selectVisibleQuickActions
} from './model/dashboardSlice';

// 타입 정의
export type { DashboardState } from './model/dashboardSlice';