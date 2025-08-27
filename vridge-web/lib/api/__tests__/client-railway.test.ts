/**
 * TDD 테스트: Railway 백엔드 API 클라이언트 에러 핸들링
 */

import { api } from '../client';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper function to create complete Response mock
const createResponseMock = (options: {
  ok: boolean;
  status: number;
  statusText: string;
  data?: any;
  headers?: Record<string, string>;
}) => ({
  ok: options.ok,
  status: options.status,
  statusText: options.statusText,
  headers: new Headers(options.headers || { 'content-type': 'application/json' }),
  json: () => Promise.resolve(options.data || {}),
  text: () => Promise.resolve(JSON.stringify(options.data || {})),
  blob: () => Promise.resolve(new Blob()),
  clone: function() {
    return {
      ...this,
      json: () => Promise.resolve(options.data || {}),
    };
  }
});

describe('API Client Railway Integration (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'production';
  });

  describe('Railway 백엔드 에러 핸들링', () => {
    it('should handle 404 errors with Railway-specific message', async () => {
      mockFetch.mockResolvedValue(createResponseMock({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        data: { message: 'Not found' }
      }));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        await api.get('/users/login');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('API 엔드포인트를 찾을 수 없습니다');
        expect(error.code).toBe('RAILWAY_ENDPOINT_NOT_FOUND');
        expect(consoleErrorSpy).toHaveBeenCalledWith('Railway API Error:', expect.any(Object));
      }

      consoleErrorSpy.mockRestore();
    });

    it('should handle 403 auth errors with Railway-specific message', async () => {
      mockFetch.mockResolvedValue(createResponseMock({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        data: { message: '존재하지 않는 사용자입니다.' }
      }));

      try {
        await api.post('/users/login', { email: 'test@test.com', password: 'wrong' });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('존재하지 않는 사용자입니다.');
        expect(error.code).toBe('RAILWAY_AUTH_FAILED');
      }
    });

    it('should handle 500 server errors with Railway-specific message', async () => {
      mockFetch.mockResolvedValue(createResponseMock({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        data: {}
      }));

      try {
        await api.get('/users/profile');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Railway 서버 오류가 발생했습니다.');
        expect(error.code).toBe('RAILWAY_SERVER_ERROR');
      }
    });

    it('should handle network/CORS errors', async () => {
      mockFetch.mockResolvedValue(createResponseMock({
        ok: false,
        status: 0,
        statusText: '',
        data: {},
        headers: {}
      }));

      try {
        await api.get('/users/login');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Railway 백엔드 연결에 실패했습니다');
        expect(error.code).toBe('RAILWAY_CONNECTION_FAILED');
      }
    });
  });

  describe('프로덕션 환경 로깅', () => {
    it('should log errors in production environment', async () => {
      process.env.NODE_ENV = 'production';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValue(createResponseMock({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        data: { message: 'Not found' }
      }));

      try {
        await api.get('/test-endpoint');
      } catch (error) {
        // Expected error
      }

      expect(consoleErrorSpy).toHaveBeenCalledWith('Railway API Error:', {
        url: expect.stringContaining('/test-endpoint'),
        status: 404,
        statusText: 'Not Found',
        headers: expect.any(Object),
        data: { message: 'Not found' }
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not log errors in development environment', async () => {
      process.env.NODE_ENV = 'development';
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockFetch.mockResolvedValue(createResponseMock({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        data: { message: 'Not found' }
      }));

      try {
        await api.get('/test-endpoint');
      } catch (error) {
        // Expected error
      }

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});