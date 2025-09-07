import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';

import { notificationSlice } from '@/entities/notification';
import projectReducer from '@/entities/project/model/projectSlice';
import authReducer from '@/features/auth/model/authSlice';
import projectsReducer from '@/features/projects/model/projectSlice';
import uiReducer from '@/features/ui/model/uiSlice';
import videoPlanningWizardReducer from '@/features/video-planning-wizard/model/videoPlanningSlice';
import { apiSlice } from '@/shared/api/apiSlice';
import collaborationReducer from '@/shared/lib/collaboration/slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    notifications: notificationSlice.reducer,
    videoPlanningWizard: videoPlanningWizardReducer,
    project: projectReducer,
    projects: projectsReducer,
    collaboration: collaborationReducer.reducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/setCredentials'],
      },
    }).concat(apiSlice.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;