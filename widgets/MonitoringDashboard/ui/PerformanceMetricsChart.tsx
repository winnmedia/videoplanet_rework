'use client'

/**
 * Performance Metrics Real-time Chart Component
 * Core Web Vitals (LCP, FID, CLS, TTI) 실시간 차트
 */

import React, { useMemo, useRef, useEffect } from 'react'

import styles from './PerformanceMetricsChart.module.scss'
import { PerformanceMetricsChartProps, WebVitalsChartData, ChartTheme } from '../model/types'

interface ChartPoint {
  x: number
  y: number
  timestamp: Date
  value: number
}

interface ChartLine {
  points: ChartPoint[]
  color: string
  label: string
  budget?: number
}

interface ChartData {
  lines: ChartLine[]
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
  timeRange: { min: number; max: number }
}

// 타입 가드 함수
function isChartData(data: any): data is ChartData {
  return data && !Array.isArray(data) && 'lines' in data && 'padding' in data && 'timeRange' in data
}

export const PerformanceMetricsChart: React.FC<PerformanceMetricsChartProps> = ({
  data,
  budgets,
  violations = [],
  className = '',
  'data-testid': testId = 'performance-metrics-chart'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 차트 테마 (브랜드 색상 사용)
  const theme: ChartTheme = useMemo(() => ({
    primary: '#0031ff',
    success: '#28a745', 
    warning: '#ffc107',
    error: '#d93a3a',
    info: '#17a2b8',
    background: '#ffffff',
    grid: '#e4e4e4',
    text: '#25282f',
    axis: '#919191'
  }), [])

  // 차트 데이터 처리
  const chartData = useMemo(() => {
    if (!data.length) return []

    const width = 800
    const height = 300
    const padding = { top: 20, right: 80, bottom: 40, left: 60 }
    const chartWidth = width - padding.left - padding.right
    const chartHeight = height - padding.top - padding.bottom

    // 시간 범위 계산
    const timeRange = {
      min: Math.min(...data.map(d => d.timestamp.getTime())),
      max: Math.max(...data.map(d => d.timestamp.getTime()))
    }

    // 각 메트릭별 라인 데이터 생성
    const lines: ChartLine[] = [
      {
        label: 'LCP (Largest Contentful Paint)',
        color: theme.primary,
        budget: budgets.LCP,
        points: data.map(d => ({
          x: padding.left + ((d.timestamp.getTime() - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth,
          y: padding.top + chartHeight - (d.LCP / Math.max(...data.map(d => d.LCP))) * chartHeight,
          timestamp: d.timestamp,
          value: d.LCP
        }))
      },
      {
        label: 'FID (First Input Delay)', 
        color: theme.success,
        budget: budgets.FID,
        points: data.map(d => ({
          x: padding.left + ((d.timestamp.getTime() - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth,
          y: padding.top + chartHeight - (d.FID / Math.max(...data.map(d => d.FID))) * chartHeight,
          timestamp: d.timestamp,
          value: d.FID
        }))
      },
      {
        label: 'CLS (Cumulative Layout Shift)',
        color: theme.warning,
        budget: budgets.CLS,
        points: data.map(d => ({
          x: padding.left + ((d.timestamp.getTime() - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth,
          y: padding.top + chartHeight - (d.CLS / Math.max(...data.map(d => d.CLS))) * chartHeight,
          timestamp: d.timestamp,
          value: d.CLS
        }))
      },
      {
        label: 'TTI (Time to Interactive)',
        color: theme.info,
        budget: budgets.TTI,
        points: data.map(d => ({
          x: padding.left + ((d.timestamp.getTime() - timeRange.min) / (timeRange.max - timeRange.min)) * chartWidth,
          y: padding.top + chartHeight - (d.TTI / Math.max(...data.map(d => d.TTI))) * chartHeight,
          timestamp: d.timestamp,
          value: d.TTI
        }))
      }
    ]

    return { lines, width, height, padding, timeRange }
  }, [data, budgets, theme])

  // 캠버스 그리기
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !isChartData(chartData) || !chartData.lines.length) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캠버스 크기 설정 (DPR 대응)
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    // 배경 지우기
    ctx.fillStyle = theme.background
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 그리드 그리기
    ctx.strokeStyle = theme.grid
    ctx.lineWidth = 0.5
    ctx.setLineDash([2, 2])
    
    // 수평 그리드
    for (let i = 0; i <= 5; i++) {
      const y = chartData.padding.top + (i / 5) * (rect.height - chartData.padding.top - chartData.padding.bottom)
      ctx.beginPath()
      ctx.moveTo(chartData.padding.left, y)
      ctx.lineTo(rect.width - chartData.padding.right, y)
      ctx.stroke()
    }
    
    // 수직 그리드
    for (let i = 0; i <= 6; i++) {
      const x = chartData.padding.left + (i / 6) * (rect.width - chartData.padding.left - chartData.padding.right)
      ctx.beginPath()
      ctx.moveTo(x, chartData.padding.top)
      ctx.lineTo(x, rect.height - chartData.padding.bottom)
      ctx.stroke()
    }
    
    ctx.setLineDash([])

    // 라인 그리기
    chartData.lines.forEach((line, index) => {
      if (line.points.length < 2) return

      // 라인 그리기
      ctx.strokeStyle = line.color
      ctx.lineWidth = 2
      ctx.beginPath()
      
      line.points.forEach((point, i) => {
        if (i === 0) {
          ctx.moveTo(point.x, point.y)
        } else {
          ctx.lineTo(point.x, point.y)
        }
      })
      
      ctx.stroke()

      // 포인트 그리기
      ctx.fillStyle = line.color
      line.points.forEach(point => {
        ctx.beginPath()
        ctx.arc(point.x, point.y, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      // Budget 위반 표시
      if (line.budget && violations.some(v => v.metric === line.label.split(' ')[0])) {
        const budgetY = chartData.padding.top + (rect.height - chartData.padding.top - chartData.padding.bottom) * 0.8
        ctx.strokeStyle = theme.error
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(chartData.padding.left, budgetY)
        ctx.lineTo(rect.width - chartData.padding.right, budgetY)
        ctx.stroke()
        ctx.setLineDash([])
      }
    })

    // 각 축 레이블
    ctx.fillStyle = theme.text
    ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif'
    ctx.textAlign = 'center'
    
    // X축 (시간) 레이블
    for (let i = 0; i <= 6; i++) {
      const x = chartData.padding.left + (i / 6) * (rect.width - chartData.padding.left - chartData.padding.right)
      const time = new Date(chartData.timeRange.min + (i / 6) * (chartData.timeRange.max - chartData.timeRange.min))
      const timeStr = time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      ctx.fillText(timeStr, x, rect.height - 10)
    }
    
    // Y축 (값) 레이블
    ctx.textAlign = 'right'
    for (let i = 0; i <= 5; i++) {
      const y = chartData.padding.top + (i / 5) * (rect.height - chartData.padding.top - chartData.padding.bottom)
      const value = Math.round((5 - i) * 1000 / 5) // 예시 값
      ctx.fillText(`${value}ms`, chartData.padding.left - 10, y + 4)
    }

  }, [chartData, theme, violations])

  // 가장 최근 메트릭 값
  const latestMetrics = useMemo(() => {
    if (!data.length) return null
    const latest = data[data.length - 1]
    return {
      LCP: { value: latest.LCP, unit: 'ms', budget: budgets.LCP, status: latest.LCP > budgets.LCP ? 'error' : 'ok' },
      FID: { value: latest.FID, unit: 'ms', budget: budgets.FID, status: latest.FID > budgets.FID ? 'error' : 'ok' },
      CLS: { value: latest.CLS, unit: '', budget: budgets.CLS, status: latest.CLS > budgets.CLS ? 'error' : 'ok' },
      TTI: { value: latest.TTI, unit: 'ms', budget: budgets.TTI, status: latest.TTI > budgets.TTI ? 'error' : 'ok' }
    }
  }, [data, budgets])

  if (!data.length) {
    return (
      <div 
        className={`${styles.chart} ${styles.empty} ${className}`}
        data-testid={testId}
        role="img"
        aria-label="성능 메트릭 차트 - 데이터 없음"
      >
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">📈</div>
          <h3>성능 데이터 없음</h3>
          <p>성능 메트릭 데이터를 수집하고 있습니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`${styles.chart} ${className}`}
      data-testid={testId}
      ref={containerRef}
    >
      {/* 차트 헤더 */}
      <div className={styles.header}>
        <h2 className={styles.title}>실시간 성능 메트릭</h2>
        <div className={styles.legend}>
          {chartData.lines.map((line) => (
            <div 
              key={line.label} 
              className={styles.legendItem}
              aria-label={`${line.label} 메트릭`}
            >
              <span 
                className={styles.legendColor} 
                style={{ backgroundColor: line.color }}
                aria-hidden="true"
              />
              <span className={styles.legendLabel}>{line.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 캐버스 차트 */}
      <div className={styles.canvasContainer}>
        <canvas 
          ref={canvasRef}
          className={styles.canvas}
          role="img"
          aria-label="Core Web Vitals 성능 메트릭 차트"
          aria-describedby="chart-description"
        />
        <div id="chart-description" className="sr-only">
          실시간 Core Web Vitals 성능 메트릭 차트입니다. 
          LCP, FID, CLS, TTI 값들을 시간순으로 표시합니다.
        </div>
      </div>

      {/* 최신 메트릭 값 */}
      {latestMetrics && (
        <div className={styles.metricsGrid}>
          {Object.entries(latestMetrics).map(([key, metric]) => (
            <div 
              key={key}
              className={`${styles.metricCard} ${styles[`status-${metric.status}`]}`}
              role="status"
              aria-label={`${key} 메트릭: ${metric.value}${metric.unit}`}
            >
              <div className={styles.metricName}>{key}</div>
              <div className={styles.metricValue}>
                {typeof metric.value === 'number' ? metric.value.toFixed(1) : metric.value}{metric.unit}
              </div>
              <div className={styles.metricBudget}>
                Budget: {metric.budget}{metric.unit}
              </div>
              {metric.status === 'error' && (
                <div className={styles.budgetViolation} aria-label="예산 초과">⚠️</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 예산 위반 경고 */}
      {violations.length > 0 && (
        <div 
          className={styles.violations}
          role="alert"
          aria-label="성능 예산 위반 경고"
        >
          <h3>현재 예산 위반</h3>
          <ul className={styles.violationList}>
            {violations.map((violation, index) => (
              <li key={index} className={styles.violationItem}>
                <strong>{violation.metric}</strong>: 
                {violation.current.toFixed(1)}ms (Budget: {violation.budget}ms, 
                초과: +{violation.violation.toFixed(1)}ms)
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}