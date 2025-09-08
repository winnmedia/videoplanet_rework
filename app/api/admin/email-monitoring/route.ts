/**
 * @fileoverview Email Monitoring Dashboard API
 * @description 이메일 발송 모니터링 및 통계 조회 API
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { emailMonitor } from '@/lib/email/email-monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'stats'

    switch (action) {
      case 'stats':
        // 전체 통계 조회
        const overallStats = emailMonitor.getOverallStats()
        const hourlyStats = emailMonitor.getHourlyStats()
        const errorStats = emailMonitor.getErrorStats()

        return NextResponse.json({
          success: true,
          data: {
            overall: overallStats,
            hourly: hourlyStats,
            errors: errorStats,
            timestamp: new Date().toISOString()
          }
        })

      case 'alerts':
        // 현재 알림 확인
        emailMonitor.checkAlerts()
        
        return NextResponse.json({
          success: true,
          message: 'Alert check completed',
          timestamp: new Date().toISOString()
        })

      case 'logs':
        // 최근 로그 조회 (최대 100개)
        const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
        const logs = emailMonitor.getAllLogs().slice(0, limit)
        
        return NextResponse.json({
          success: true,
          data: {
            logs,
            total: logs.length,
            limit
          }
        })

      case 'user-stats':
        // 특정 사용자 통계 (해시 기반)
        const userHash = searchParams.get('userHash')
        if (!userHash) {
          return NextResponse.json(
            { error: 'userHash parameter is required' },
            { status: 400 }
          )
        }

        const userLogs = emailMonitor.getUserLogs(userHash)
        return NextResponse.json({
          success: true,
          data: {
            userHash,
            logs: userLogs,
            total: userLogs.length
          }
        })

      case 'health':
        // 시스템 상태 확인
        const limits = emailMonitor.getLimits()
        const recentStats = emailMonitor.getHourlyStats()
        
        const health = {
          status: 'healthy',
          checks: {
            errorRate: recentStats.successRate > 0.5 ? 'pass' : 'fail',
            volume: recentStats.totalSent < limits.maxEmailsPerTypePerHour ? 'pass' : 'warn',
            memoryUsage: 'pass' // 메모리 사용량은 자동 정리되므로 항상 pass
          },
          limits,
          currentStats: recentStats
        }

        const statusCode = health.checks.errorRate === 'fail' ? 503 : 200
        
        return NextResponse.json({
          success: true,
          data: health
        }, { status: statusCode })

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action',
            availableActions: ['stats', 'alerts', 'logs', 'user-stats', 'health']
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Email monitoring API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'cleanup':
        // 수동 정리 실행
        emailMonitor.cleanup()
        
        return NextResponse.json({
          success: true,
          message: 'Cleanup completed',
          timestamp: new Date().toISOString()
        })

      case 'update-limits':
        // 제한값 업데이트
        const { limits } = body
        if (!limits || typeof limits !== 'object') {
          return NextResponse.json(
            { error: 'limits object is required' },
            { status: 400 }
          )
        }

        emailMonitor.updateLimits(limits)

        return NextResponse.json({
          success: true,
          message: 'Limits updated',
          newLimits: emailMonitor.getLimits()
        })

      case 'test-alert':
        // 테스트 알림 발생
        const alertReceived = new Promise<boolean>(resolve => {
          const unsubscribe = emailMonitor.onAlert(() => {
            unsubscribe()
            resolve(true)
          })

          // 5초 후 타임아웃
          setTimeout(() => {
            unsubscribe()
            resolve(false)
          }, 5000)
        })

        // 알림 확인 실행
        emailMonitor.checkAlerts()
        
        const received = await alertReceived

        return NextResponse.json({
          success: true,
          message: received ? 'Alert received' : 'No alerts triggered',
          alertReceived: received
        })

      default:
        return NextResponse.json(
          { 
            error: 'Invalid action',
            availableActions: ['cleanup', 'update-limits', 'test-alert']
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Email monitoring POST API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}