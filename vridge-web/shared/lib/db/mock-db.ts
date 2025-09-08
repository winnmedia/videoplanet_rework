/**
 * @fileoverview Mock 데이터베이스
 * @description 개발 및 테스트용 인메모리 데이터베이스 구현
 * @layer shared/lib/db
 * @author Claude (AI Assistant)
 */

import bcrypt from 'bcryptjs'

import { type UserType as User } from '@/shared/api/schemas'

// 인메모리 사용자 데이터
export let users: Array<User & { password: string }> = [
  {
    id: 'user-admin',
    email: 'admin@videoplanet.com',
    name: '관리자',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq', // password123
    role: 'admin',
    isEmailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-1',
    email: 'user@videoplanet.com',
    name: '일반사용자',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq', // password123
    role: 'user',
    isEmailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2',
    email: 'user2@videoplanet.com',
    name: '사용자2',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq', // password123
    role: 'user',
    isEmailVerified: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-3',
    email: 'user3@videoplanet.com',
    name: '사용자3',
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
    id: `user-${Date.now()}`, // 단순한 ID 생성
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
 * 비밀번호 재설정 토큰 저장소
 */
interface ResetToken {
  token: string
  email: string
  expiresAt: string
  used: boolean
}

let resetTokens: ResetToken[] = []

/**
 * 비밀번호 재설정 토큰 생성 및 저장
 */
export function createPasswordResetToken(email: string): string {
  const token = `reset_${Date.now()}_${Math.random().toString(36).substring(2)}`
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24시간 후

  resetTokens.push({
    token,
    email,
    expiresAt,
    used: false,
  })

  return token
}

/**
 * 비밀번호 재설정 토큰 검증
 */
export function verifyPasswordResetToken(token: string): { valid: boolean; email?: string } {
  const resetToken = resetTokens.find(t => t.token === token && !t.used)

  if (!resetToken) {
    return { valid: false }
  }

  if (new Date() > new Date(resetToken.expiresAt)) {
    return { valid: false }
  }

  return { valid: true, email: resetToken.email }
}

/**
 * 비밀번호 재설정 토큰 사용 처리
 */
export function markPasswordResetTokenAsUsed(token: string): boolean {
  const resetToken = resetTokens.find(t => t.token === token)

  if (resetToken) {
    resetToken.used = true
    return true
  }

  return false
}

/**
 * 사용자 비밀번호 업데이트
 */
export async function updateUserPassword(email: string, newHashedPassword: string): Promise<boolean> {
  const userIndex = users.findIndex(u => u.email === email)

  if (userIndex === -1) return false

  users[userIndex] = {
    ...users[userIndex],
    password: newHashedPassword,
    updatedAt: new Date().toISOString(),
  }

  return true
}

/**
 * 데이터베이스 초기화 (테스트용)
 */
export function resetDatabase(): void {
  users = [
    {
      id: 'user-admin',
      email: 'admin@videoplanet.com',
      name: '관리자',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq',
      role: 'admin',
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-1',
      email: 'user@videoplanet.com',
      name: '일반사용자',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq',
      role: 'user',
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-2',
      email: 'user2@videoplanet.com',
      name: '사용자2',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJQhN8/LewdBPj/2b.S8u.Jq',
      role: 'user',
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 'user-3',
      email: 'user3@videoplanet.com',
      name: '사용자3',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/2b.S8u.Jq',
      role: 'user',
      isEmailVerified: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ]

  // 토큰 배열도 초기화
  resetTokens = []

  projects = [
    {
      id: 'project-1',
      name: '브랜드 홍보 영상 제작',
      description: '신제품 런칭을 위한 브랜드 홍보 영상 제작 프로젝트',
      status: 'ACTIVE',
      clientName: '테크 스타트업 A',
      budget: 5000000,
      startDate: '2024-01-01T00:00:00Z',
      endDate: '2024-02-01T00:00:00Z',
      createdBy: 'user-1',
      teamMembers: ['user-1', 'user-2'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: 'project-2',
      name: '교육 콘텐츠 영상',
      description: '온라인 교육을 위한 강의 영상 제작',
      status: 'ACTIVE',
      clientName: '에듀테크 회사 B',
      budget: 3000000,
      startDate: '2024-01-03T00:00:00Z',
      endDate: '2024-02-15T00:00:00Z',
      createdBy: 'user-2',
      teamMembers: ['user-2', 'user-3'],
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-04T00:00:00Z',
    },
    {
      id: 'project-3',
      name: '이벤트 하이라이트 영상',
      description: '컨퍼런스 이벤트의 하이라이트 영상 편집',
      status: 'COMPLETED',
      clientName: '이벤트 회사 C',
      budget: 2000000,
      startDate: '2024-01-05T00:00:00Z',
      endDate: '2024-01-20T00:00:00Z',
      createdBy: 'user-1',
      teamMembers: ['user-1'],
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-10T00:00:00Z',
    },
    {
      id: 'project-4',
      name: '제품 데모 영상',
      description: '새로운 앱 기능 소개를 위한 데모 영상',
      status: 'CANCELLED',
      clientName: '모바일 앱 회사 D',
      budget: 1500000,
      startDate: '2024-01-11T00:00:00Z',
      endDate: '2024-02-10T00:00:00Z',
      createdBy: 'user-3',
      teamMembers: ['user-3', 'user-1'],
      createdAt: '2024-01-11T00:00:00Z',
      updatedAt: '2024-01-12T00:00:00Z',
    },
    {
      id: 'project-5',
      name: '소셜미디어 숏폼 콘텐츠',
      description: 'TikTok, Instagram용 숏폼 콘텐츠 제작',
      status: 'ACTIVE',
      clientName: '패션 브랜드 E',
      budget: 4000000,
      startDate: '2024-01-13T00:00:00Z',
      endDate: '2024-03-01T00:00:00Z',
      createdBy: 'user-2',
      teamMembers: ['user-2', 'user-3', 'user-1'],
      createdAt: '2024-01-13T00:00:00Z',
      updatedAt: '2024-01-14T00:00:00Z',
    },
  ]
}

/**
 * 인메모리 프로젝트 데이터
 */
export interface MockProject {
  id: string
  name: string
  description?: string
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
  clientName: string
  budget: number
  startDate: string
  endDate: string
  createdBy: string
  teamMembers: string[]
  createdAt: string
  updatedAt: string
}

export let projects: MockProject[] = [
  {
    id: 'project-1',
    name: '브랜드 홍보 영상 제작',
    description: '신제품 런칭을 위한 브랜드 홍보 영상 제작 프로젝트',
    status: 'ACTIVE',
    clientName: '테크 스타트업 A',
    budget: 5000000,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-02-01T00:00:00Z',
    createdBy: 'user-1',
    teamMembers: ['user-1', 'user-2'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'project-2',
    name: '교육 콘텐츠 영상',
    description: '온라인 교육을 위한 강의 영상 제작',
    status: 'ACTIVE',
    clientName: '에듀테크 회사 B',
    budget: 3000000,
    startDate: '2024-01-03T00:00:00Z',
    endDate: '2024-02-15T00:00:00Z',
    createdBy: 'user-2',
    teamMembers: ['user-2', 'user-3'],
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-04T00:00:00Z',
  },
  {
    id: 'project-3',
    name: '이벤트 하이라이트 영상',
    description: '컨퍼런스 이벤트의 하이라이트 영상 편집',
    status: 'COMPLETED',
    clientName: '이벤트 회사 C',
    budget: 2000000,
    startDate: '2024-01-05T00:00:00Z',
    endDate: '2024-01-20T00:00:00Z',
    createdBy: 'user-1',
    teamMembers: ['user-1'],
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-10T00:00:00Z',
  },
  {
    id: 'project-4',
    name: '제품 데모 영상',
    description: '새로운 앱 기능 소개를 위한 데모 영상',
    status: 'CANCELLED',
    clientName: '모바일 앱 회사 D',
    budget: 1500000,
    startDate: '2024-01-11T00:00:00Z',
    endDate: '2024-02-10T00:00:00Z',
    createdBy: 'user-3',
    teamMembers: ['user-3', 'user-1'],
    createdAt: '2024-01-11T00:00:00Z',
    updatedAt: '2024-01-12T00:00:00Z',
  },
  {
    id: 'project-5',
    name: '소셜미디어 숏폼 콘텐츠',
    description: 'TikTok, Instagram용 숏폼 콘텐츠 제작',
    status: 'ACTIVE',
    clientName: '패션 브랜드 E',
    budget: 4000000,
    startDate: '2024-01-13T00:00:00Z',
    endDate: '2024-03-01T00:00:00Z',
    createdBy: 'user-2',
    teamMembers: ['user-2', 'user-3', 'user-1'],
    createdAt: '2024-01-13T00:00:00Z',
    updatedAt: '2024-01-14T00:00:00Z',
  },
]

/**
 * 모든 프로젝트 조회
 */
export async function getAllProjects(): Promise<MockProject[]> {
  return projects
}

/**
 * ID로 프로젝트 찾기
 */
export async function findProjectById(id: string): Promise<MockProject | null> {
  const project = projects.find(p => p.id === id)
  return project || null
}

/**
 * 새 프로젝트 생성
 */
export async function createProject(data: Omit<MockProject, 'id' | 'createdAt' | 'updatedAt'>): Promise<MockProject> {
  const newProject: MockProject = {
    id: `project-${Date.now()}`, // 단순한 ID 생성
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  projects.push(newProject)
  return newProject
}

/**
 * 프로젝트 업데이트
 */
export async function updateProject(
  id: string,
  updates: Partial<Omit<MockProject, 'id' | 'createdAt'>>
): Promise<MockProject | null> {
  const projectIndex = projects.findIndex(p => p.id === id)
  if (projectIndex === -1) return null

  projects[projectIndex] = {
    ...projects[projectIndex],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  return projects[projectIndex]
}

/**
 * 프로젝트 삭제
 */
export async function deleteProject(id: string): Promise<boolean> {
  const initialLength = projects.length
  projects = projects.filter(p => p.id !== id)
  return projects.length < initialLength
}

/**
 * 레거시 호환성을 위한 mockDB 객체
 * @deprecated 새로운 코드에서는 개별 함수를 직접 import하세요
 */
export const mockDB = {
  projects: {
    findAll: () => projects,
    findById: (id: string) => projects.find(p => p.id === id) || null,
    create: (data: Record<string, unknown>) => {
      const newProject = {
        id: `project-${Date.now()}`,
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      projects.push(newProject as MockProject)
      return newProject
    },
    update: (id: string, data: Record<string, unknown>) => {
      const projectIndex = projects.findIndex(p => p.id === id)
      if (projectIndex === -1) return null

      projects[projectIndex] = {
        ...projects[projectIndex],
        ...data,
        updatedAt: new Date().toISOString(),
      } as MockProject

      return projects[projectIndex]
    },
    delete: (id: string) => {
      const initialLength = projects.length
      projects = projects.filter(p => p.id !== id)
      return projects.length < initialLength
    },
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
