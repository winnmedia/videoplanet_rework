/**
 * E2E 테스트: Railway API 에러 핸들링 종합 테스트
 */

import { authApi } from '@/features/auth/api/authApi';

describe('Railway API Error Handling E2E (TDD)', () => {
  beforeAll(() => {
    // 실제 Railway 환경 사용
    process.env.NEXT_PUBLIC_API_URL = 'https://videoplanet.up.railway.app';
    process.env.NEXT_PUBLIC_API_VERSION = '';
  });

  describe('로그인 API 에러 시나리오', () => {
    it('should handle invalid email format gracefully', async () => {
      try {
        await authApi.login('invalid-email', 'password');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/(이메일|형식|인증)/);
        expect(error.message).not.toContain('Railway');
        expect(error.message).not.toContain('500');
      }
    });

    it('should handle missing email field', async () => {
      try {
        await authApi.login('', 'password');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/(이메일|필수|인증)/);
        expect(error.message).not.toContain('undefined');
      }
    });

    it('should handle non-existent user properly', async () => {
      try {
        await authApi.login('nonexistent@example.com', 'password');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/(존재하지|사용자|인증)/);
        expect(typeof error.message).toBe('string');
      }
    });

    it('should handle wrong password gracefully', async () => {
      try {
        await authApi.login('test@example.com', 'wrongpassword');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/(비밀번호|인증|실패)/);
        expect(error.message).not.toContain('500');
      }
    });

    it('should handle network errors', async () => {
      // Temporarily override API URL to simulate network error
      const originalUrl = process.env.NEXT_PUBLIC_API_URL;
      process.env.NEXT_PUBLIC_API_URL = 'https://nonexistent.domain.fake';
      
      try {
        await authApi.login('test@example.com', 'password');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/(네트워크|연결|서버)/);
      } finally {
        process.env.NEXT_PUBLIC_API_URL = originalUrl;
      }
    });
  });

  describe('회원가입 API 에러 시나리오', () => {
    it('should handle duplicate email registration', async () => {
      try {
        await authApi.signup({
          email: 'existing@example.com',
          nickname: 'test',
          password: 'password123',
          auth_number: '123456'
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/(이미|존재|가입)/);
        expect(error.message).not.toContain('500');
      }
    });

    it('should handle invalid signup data', async () => {
      try {
        await authApi.signup({
          email: 'invalid-email',
          nickname: '',
          password: '123',
          auth_number: ''
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/(형식|필수|유효)/);
      }
    });
  });

  describe('에러 메시지 사용자 친화성 검증', () => {
    it('should provide user-friendly error messages without technical details', async () => {
      const testCases = [
        { email: 'test@example.com', password: 'wrong' },
        { email: 'nonexistent@test.com', password: 'password' },
        { email: 'invalid-format', password: 'password' }
      ];

      for (const testCase of testCases) {
        try {
          await authApi.login(testCase.email, testCase.password);
          expect.fail(`Should have thrown error for ${testCase.email}`);
        } catch (error: any) {
          // 기술적 용어가 포함되지 않아야 함
          expect(error.message).not.toContain('500');
          expect(error.message).not.toContain('Internal Server Error');
          expect(error.message).not.toContain('Django');
          expect(error.message).not.toContain('Railway');
          expect(error.message).not.toContain('fetch');
          
          // 사용자가 이해할 수 있는 메시지여야 함
          expect(error.message.length).toBeGreaterThan(5);
          expect(error.message).toMatch(/[가-힣]/); // 한글 포함 확인
        }
      }
    });

    it('should provide actionable error messages', async () => {
      try {
        await authApi.login('test@example.com', 'wrongpassword');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        // 사용자가 무엇을 해야 하는지 알 수 있는 메시지
        expect(error.message).toMatch(/(확인|시도|문의)/);
      }
    });
  });
});