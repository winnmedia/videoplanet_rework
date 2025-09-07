/**
 * Next.js Middleware for Security, Performance and Authentication
 * Implements rate limiting, security headers, request validation, and NextAuth protection
 */

import { NextRequest, NextResponse } from 'next/server'
// import { withAuth } from 'next-auth/middleware' // 임시 비활성화

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100 // Max requests per window
const API_RATE_LIMIT_MAX_REQUESTS = 30 // Stricter for API routes

// In-memory store for rate limiting (production should use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, RATE_LIMIT_WINDOW)

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get real IP from various headers
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  
  const ip = forwardedFor?.split(',')[0] || realIp || cfConnectingIp || 'unknown'
  
  // For authenticated users, combine with user ID for better tracking
  const userId = request.cookies.get('userId')?.value
  
  return userId ? `${ip}-${userId}` : ip
}

/**
 * Check if request should be rate limited
 */
function isRateLimited(
  clientId: string, 
  isApiRoute: boolean
): { limited: boolean; retryAfter?: number } {
  const now = Date.now()
  const maxRequests = isApiRoute ? API_RATE_LIMIT_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS
  
  const clientData = rateLimitStore.get(clientId)
  
  if (!clientData || clientData.resetTime < now) {
    // New window
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    })
    return { limited: false }
  }
  
  if (clientData.count >= maxRequests) {
    // Rate limit exceeded
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000)
    return { limited: true, retryAfter }
  }
  
  // Increment counter
  clientData.count++
  rateLimitStore.set(clientId, clientData)
  
  return { limited: false }
}

/**
 * Validate request headers for security
 */
function validateRequestHeaders(request: NextRequest): boolean {
  // Block requests with suspicious headers
  const userAgent = request.headers.get('user-agent')
  
  if (!userAgent) {
    return false // Block requests without user agent
  }
  
  // Block known bad user agents (bots, scanners)
  const blockedAgents = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'WPScan',
    'Metasploit'
  ]
  
  const lowerUserAgent = userAgent.toLowerCase()
  for (const agent of blockedAgents) {
    if (lowerUserAgent.includes(agent.toLowerCase())) {
      return false
    }
  }
  
  return true
}

/**
 * Sanitize response to prevent XSS
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Additional security headers not in next.config.js
  response.headers.set('X-Request-Id', crypto.randomUUID())
  response.headers.set('X-Robots-Tag', 'noindex, nofollow') // For sensitive routes
  
  return response
}

/**
 * Core middleware function with security features
 */
function coreMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static assets and images
  if (
    pathname.startsWith('/_next/static') ||
    pathname.startsWith('/_next/image') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next()
  }
  
  // Validate request headers
  if (!validateRequestHeaders(request)) {
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  // Rate limiting
  const clientId = getClientIdentifier(request)
  const isApiRoute = pathname.startsWith('/api')
  const { limited, retryAfter } = isRateLimited(clientId, isApiRoute)
  
  if (limited) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': retryAfter?.toString() || '60',
        'X-RateLimit-Limit': isApiRoute 
          ? API_RATE_LIMIT_MAX_REQUESTS.toString()
          : RATE_LIMIT_MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString()
      }
    })
  }
  
  // Special handling for API routes
  if (isApiRoute) {
    // Skip NextAuth API routes from content-type validation
    if (pathname.startsWith('/api/auth/')) {
      return NextResponse.next()
    }
    
    // Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        return new NextResponse('Bad Request', { 
          status: 400,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      }
    }
    
    // CORS handling for API routes (if needed)
    const origin = request.headers.get('origin')
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || []
    
    if (origin && !allowedOrigins.includes(origin) && process.env.NODE_ENV === 'production') {
      return new NextResponse('CORS Error', { status: 403 })
    }
  }
  
  // Continue with request
  const response = NextResponse.next()
  
  // Add rate limit headers to response
  const clientData = rateLimitStore.get(clientId)
  const maxRequests = isApiRoute ? API_RATE_LIMIT_MAX_REQUESTS : RATE_LIMIT_MAX_REQUESTS
  
  if (clientData) {
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', (maxRequests - clientData.count).toString())
    response.headers.set('X-RateLimit-Reset', new Date(clientData.resetTime).toISOString())
  }
  
  // Add additional security headers
  return addSecurityHeaders(response)
}

// Protected routes that require authentication (임시 비활성화)
// const protectedRoutes = ['/dashboard', '/projects', '/admin', '/settings']

// NextAuth middleware wrapper (비활성화됨 - 향후 window.location 오류 해결 후 재활성화)
// const authMiddleware = withAuth(
//   function middleware(req: NextRequest) {
//     // Run core security middleware first
//     return coreMiddleware(req)
//   },
//   {
//     callbacks: {
//       authorized: ({ token, req }) => {
//         // 테스트 환경에서는 인증을 우회하여 E2E를 안정화
//         if (process.env.NEXT_PUBLIC_APP_ENV === 'test') {
//           return true
//         }
//         const { pathname } = req.nextUrl
        
//         // Allow access to public routes
//         if (!protectedRoutes.some(route => pathname.startsWith(route))) {
//           return true
//         }
        
//         // Check if user has valid token for protected routes
//         return !!token
//       },
//     },
//     pages: {
//       signIn: '/login',
//     },
//   }
// )

// 임시로 NextAuth middleware 비활성화하여 window.location 오류 해결
export default coreMiddleware
export { coreMiddleware as middleware }

// 완전히 middleware 비활성화하여 window.location 오류 해결
export const config = {
  matcher: [
    // 아무것도 매칭하지 않도록 하여 middleware 비활성화
    '/never-match-anything-for-debugging',
  ],
}
