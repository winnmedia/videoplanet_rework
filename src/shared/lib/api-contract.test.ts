/**
 * API 계약 검증 테스트
 * TDD 원칙에 따라 먼저 실패하는 테스트 작성
 */

import { z } from 'zod'
import {
  validateApiContract,
  safeApiCall,
  ApiContractError,
  UserSchema,
  SignupRequestSchema,
  VideoMetadataSchema,
  FeedbackRequestSchema,
} from './api-contract'

describe('API Contract Validation', () => {
  describe('Schema Validation', () => {
    describe('UserSchema', () => {
      it('올바른 사용자 데이터를 검증해야 함', () => {
        const validUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: '2025-09-03T00:00:00Z',
          updatedAt: '2025-09-03T00:00:00Z',
        }
        
        expect(() => UserSchema.parse(validUser)).not.toThrow()
      })
      
      it('잘못된 이메일 형식을 거부해야 함', () => {
        const invalidUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'testuser',
          email: 'invalid-email',
          createdAt: '2025-09-03T00:00:00Z',
          updatedAt: '2025-09-03T00:00:00Z',
        }
        
        expect(() => UserSchema.parse(invalidUser)).toThrow(z.ZodError)
      })
      
      it('짧은 사용자명을 거부해야 함', () => {
        const invalidUser = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'ab', // 3자 미만
          email: 'test@example.com',
          createdAt: '2025-09-03T00:00:00Z',
          updatedAt: '2025-09-03T00:00:00Z',
        }
        
        expect(() => UserSchema.parse(invalidUser)).toThrow()
        expect(() => UserSchema.parse(invalidUser)).toThrow(/String must contain at least 3/)
      })
    })

    describe('SignupRequestSchema', () => {
      it('올바른 회원가입 요청을 검증해야 함', () => {
        const validRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        }
        
        expect(() => SignupRequestSchema.parse(validRequest)).not.toThrow()
      })
      
      it('비밀번호 불일치를 거부해야 함', () => {
        const invalidRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'DifferentPassword123!',
        }
        
        expect(() => SignupRequestSchema.parse(invalidRequest)).toThrow()
      })
      
      it('약한 비밀번호를 거부해야 함', () => {
        const invalidRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: '123', // 8자 미만
          confirmPassword: '123',
        }
        
        expect(() => SignupRequestSchema.parse(invalidRequest)).toThrow(/String must contain at least 8/)
      })
    })

    describe('VideoMetadataSchema', () => {
      it('올바른 비디오 메타데이터를 검증해야 함', () => {
        const validVideo = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          filename: 'test-video.mp4',
          size: 1024000,
          duration: 120.5,
          resolution: {
            width: 1920,
            height: 1080,
          },
          format: 'mp4' as const,
          quality: '1080p' as const,
          uploadedAt: '2025-09-03T00:00:00Z',
          status: 'completed' as const,
        }
        
        expect(() => VideoMetadataSchema.parse(validVideo)).not.toThrow()
      })
      
      it('지원하지 않는 비디오 형식을 거부해야 함', () => {
        const invalidVideo = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          filename: 'test-video.wmv',
          size: 1024000,
          duration: 120.5,
          resolution: { width: 1920, height: 1080 },
          format: 'wmv', // 지원하지 않는 형식
          quality: '1080p' as const,
          uploadedAt: '2025-09-03T00:00:00Z',
          status: 'completed' as const,
        }
        
        expect(() => VideoMetadataSchema.parse(invalidVideo)).toThrow()
      })
    })

    describe('FeedbackRequestSchema', () => {
      it('올바른 피드백 요청을 검증해야 함', () => {
        const validFeedback = {
          videoId: '123e4567-e89b-12d3-a456-426614174000',
          rating: 4,
          comment: '비디오 품질이 좋습니다.',
          category: 'quality' as const,
        }
        
        expect(() => FeedbackRequestSchema.parse(validFeedback)).not.toThrow()
      })
      
      it('범위를 벗어난 평점을 거부해야 함', () => {
        const invalidFeedback = {
          videoId: '123e4567-e89b-12d3-a456-426614174000',
          rating: 6, // 1-5 범위 초과
          comment: '테스트 피드백',
          category: 'quality' as const,
        }
        
        expect(() => FeedbackRequestSchema.parse(invalidFeedback)).toThrow()
      })
      
      it('너무 긴 댓글을 거부해야 함', () => {
        const invalidFeedback = {
          videoId: '123e4567-e89b-12d3-a456-426614174000',
          rating: 4,
          comment: 'x'.repeat(1001), // 1000자 초과
          category: 'quality' as const,
        }
        
        expect(() => FeedbackRequestSchema.parse(invalidFeedback)).toThrow(/String must contain at most 1000/)
      })
    })
  })

  describe('Contract Validation Functions', () => {
    describe('validateApiContract', () => {
      it('올바른 엔드포인트와 액션에 대해 검증자를 반환해야 함', () => {
        const validator = validateApiContract('auth', 'signup')
        
        expect(validator).toHaveProperty('validateRequest')
        expect(validator).toHaveProperty('validateResponse')
        expect(validator).toHaveProperty('contract')
        expect(validator.contract.method).toBe('POST')
        expect(validator.contract.path).toBe('/api/auth/signup')
      })
      
      it('요청 데이터를 올바르게 검증해야 함', () => {
        const validator = validateApiContract('auth', 'signup')
        
        const validRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        }
        
        expect(() => validator.validateRequest(validRequest)).not.toThrow()
      })
      
      it('잘못된 요청 데이터를 거부해야 함', () => {
        const validator = validateApiContract('auth', 'signup')
        
        const invalidRequest = {
          username: 'ab', // 너무 짧음
          email: 'invalid-email',
          password: '123',
          confirmPassword: '456',
        }
        
        expect(() => validator.validateRequest(invalidRequest)).toThrow(z.ZodError)
      })
    })
  })

  describe('safeApiCall', () => {
    it('올바른 요청과 응답에 대해 성공해야 함', async () => {
      const mockApiFetcher = jest.fn().mockResolvedValue({
        success: true,
        data: {
          user: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            username: 'testuser',
            email: 'test@example.com',
            createdAt: '2025-09-03T00:00:00Z',
            updatedAt: '2025-09-03T00:00:00Z',
          },
          tokens: {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
            expiresIn: 3600,
            tokenType: 'Bearer',
          },
        },
        timestamp: '2025-09-03T00:00:00Z',
      })
      
      const validRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      const response = await safeApiCall('auth', 'signup', validRequest, mockApiFetcher)
      
      expect(response.success).toBe(true)
      expect(response.data?.user.email).toBe('test@example.com')
      expect(mockApiFetcher).toHaveBeenCalledWith(validRequest, expect.any(Object))
    })
    
    it('잘못된 요청에 대해 ApiContractError를 던져야 함', async () => {
      const mockApiFetcher = jest.fn()
      
      const invalidRequest = {
        username: 'ab', // 너무 짧음
        email: 'invalid-email',
        password: '123',
        confirmPassword: '456',
      }
      
      await expect(
        safeApiCall('auth', 'signup', invalidRequest, mockApiFetcher)
      ).rejects.toThrow(ApiContractError)
      
      expect(mockApiFetcher).not.toHaveBeenCalled()
    })
    
    it('잘못된 응답에 대해 에러를 던져야 함', async () => {
      const mockApiFetcher = jest.fn().mockResolvedValue({
        success: 'invalid', // boolean이 아님
        data: null,
        timestamp: 'invalid-date',
      })
      
      const validRequest = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!',
      }
      
      await expect(
        safeApiCall('auth', 'signup', validRequest, mockApiFetcher)
      ).rejects.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('빈 옵션 필드를 올바르게 처리해야 함', () => {
      const videoWithoutOptionalFields = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        filename: 'test.mp4',
        size: 1024,
        duration: 60,
        resolution: { width: 1280, height: 720 },
        format: 'mp4' as const,
        quality: '720p' as const,
        uploadedAt: '2025-09-03T00:00:00Z',
        status: 'completed' as const,
      }
      
      expect(() => VideoMetadataSchema.parse(videoWithoutOptionalFields)).not.toThrow()
    })
    
    it('경계값 테스트 - 최소/최대 길이', () => {
      // 최소 길이 테스트
      const minValidUsername = 'abc' // 정확히 3자
      const userWithMinUsername = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: minValidUsername,
        email: 'test@example.com',
        createdAt: '2025-09-03T00:00:00Z',
        updatedAt: '2025-09-03T00:00:00Z',
      }
      
      expect(() => UserSchema.parse(userWithMinUsername)).not.toThrow()
      
      // 최대 길이 테스트
      const maxValidUsername = 'x'.repeat(50) // 정확히 50자
      const userWithMaxUsername = {
        ...userWithMinUsername,
        username: maxValidUsername,
      }
      
      expect(() => UserSchema.parse(userWithMaxUsername)).not.toThrow()
      
      // 경계 초과 테스트
      const tooLongUsername = 'x'.repeat(51) // 50자 초과
      const userWithTooLongUsername = {
        ...userWithMinUsername,
        username: tooLongUsername,
      }
      
      expect(() => UserSchema.parse(userWithTooLongUsername)).toThrow()
    })
  })
})