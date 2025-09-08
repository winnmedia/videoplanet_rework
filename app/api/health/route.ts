/**
 * @fileoverview Health Check API Route - Backend Proxy
 * @description Django 백엔드와 연계하여 통합 헬스체크 제공
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'

import { apiService } from '@/shared/api'

export async function GET(request: NextRequest) {
  try {
    // 백엔드 헬스체크 수행
    const backendHealthResult = await apiService.getHealthStatus()

    // 프론트엔드 헬스 정보
    const frontendHealth = {
      status: 'healthy' as const,
      timestamp: new Date().toISOString(),
      service: 'vridge-web-frontend',
      version: process.env.VERSION || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    }

    // 통합 헬스체크 결과
    const combinedHealth = {
      overall: backendHealthResult.success ? 'healthy' : 'degraded',
      frontend: frontendHealth,
      backend: backendHealthResult.success
        ? {
            ...backendHealthResult.data,
            source: backendHealthResult.source,
          }
        : {
            status: 'unhealthy' as const,
            error: backendHealthResult.error?.message,
            timestamp: new Date().toISOString(),
          },
      timestamp: new Date().toISOString(),
    }

    const status = combinedHealth.overall === 'healthy' ? 200 : 503

    return NextResponse.json(combinedHealth, {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Health-Check': 'true',
        'X-Backend-Source': backendHealthResult.source || 'unknown',
      },
    })
  } catch (error) {
    const errorResponse = {
      overall: 'unhealthy',
      frontend: {
        status: 'unhealthy' as const,
        error: error instanceof Error ? error.message : 'Unknown frontend error',
        timestamp: new Date().toISOString(),
      },
      backend: {
        status: 'unknown' as const,
        error: 'Backend health check failed',
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(errorResponse, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'X-Health-Check': 'true',
      },
    })
  }
}
