import { useState } from 'react';
import { api } from '@/lib/api/client';

export default function TestApiPage() {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setStatus('로그인 테스트 시작...');
    
    try {
      const response = await api.post('/users/login', {
        email: 'test@example.com',
        password: 'testpass123'
      }, { withAuth: true });
      
      setStatus(`성공: ${JSON.stringify(response.data)}`);
    } catch (error: any) {
      console.error('Login test error:', error);
      setStatus(`오류 발생: ${error.message || JSON.stringify(error)}`);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setLoading(true);
    setStatus('연결 테스트 시작...');
    
    try {
      // OPTIONS 요청을 먼저 보내서 CORS 설정 확인
      const response = await fetch('https://videoplanet.up.railway.app/users/login', {
        method: 'OPTIONS',
        headers: {
          'Origin': window.location.origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type'
        }
      });
      
      setStatus(`CORS 프리플라이트 응답: ${response.status} - Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
    } catch (error: any) {
      console.error('Connection test error:', error);
      setStatus(`연결 오류: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Railway API 연결 테스트</h1>
      
      <div className="space-y-4">
        <button
          onClick={testConnection}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? '테스트 중...' : '연결 테스트 (CORS 확인)'}
        </button>
        
        <button
          onClick={testLogin}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400 ml-4"
        >
          {loading ? '테스트 중...' : '로그인 테스트'}
        </button>
      </div>

      <div className="mt-6 p-4 border rounded">
        <h3 className="font-semibold mb-2">결과:</h3>
        <pre className="whitespace-pre-wrap text-sm bg-gray-100 p-2 rounded">
          {status || '테스트를 실행하려면 버튼을 클릭하세요.'}
        </pre>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="font-semibold mb-2">현재 설정:</h3>
        <p>API URL: {process.env.NEXT_PUBLIC_API_URL}</p>
        <p>Backend URL: {process.env.NEXT_PUBLIC_BACKEND_URL}</p>
        <p>현재 도메인: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</p>
      </div>
    </div>
  );
}