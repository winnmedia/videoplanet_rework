/**
 * Pact 기반 Consumer-Provider 계약 테스트
 * 프론트엔드(Consumer)가 백엔드(Provider) API 계약을 정의하고 검증
 */

import { PactV3 } from '@pact-foundation/pact'
import { MatchersV3 } from '@pact-foundation/pact'
import axios from 'axios'
import path from 'path'

const { like, eachLike, regex, iso8601DateTime } = MatchersV3

describe('VLANET API Contract Tests', () => {
  let provider: PactV3
  
  beforeAll(() => {
    provider = new PactV3({
      consumer: 'vridge-web',
      provider: 'vridge-api',
      port: 3001,
      dir: path.resolve(process.cwd(), 'pacts'),
      logLevel: 'info',
    })
  })

  afterEach(async () => {
    await provider.verify()
  })

  afterAll(async () => {
    await provider.finalize()
  })

  describe('Authentication API', () => {
    describe('POST /api/auth/signup', () => {
      it('새 사용자 회원가입 성공', async () => {
        // Given
        const expectedRequest = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        }

        const expectedResponse = {
          success: true,
          data: {
            user: {
              id: like('123e4567-e89b-12d3-a456-426614174000'),
              username: like('testuser'),
              email: like('test@example.com'),
              createdAt: iso8601DateTime(),
              updatedAt: iso8601DateTime(),
            },
            tokens: {
              accessToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
              refreshToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
              expiresIn: like(3600),
              tokenType: 'Bearer',
            },
          },
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('사용자가 존재하지 않음')
          .uponReceiving('새 사용자 회원가입 요청')
          .withRequest({
            method: 'POST',
            path: '/api/auth/signup',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expectedRequest,
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: expectedResponse,
          })

        // Then
        const response = await axios.post(
          `${provider.mockService.baseUrl}/api/auth/signup`,
          expectedRequest,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )

        expect(response.status).toBe(201)
        expect(response.data.success).toBe(true)
        expect(response.data.data.user.email).toBe(expectedRequest.email)
        expect(response.data.data.tokens.tokenType).toBe('Bearer')
      })

      it('중복된 이메일로 회원가입 실패', async () => {
        // Given
        const duplicateEmailRequest = {
          username: 'testuser2',
          email: 'existing@example.com',
          password: 'SecurePassword123!',
          confirmPassword: 'SecurePassword123!',
        }

        const errorResponse = {
          success: false,
          error: like('이미 존재하는 이메일입니다.'),
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('이메일이 이미 존재함')
          .uponReceiving('중복된 이메일로 회원가입 요청')
          .withRequest({
            method: 'POST',
            path: '/api/auth/signup',
            headers: {
              'Content-Type': 'application/json',
            },
            body: duplicateEmailRequest,
          })
          .willRespondWith({
            status: 409,
            headers: {
              'Content-Type': 'application/json',
            },
            body: errorResponse,
          })

        // Then
        try {
          await axios.post(
            `${provider.mockService.baseUrl}/api/auth/signup`,
            duplicateEmailRequest
          )
          fail('예외가 발생해야 함')
        } catch (error: any) {
          expect(error.response.status).toBe(409)
          expect(error.response.data.success).toBe(false)
          expect(error.response.data.error).toContain('이미 존재하는')
        }
      })
    })

    describe('POST /api/auth/login', () => {
      it('올바른 자격 증명으로 로그인 성공', async () => {
        // Given
        const loginRequest = {
          email: 'test@example.com',
          password: 'SecurePassword123!',
        }

        const loginResponse = {
          success: true,
          data: {
            user: {
              id: like('123e4567-e89b-12d3-a456-426614174000'),
              username: like('testuser'),
              email: like('test@example.com'),
              createdAt: iso8601DateTime(),
              updatedAt: iso8601DateTime(),
            },
            tokens: {
              accessToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
              refreshToken: like('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
              expiresIn: like(3600),
              tokenType: 'Bearer',
            },
          },
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('사용자가 올바른 자격 증명을 가지고 있음')
          .uponReceiving('로그인 요청')
          .withRequest({
            method: 'POST',
            path: '/api/auth/login',
            headers: {
              'Content-Type': 'application/json',
            },
            body: loginRequest,
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: loginResponse,
          })

        // Then
        const response = await axios.post(
          `${provider.mockService.baseUrl}/api/auth/login`,
          loginRequest
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.tokens.accessToken).toBeDefined()
      })
    })

    describe('GET /api/auth/me', () => {
      it('유효한 토큰으로 사용자 정보 조회', async () => {
        // Given
        const userResponse = {
          success: true,
          data: {
            id: like('123e4567-e89b-12d3-a456-426614174000'),
            username: like('testuser'),
            email: like('test@example.com'),
            createdAt: iso8601DateTime(),
            updatedAt: iso8601DateTime(),
            profile: {
              displayName: like('Test User'),
              avatar: like('https://example.com/avatar.jpg'),
            },
          },
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('사용자가 유효한 토큰을 가지고 있음')
          .uponReceiving('사용자 정보 조회 요청')
          .withRequest({
            method: 'GET',
            path: '/api/auth/me',
            headers: {
              'Authorization': regex('Bearer [A-Za-z0-9._-]+', 'Bearer token123'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: userResponse,
          })

        // Then
        const response = await axios.get(
          `${provider.mockService.baseUrl}/api/auth/me`,
          {
            headers: {
              'Authorization': 'Bearer token123',
            },
          }
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.email).toBeDefined()
      })
    })
  })

  describe('Video API', () => {
    describe('POST /api/video/upload', () => {
      it('비디오 업로드 성공', async () => {
        // Given
        const uploadResponse = {
          success: true,
          data: {
            id: like('123e4567-e89b-12d3-a456-426614174000'),
            filename: like('test-video.mp4'),
            size: like(1024000),
            duration: like(120.5),
            resolution: {
              width: like(1920),
              height: like(1080),
            },
            format: like('mp4'),
            quality: like('1080p'),
            uploadedAt: iso8601DateTime(),
            status: like('uploading'),
          },
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('사용자가 인증되어 있음')
          .uponReceiving('비디오 업로드 요청')
          .withRequest({
            method: 'POST',
            path: '/api/video/upload',
            headers: {
              'Authorization': regex('Bearer [A-Za-z0-9._-]+', 'Bearer token123'),
              'Content-Type': 'multipart/form-data',
            },
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: uploadResponse,
          })

        // Then - 실제 파일 업로드는 복잡하므로 응답 구조만 검증
        const mockFormData = new FormData()
        const response = await axios.post(
          `${provider.mockService.baseUrl}/api/video/upload`,
          mockFormData,
          {
            headers: {
              'Authorization': 'Bearer token123',
              'Content-Type': 'multipart/form-data',
            },
          }
        )

        expect(response.status).toBe(201)
        expect(response.data.success).toBe(true)
        expect(response.data.data.filename).toBeDefined()
        expect(response.data.data.status).toBe('uploading')
      })
    })

    describe('GET /api/video/:id/status', () => {
      it('비디오 처리 상태 조회', async () => {
        // Given
        const videoId = '123e4567-e89b-12d3-a456-426614174000'
        const statusResponse = {
          success: true,
          data: {
            videoId: like(videoId),
            status: like('processing'),
            progress: like(45),
            estimatedTimeRemaining: like(300),
          },
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('비디오가 처리 중임')
          .uponReceiving('비디오 처리 상태 조회 요청')
          .withRequest({
            method: 'GET',
            path: `/api/video/${videoId}/status`,
            headers: {
              'Authorization': regex('Bearer [A-Za-z0-9._-]+', 'Bearer token123'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: statusResponse,
          })

        // Then
        const response = await axios.get(
          `${provider.mockService.baseUrl}/api/video/${videoId}/status`,
          {
            headers: {
              'Authorization': 'Bearer token123',
            },
          }
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(response.data.data.videoId).toBe(videoId)
        expect(response.data.data.status).toBe('processing')
        expect(typeof response.data.data.progress).toBe('number')
      })
    })

    describe('GET /api/video', () => {
      it('사용자 비디오 목록 조회', async () => {
        // Given
        const videoListResponse = {
          success: true,
          data: {
            videos: eachLike({
              id: like('123e4567-e89b-12d3-a456-426614174000'),
              filename: like('video1.mp4'),
              size: like(1024000),
              duration: like(120.5),
              resolution: {
                width: like(1920),
                height: like(1080),
              },
              format: like('mp4'),
              quality: like('1080p'),
              uploadedAt: iso8601DateTime(),
              status: like('completed'),
            }),
            pagination: {
              page: like(1),
              limit: like(20),
              total: like(45),
              totalPages: like(3),
            },
          },
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('사용자가 비디오를 가지고 있음')
          .uponReceiving('비디오 목록 조회 요청')
          .withRequest({
            method: 'GET',
            path: '/api/video',
            query: {
              page: '1',
              limit: '20',
            },
            headers: {
              'Authorization': regex('Bearer [A-Za-z0-9._-]+', 'Bearer token123'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: videoListResponse,
          })

        // Then
        const response = await axios.get(
          `${provider.mockService.baseUrl}/api/video?page=1&limit=20`,
          {
            headers: {
              'Authorization': 'Bearer token123',
            },
          }
        )

        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(Array.isArray(response.data.data.videos)).toBe(true)
        expect(response.data.data.pagination.page).toBe(1)
      })
    })
  })

  describe('Feedback API', () => {
    describe('POST /api/feedback', () => {
      it('피드백 제출 성공', async () => {
        // Given
        const feedbackRequest = {
          videoId: '123e4567-e89b-12d3-a456-426614174000',
          rating: 4,
          comment: '비디오 품질이 매우 좋습니다.',
          category: 'quality',
        }

        const feedbackResponse = {
          success: true,
          data: {
            id: like('feedback-123'),
            videoId: like('123e4567-e89b-12d3-a456-426614174000'),
            userId: like('user-123'),
            rating: like(4),
            comment: like('비디오 품질이 매우 좋습니다.'),
            category: like('quality'),
            createdAt: iso8601DateTime(),
          },
          timestamp: iso8601DateTime(),
        }

        // When
        await provider
          .given('사용자가 인증되어 있고 비디오가 존재함')
          .uponReceiving('피드백 제출 요청')
          .withRequest({
            method: 'POST',
            path: '/api/feedback',
            headers: {
              'Authorization': regex('Bearer [A-Za-z0-9._-]+', 'Bearer token123'),
              'Content-Type': 'application/json',
            },
            body: feedbackRequest,
          })
          .willRespondWith({
            status: 201,
            headers: {
              'Content-Type': 'application/json',
            },
            body: feedbackResponse,
          })

        // Then
        const response = await axios.post(
          `${provider.mockService.baseUrl}/api/feedback`,
          feedbackRequest,
          {
            headers: {
              'Authorization': 'Bearer token123',
              'Content-Type': 'application/json',
            },
          }
        )

        expect(response.status).toBe(201)
        expect(response.data.success).toBe(true)
        expect(response.data.data.rating).toBe(4)
        expect(response.data.data.category).toBe('quality')
      })
    })
  })
})