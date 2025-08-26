/**
 * MSW Request Handlers
 * Define mock API endpoints for testing
 */

import { http, HttpResponse, delay } from 'msw'

// Base API URL - adjust this based on your actual API
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const handlers = [
  // Example: Mock user authentication endpoint
  http.post(`${API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    
    // Simulate network delay
    await delay(100)
    
    // Mock successful login
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
        },
        token: 'mock-jwt-token',
      })
    }
    
    // Mock failed login
    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  }),
  
  // Example: Mock user profile endpoint
  http.get(`${API_BASE_URL}/user/profile`, async () => {
    await delay(100)
    
    return HttpResponse.json({
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      avatar: '/default-avatar.png',
    })
  }),
  
  // Example: Mock data fetching endpoint
  http.get(`${API_BASE_URL}/items`, async ({ request }) => {
    const url = new URL(request.url)
    const page = url.searchParams.get('page') || '1'
    const limit = url.searchParams.get('limit') || '10'
    
    await delay(100)
    
    return HttpResponse.json({
      items: Array.from({ length: Number(limit) }, (_, i) => ({
        id: `${page}-${i}`,
        title: `Item ${i + 1}`,
        description: `Description for item ${i + 1}`,
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: 100,
      },
    })
  }),
  
  // Catch-all handler for unhandled requests (optional)
  http.get('*', () => {
    console.warn('Unhandled request')
    return HttpResponse.json(null, { status: 404 })
  }),
]

/**
 * Error handlers for testing error scenarios
 */
export const errorHandlers = [
  http.get(`${API_BASE_URL}/user/profile`, async () => {
    await delay(100)
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }),
  
  http.get(`${API_BASE_URL}/items`, async () => {
    await delay(100)
    return HttpResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    )
  }),
]