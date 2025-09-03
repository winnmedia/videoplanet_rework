import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import {
  Notification,
  NotificationListResponse,
  GetNotificationsQuery,
  MarkNotificationAsReadCommand,
  BulkMarkNotificationsAsReadCommand,
  ArchiveNotificationCommand,
  NotificationSchema,
} from '../../../entities/notification'

// Response schemas for API validation
const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationSchema),
  total: z.number(),
  unreadCount: z.number(),
  hasMore: z.boolean(),
})

const MarkAsReadResponseSchema = z.object({
  success: z.boolean(),
  notification: NotificationSchema,
})

const BulkMarkAsReadResponseSchema = z.object({
  success: z.boolean(),
  updatedCount: z.number(),
  notifications: z.array(NotificationSchema),
})

const ArchiveResponseSchema = z.object({
  success: z.boolean(),
  notification: NotificationSchema,
})

const UnreadCountResponseSchema = z.object({
  unreadCount: z.number(),
})

// API endpoints
export const notificationApi = createApi({
  reducerPath: 'notificationApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/notifications',
    prepareHeaders: (headers, { getState }) => {
      // Add authentication token if available
      const token = (getState() as any)?.auth?.token
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Notification', 'NotificationCount'],
  endpoints: (builder) => ({
    // Get notifications list
    getNotifications: builder.query<NotificationListResponse, GetNotificationsQuery>({
      query: ({ userId, status, types, limit = 10, offset = 0, priority }) => ({
        url: '',
        params: {
          user_id: userId,
          status: status?.join(','),
          types: types?.join(','),
          limit,
          offset,
          priority: priority?.join(','),
        },
      }),
      transformResponse: (response: unknown): NotificationListResponse => {
        return NotificationListResponseSchema.parse(response)
      },
      providesTags: (result) => [
        'Notification',
        ...(result?.notifications.map(({ id }) => ({ type: 'Notification' as const, id })) || []),
      ],
    }),

    // Get unread notifications count
    getUnreadCount: builder.query<number, string>({
      query: (userId) => ({
        url: '/unread-count',
        params: { user_id: userId },
      }),
      transformResponse: (response: unknown): number => {
        const validated = UnreadCountResponseSchema.parse(response)
        return validated.unreadCount
      },
      providesTags: ['NotificationCount'],
    }),

    // Mark single notification as read
    markAsRead: builder.mutation<Notification, MarkNotificationAsReadCommand>({
      query: ({ notificationId, userId }) => ({
        url: `/${notificationId}/read`,
        method: 'PATCH',
        body: { user_id: userId },
      }),
      transformResponse: (response: unknown): Notification => {
        const validated = MarkAsReadResponseSchema.parse(response)
        return validated.notification
      },
      invalidatesTags: (result, error, { notificationId }) => [
        { type: 'Notification', id: notificationId },
        'NotificationCount',
      ],
    }),

    // Bulk mark notifications as read
    bulkMarkAsRead: builder.mutation<Notification[], BulkMarkNotificationsAsReadCommand>({
      query: ({ notificationIds, userId }) => ({
        url: '/bulk-read',
        method: 'PATCH',
        body: {
          notification_ids: notificationIds,
          user_id: userId,
        },
      }),
      transformResponse: (response: unknown): Notification[] => {
        const validated = BulkMarkAsReadResponseSchema.parse(response)
        return validated.notifications
      },
      invalidatesTags: (result, error, { notificationIds }) => [
        ...notificationIds.map(id => ({ type: 'Notification' as const, id })),
        'NotificationCount',
      ],
    }),

    // Archive notification
    archiveNotification: builder.mutation<Notification, ArchiveNotificationCommand>({
      query: ({ notificationId, userId }) => ({
        url: `/${notificationId}/archive`,
        method: 'PATCH',
        body: { user_id: userId },
      }),
      transformResponse: (response: unknown): Notification => {
        const validated = ArchiveResponseSchema.parse(response)
        return validated.notification
      },
      invalidatesTags: (result, error, { notificationId }) => [
        { type: 'Notification', id: notificationId },
        'NotificationCount',
      ],
    }),

    // Mark all notifications as read
    markAllAsRead: builder.mutation<{ updatedCount: number }, string>({
      query: (userId) => ({
        url: '/mark-all-read',
        method: 'PATCH',
        body: { user_id: userId },
      }),
      transformResponse: (response: unknown): { updatedCount: number } => {
        const validated = z.object({
          success: z.boolean(),
          updatedCount: z.number(),
        }).parse(response)
        return { updatedCount: validated.updatedCount }
      },
      invalidatesTags: ['Notification', 'NotificationCount'],
    }),

    // Refresh notifications (polling endpoint)
    refreshNotifications: builder.query<NotificationListResponse, { userId: string; lastFetch?: string }>({
      query: ({ userId, lastFetch }) => ({
        url: '/refresh',
        params: {
          user_id: userId,
          ...(lastFetch && { last_fetch: lastFetch }),
        },
      }),
      transformResponse: (response: unknown): NotificationListResponse => {
        return NotificationListResponseSchema.parse(response)
      },
      // Don't cache this query as it's for real-time updates
      keepUnusedDataFor: 0,
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useBulkMarkAsReadMutation,
  useArchiveNotificationMutation,
  useMarkAllAsReadMutation,
  useRefreshNotificationsQuery,
  useLazyGetNotificationsQuery,
  useLazyRefreshNotificationsQuery,
} = notificationApi

// Export reducer for store configuration
export const { reducer: notificationApiReducer } = notificationApi

// API endpoint selectors for external use
export const notificationApiEndpoints = notificationApi.endpoints