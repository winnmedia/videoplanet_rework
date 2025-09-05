/**
 * User Entity - Public API
 * 사용자 관련 도메인 로직의 공개 인터페이스
 * 
 * FSD 준수: 이 파일만을 통해 user entity에 접근
 */

// Types
export type {
  User,
  UserProfile,
  CreateUserDto,
  UpdateUserDto,
} from './model/types';

// API hooks
export {
  userApi,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useGetCurrentUserQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from './api/userApi';