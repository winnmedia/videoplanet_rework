/**
 * API 보안 테스트 스위트
 * SQL Injection, XSS, UUID 검증 등 주요 보안 취약점 테스트
 */

import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// 보안 테스트용 악의적인 페이로드
const MALICIOUS_PAYLOADS = {
  sqlInjection: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin' --",
    "1; DELETE FROM feedback WHERE 1=1; --",
    "' OR 1=1 --",
    "UNION SELECT * FROM users --"
  ],
  xss: [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "javascript:alert('XSS')",
    "<svg/onload=alert('XSS')>",
    "';alert(String.fromCharCode(88,83,83))//",
    "<iframe src=javascript:alert('XSS')>"
  ],
  pathTraversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
    "....//....//....//etc/passwd"
  ],
  invalidUUID: [
    "not-a-uuid",
    "12345",
    "'; DROP TABLE feedback; --",
    "<script>alert('uuid')</script>",
    "../../etc/passwd",
    "null",
    "undefined",
    "",
    " ",
    "00000000-0000-0000-0000-000000000000" // Nil UUID
  ]
}

// 테스트 서버 설정
const server = setupServer(
  // Feedback API 핸들러
  http.get('/api/feedback/:id', async ({ params }) => {
    const id = params.id as string
    
    // UUID 형식 검증
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    const fbIdRegex = /^fb-\d+$/
    
    if (!uuidRegex.test(id) && !fbIdRegex.test(id)) {
      return HttpResponse.json(
        { error: 'Invalid ID format' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      id,
      title: 'Test Feedback',
      content: 'Safe content'
    })
  }),
  
  http.post('/api/feedback', async ({ request }) => {
    const body = await request.json() as any
    
    // 입력 검증
    if (!body.title || !body.content) {
      return HttpResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // XSS 방지를 위한 HTML 이스케이핑
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
    }
    
    return HttpResponse.json({
      id: 'fb-new',
      title: escapeHtml(body.title),
      content: escapeHtml(body.content)
    })
  }),
  
  http.post('/api/video-planning/generate-stages', async ({ request }) => {
    const body = await request.json() as any
    
    // 입력 타입 검증
    if (typeof body.title !== 'string' || typeof body.logline !== 'string') {
      return HttpResponse.json(
        { error: 'Invalid input type' },
        { status: 400 }
      )
    }
    
    // 길이 제한
    if (body.title.length > 200 || body.logline.length > 1000) {
      return HttpResponse.json(
        { error: 'Input too long' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      success: true,
      stages: []
    })
  })
)

beforeAll(() => server.listen())
afterAll(() => server.close())

describe('API 보안 테스트', () => {
  describe('UUID 검증', () => {
    it.each(MALICIOUS_PAYLOADS.invalidUUID)(
      'should reject invalid UUID: %s',
      async (invalidId) => {
        const response = await fetch(`/api/feedback/${encodeURIComponent(invalidId)}`)
        
        expect(response.ok).toBe(false)
        expect(response.status).toBe(400)
        
        const data = await response.json()
        expect(data.error).toBeDefined()
      }
    )
    
    it('should accept valid UUID formats', async () => {
      const validIds = [
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        'fb-001',
        'FB-999'
      ]
      
      for (const id of validIds) {
        const response = await fetch(`/api/feedback/${id}`)
        expect(response.ok).toBe(true)
      }
    })
  })
  
  describe('SQL Injection 방지', () => {
    it.each(MALICIOUS_PAYLOADS.sqlInjection)(
      'should sanitize SQL injection attempt: %s',
      async (sqlPayload) => {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sqlPayload,
            content: 'Test content'
          })
        })
        
        // 요청은 성공하지만 SQL이 실행되지 않음
        expect(response.ok).toBe(true)
        
        const data = await response.json()
        // SQL 구문이 이스케이프되어 있어야 함
        expect(data.title).not.toContain('DROP')
        expect(data.title).not.toContain('DELETE')
        expect(data.title).not.toContain('--')
      }
    )
  })
  
  describe('XSS 방지', () => {
    it.each(MALICIOUS_PAYLOADS.xss)(
      'should escape XSS attempt: %s',
      async (xssPayload) => {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Test',
            content: xssPayload
          })
        })
        
        expect(response.ok).toBe(true)
        
        const data = await response.json()
        // HTML 태그가 이스케이프되어 있어야 함
        expect(data.content).not.toContain('<script>')
        expect(data.content).not.toContain('<img')
        expect(data.content).not.toContain('javascript:')
        expect(data.content).toContain('&lt;')
      }
    )
  })
  
  describe('Path Traversal 방지', () => {
    it.each(MALICIOUS_PAYLOADS.pathTraversal)(
      'should reject path traversal attempt: %s',
      async (pathPayload) => {
        const response = await fetch(`/api/feedback/${encodeURIComponent(pathPayload)}`)
        
        expect(response.ok).toBe(false)
        expect(response.status).toBe(400)
      }
    )
  })
  
  describe('입력 검증', () => {
    it('should validate required fields', async () => {
      const invalidPayloads = [
        {},
        { title: '' },
        { content: '' },
        { title: null, content: 'test' },
        { title: 'test', content: undefined }
      ]
      
      for (const payload of invalidPayloads) {
        const response = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        expect(response.ok).toBe(false)
        expect(response.status).toBe(400)
      }
    })
    
    it('should enforce length limits', async () => {
      const longString = 'a'.repeat(10000)
      
      const response = await fetch('/api/video-planning/generate-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: longString,
          logline: longString
        })
      })
      
      expect(response.ok).toBe(false)
      expect(response.status).toBe(400)
    })
    
    it('should validate data types', async () => {
      const invalidTypes = [
        { title: 123, logline: 'test' },
        { title: 'test', logline: {} },
        { title: ['array'], logline: 'test' },
        { title: true, logline: false }
      ]
      
      for (const payload of invalidTypes) {
        const response = await fetch('/api/video-planning/generate-stages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        expect(response.ok).toBe(false)
        expect(response.status).toBe(400)
      }
    })
  })
  
  describe('에러 메시지 보안', () => {
    it('should not expose sensitive information in error messages', async () => {
      const response = await fetch('/api/feedback/../../etc/passwd')
      
      expect(response.ok).toBe(false)
      
      const data = await response.json()
      // 에러 메시지에 시스템 경로나 민감한 정보가 포함되어서는 안됨
      expect(JSON.stringify(data)).not.toContain('etc/passwd')
      expect(JSON.stringify(data)).not.toContain('stack')
      expect(JSON.stringify(data)).not.toContain('trace')
    })
  })
  
  describe('Rate Limiting', () => {
    it('should implement rate limiting for API endpoints', async () => {
      // 짧은 시간에 많은 요청을 보내는 테스트
      const requests = Array(100).fill(null).map(() => 
        fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test', content: 'Test' })
        })
      )
      
      const responses = await Promise.all(requests)
      
      // 일부 요청은 429 (Too Many Requests) 상태를 반환해야 함
      const rateLimited = responses.filter(r => r.status === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })
  
  describe('CORS 설정', () => {
    it('should have proper CORS headers', async () => {
      const response = await fetch('/api/feedback', {
        method: 'OPTIONS'
      })
      
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined()
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined()
    })
  })
})

describe('프론트엔드 입력 보안', () => {
  describe('폼 입력 검증', () => {
    it('should sanitize form inputs before submission', () => {
      const sanitizeInput = (input: string): string => {
        return input
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, '')
          .trim()
      }
      
      const maliciousInputs = [
        "<script>alert('xss')</script>Normal text",
        "Normal<img src=x onerror=alert(1)>text",
        "<div onclick='alert(1)'>Click me</div>"
      ]
      
      for (const input of maliciousInputs) {
        const sanitized = sanitizeInput(input)
        expect(sanitized).not.toContain('<script')
        expect(sanitized).not.toContain('onclick')
        expect(sanitized).not.toContain('onerror')
      }
    })
  })
  
  describe('URL 파라미터 검증', () => {
    it('should validate URL parameters', () => {
      const isValidProjectId = (id: string): boolean => {
        // 프로젝트 ID는 알파벳, 숫자, 하이픈, 언더스코어만 허용
        return /^[a-zA-Z0-9_-]+$/.test(id)
      }
      
      const validIds = ['proj-001', 'project_123', 'ABC123']
      const invalidIds = [
        '../etc/passwd',
        'proj<script>',
        "proj'; DROP TABLE--",
        'proj/../../../'
      ]
      
      for (const id of validIds) {
        expect(isValidProjectId(id)).toBe(true)
      }
      
      for (const id of invalidIds) {
        expect(isValidProjectId(id)).toBe(false)
      }
    })
  })
})