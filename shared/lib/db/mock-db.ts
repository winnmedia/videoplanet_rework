/**
 * @fileoverview Mock 데이터베이스
 * @description 개발 및 테스트용 인메모리 데이터베이스 구현
 * @layer shared/lib/db
 * @author Claude (AI Assistant)
 */

import bcrypt from 'bcryptjs'

import { User } from '../schemas/auth.schema'

// 인메모리 사용자 데이터
export let users: Array<User & { password: string }> = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'admin@videoplanet.com',
    name: '관리자',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq', // password123
    role: 'admin',
    isEmailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'user@videoplanet.com',
    name: '일반사용자',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq', // password123
    role: 'user',
    isEmailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

/**
 * 이메일로 사용자 찾기
 */
export async function findUserByEmail(email: string): Promise<(User & { password: string }) | null> {
  const user = users.find(u => u.email === email)
  return user || null
}

/**
 * 사용자 ID로 찾기
 */
export async function findUserById(id: string): Promise<(User & { password: string }) | null> {
  const user = users.find(u => u.id === id)
  return user || null
}

/**
 * 새 사용자 생성
 */
export async function createUser(userData: {
  email: string
  name: string
  hashedPassword: string
  role?: string
}): Promise<User> {
  const newUser: User & { password: string } = {
    id: crypto.randomUUID(),
    email: userData.email,
    name: userData.name,
    password: userData.hashedPassword,
    role: (userData.role as 'user' | 'admin' | 'moderator') || 'user',
    isEmailVerified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  users.push(newUser)

  // 비밀번호 제외하고 반환
  const { password: _password, ...userWithoutPassword } = newUser
  return userWithoutPassword
}

/**
 * 사용자 정보 업데이트
 */
export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const userIndex = users.findIndex(u => u.id === id)
  if (userIndex === -1) return null

  users[userIndex] = {
    ...users[userIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  const { password: _password, ...userWithoutPassword } = users[userIndex]
  return userWithoutPassword
}

/**
 * 비밀번호 해싱
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * 비밀번호 검증
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword)
}

/**
 * 이메일 인증 상태 업데이트
 */
export async function verifyUserEmail(id: string): Promise<User | null> {
  return await updateUser(id, { isEmailVerified: true })
}

/**
 * 모든 사용자 조회 (관리자용)
 */
export async function getAllUsers(): Promise<User[]> {
  return users.map(user => {
    const { password: _password, ...userWithoutPassword } = user
    return userWithoutPassword
  })
}

/**
 * 사용자 삭제
 */
export async function deleteUser(id: string): Promise<boolean> {
  const initialLength = users.length
  users = users.filter(u => u.id !== id)
  return users.length < initialLength
}

/**
 * 데이터베이스 초기화 (테스트용)
 */
export function resetDatabase(): void {
  users = [
    {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'admin@videoplanet.com',
      name: '관리자',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq',
      role: 'admin',
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      email: 'user@videoplanet.com',
      name: '일반사용자',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq',
      role: 'user',
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]
}

/**
 * 레거시 호환성을 위한 mockDB 객체
 * @deprecated 새로운 코드에서는 개별 함수를 직접 import하세요
 */
export const mockDB = {
  projects: {
    findAll: () => [],
    findById: (_id: string) => null,
    create: (data: Record<string, unknown>) => ({ id: crypto.randomUUID(), ...data }),
    update: (_id: string, _data: Record<string, unknown>) => null,
    delete: (_id: string) => false,
  },
  users: {
    findAll: getAllUsers,
    findById: findUserById,
    findByEmail: findUserByEmail,
    create: createUser,
    update: updateUser,
    delete: deleteUser,
  },
}
