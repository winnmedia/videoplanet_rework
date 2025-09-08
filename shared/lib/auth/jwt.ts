/**
 * @fileoverview JWT 토큰 유틸리티
 * @description JWT 토큰 생성, 검증, 디코딩 기능 제공
 * @layer shared/lib/auth
 * @author Claude (AI Assistant)
 */

import jwt from 'jsonwebtoken'

import { User } from '../schemas/auth.schema'

// JWT 설정
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'development-refresh-secret-key'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'

/**
 * JWT 페이로드 타입
 */
export interface JwtPayload {
  userId: string
  email: string
  role: string
  iat?: number
  exp?: number
}

/**
 * 토큰 쌍 타입
 */
export interface TokenPair {
  token: string
  refreshToken: string
  expiresIn: number
}

/**
 * Access Token 생성
 */
export function generateAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'videoplanet',
    audience: 'videoplanet-users',
  } as jwt.SignOptions)
}

/**
 * Refresh Token 생성
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'videoplanet',
    audience: 'videoplanet-users',
  } as jwt.SignOptions)
}

/**
 * 토큰 쌍 생성
 */
export function generateTokens(user: Pick<User, 'id' | 'email' | 'role'>): TokenPair {
  const token = generateAccessToken(user)
  const refreshToken = generateRefreshToken(user.id)

  // JWT_EXPIRES_IN을 초로 변환
  const expiresIn = parseExpirationTime(JWT_EXPIRES_IN)

  return {
    token,
    refreshToken,
    expiresIn,
  }
}

/**
 * Access Token 검증
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'videoplanet',
      audience: 'videoplanet-users',
    }) as JwtPayload

    return decoded
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new Error('토큰이 만료되었습니다.')
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new Error('유효하지 않은 토큰입니다.')
    }
    throw new Error('토큰 검증에 실패했습니다.')
  }
}

/**
 * Refresh Token 검증
 */
export function verifyRefreshToken(refreshToken: string): { userId: string } {
  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET, {
      issuer: 'videoplanet',
      audience: 'videoplanet-users',
    }) as { userId: string }

    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('리프레시 토큰이 만료되었습니다.')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('유효하지 않은 리프레시 토큰입니다.')
    }
    throw new Error('리프레시 토큰 검증에 실패했습니다.')
  }
}

/**
 * 토큰 디코딩 (검증 없이)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null
    return decoded
  } catch (error) {
    return null
  }
}

/**
 * 토큰 만료 여부 확인
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token)
  if (!decoded || !decoded.exp) return true

  const currentTime = Math.floor(Date.now() / 1000)
  return decoded.exp < currentTime
}

/**
 * Authorization 헤더에서 토큰 추출
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null

  return parts[1]
}

/**
 * 만료 시간 문자열을 초로 변환
 */
function parseExpirationTime(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) return 3600 // 기본값: 1시간

  const [, value, unit] = match
  const numValue = parseInt(value, 10)

  switch (unit) {
    case 's':
      return numValue
    case 'm':
      return numValue * 60
    case 'h':
      return numValue * 60 * 60
    case 'd':
      return numValue * 60 * 60 * 24
    default:
      return 3600
  }
}

/**
 * 토큰 블랙리스트 (간단한 구현)
 * 실제 프로덕션에서는 Redis 등을 사용해야 함
 */
const tokenBlacklist = new Set<string>()

/**
 * 토큰을 블랙리스트에 추가
 */
export function blacklistToken(token: string): void {
  tokenBlacklist.add(token)
}

/**
 * 토큰이 블랙리스트에 있는지 확인
 */
export function isTokenBlacklisted(token: string): boolean {
  return tokenBlacklist.has(token)
}

/**
 * 블랙리스트 초기화 (테스트용)
 */
export function clearTokenBlacklist(): void {
  tokenBlacklist.clear()
}
