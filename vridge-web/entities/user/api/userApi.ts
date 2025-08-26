import { apiSlice } from '@/shared/api/apiSlice';
import type { User, UserProfile, UpdateUserDto } from '../model/types';

export const userApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/api/users',
      providesTags: ['User'],
    }),
    getUserById: builder.query<UserProfile, string>({
      query: (id) => `/api/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    getCurrentUser: builder.query<UserProfile, void>({
      query: () => '/api/users/me',
      providesTags: ['User'],
    }),
    updateUser: builder.mutation<UserProfile, { id: string; data: UpdateUserDto }>({
      query: ({ id, data }) => ({
        url: `/api/users/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetCurrentUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi;