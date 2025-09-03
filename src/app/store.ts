import { configureStore } from '@reduxjs/toolkit'
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
// New architecture imports
import { authSlice } from '@/features/authentication/model/authStore'
import { pipelineSlice } from '@/processes/userPipeline/model/pipelineStore'
// Legacy imports (to be migrated)
import { projectManagementReducer, projectManagementApi } from '@/features/project-management'
import videoFeedbackReducer from '@/features/video-feedback/model/videoFeedbackSlice'
import { calendarReducer } from '@/features/calendar'
// New feature imports
import { planningSlice } from '@/features/video-planning/model/planningSlice'
import planningApi from '@/features/video-planning/api/planningApi'
// Dashboard imports
import { dashboardReducer } from '@/entities/dashboard'
import { dashboardApi } from '@/shared/api/dashboard'
// Notification imports
import { notificationReducer, notificationApi } from '@/features/notifications'

// Global Store Configuration
export const store = configureStore({
  reducer: {
    // New architecture slices
    auth: authSlice.reducer,
    pipeline: pipelineSlice.reducer,
    planning: planningSlice.reducer,
    dashboard: dashboardReducer,
    notifications: notificationReducer,
    // Legacy reducers (to be migrated)
    projectManagement: projectManagementReducer,
    videoFeedback: videoFeedbackReducer,
    calendar: calendarReducer,
    // RTK Query API slices
    [projectManagementApi.reducerPath]: projectManagementApi.reducer,
    [planningApi.reducerPath]: planningApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [notificationApi.reducerPath]: notificationApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        // Ignore Set serialization for pipeline state
        ignoredPaths: ['pipeline.completedSteps']
      },
    }).concat(
      projectManagementApi.middleware,
      planningApi.middleware,
      dashboardApi.middleware,
      notificationApi.middleware
    ),
  devTools: process.env.NODE_ENV !== 'production',
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks for better TypeScript support
export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

// Store provider component
export { store as appStore }