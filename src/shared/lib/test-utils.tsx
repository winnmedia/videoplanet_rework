/**
 * 테스트 유틸리티
 * RTK Query와 Redux를 위한 테스트 환경 설정
 */

import React, { PropsWithChildren } from 'react'
import { render as rtlRender } from '@testing-library/react'
import { configureStore } from '@reduxjs/toolkit'
import { Provider } from 'react-redux'
import { server } from '../api/mocks/server'
import { planningApi } from '../../features/video-planning/api/planningApi'

// Test store configuration
export const createTestStore = (preloadedState?: any) => {
  return configureStore({
    reducer: {
      // RTK Query API slice
      [planningApi.reducerPath]: planningApi.reducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // RTK Query에서 직렬화 검사를 비활성화 (테스트에서는 불필요)
        serializableCheck: {
          ignoredActions: [
            'persist/PERSIST',
            'persist/REHYDRATE',
            'persist/PAUSE',
            'persist/PURGE',
            'persist/REGISTER',
          ],
        },
      }).concat(planningApi.middleware),
  })
}

// Test wrapper with RTK Query provider
interface TestWrapperProps extends PropsWithChildren {
  store?: ReturnType<typeof createTestStore>
}

const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  store = createTestStore() 
}) => {
  return (
    <Provider store={store}>
      {children}
    </Provider>
  )
}

// Custom render function with RTK Query support
export const renderWithProviders = (
  ui: React.ReactElement,
  {
    store = createTestStore(),
    ...renderOptions
  }: {
    store?: ReturnType<typeof createTestStore>
  } & Omit<Parameters<typeof rtlRender>[1], 'wrapper'> = {}
) => {
  const Wrapper: React.FC<PropsWithChildren> = ({ children }) => (
    <TestWrapper store={store}>{children}</TestWrapper>
  )

  return {
    store,
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  }
}

// MSW server setup for tests
export const setupMSW = () => {
  // MSW 서버 설정
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })
}

// RTK Query cache cleanup
export const cleanupRTKQuery = () => {
  afterEach(() => {
    // RTK Query 캐시 초기화
    planningApi.util.resetApiState()
  })
}

// Re-export everything from RTL
export * from '@testing-library/react'
export { renderWithProviders as render }