import { apiSlice } from '@/shared/api'

import type { Project, CreateProjectDto } from '../model/types'

export const projectApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createProject: builder.mutation<Project, CreateProjectDto>({
      query: (data) => ({
        url: '/projects',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Project']
    }),
    
    generateDefaultSchedule: builder.mutation<{
      data: {
        planning: { duration: number; startDate: string; endDate: string }
        shooting: { duration: number; startDate: string; endDate: string }
        editing: { duration: number; startDate: string; endDate: string }
      }
    }, void>({
      query: () => ({
        url: '/projects/default-schedule',
        method: 'POST',
      }),
    }),
  }),
})

export const { 
  useCreateProjectMutation,
  useGenerateDefaultScheduleMutation 
} = projectApi