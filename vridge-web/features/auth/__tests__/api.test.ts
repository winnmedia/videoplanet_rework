/**
 * TDD 테스트: Railway 백엔드 API 연결 검증
 */

import { authApi } from '../api/authApi';
import { config } from '@/lib/config/env';

describe('Auth API Integration (TDD)', () => {
  beforeAll(() => {
    // 테스트 환경에서 실제 Railway 엔드포인트 사용
    process.env.NEXT_PUBLIC_API_URL = 'https://videoplanet.up.railway.app';
    process.env.NEXT_PUBLIC_API_VERSION = '';
  });

  describe('API URL 구성', () => {
    it('should construct correct API endpoint without version prefix', () => {
      const endpoint = config.getApiEndpoint('users/login');
      expect(endpoint).toBe('https://videoplanet.up.railway.app/users/login');
    });

    it('should remove trailing slashes from base URL', () => {
      const endpoint = config.getApiEndpoint('/users/login');
      expect(endpoint).toBe('https://videoplanet.up.railway.app/users/login');
    });
  });

  describe('로그인 API 연결', () => {
    it('should make request to correct Railway endpoint', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: '잘못된 자격 증명입니다.' })
      });
      global.fetch = mockFetch;

      try {
        await authApi.login('test@example.com', 'wrongpassword');
      } catch (error) {
        // 실패는 예상되지만 올바른 URL로 요청되는지 확인
      }

      expect(mockFetch).toHaveBeenCalledWith(
        'https://videoplanet.up.railway.app/users/login',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
        })
      );
    });
  });
});