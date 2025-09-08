/**
 * Incident Management System
 * 장애 대응 및 복구 프로세스 관리 시스템
 */

export interface IncidentSeverity {
  level: 'P0' | 'P1' | 'P2' | 'P3' | 'P4'
  name: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational'
  description: string
  responseTime: number // 분 단위
  escalationTime: number // 분 단위
}

export interface IncidentStatus {
  status: 'detected' | 'investigating' | 'identified' | 'monitoring' | 'resolved' | 'closed'
  description: string
  allowedTransitions: IncidentStatus['status'][]
}

export interface IncidentResponse {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus['status']
  startTime: Date
  acknowledgedTime?: Date
  resolvedTime?: Date
  closedTime?: Date
  
  // 영향도
  impact: {
    affectedUsers: number
    affectedServices: string[]
    businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical'
    revenueImpact?: number
  }
  
  // 대응팀
  assignee?: string
  team: string
  escalatedTo?: string[]
  
  // 근본 원인 분석
  rootCause?: {
    category: 'infrastructure' | 'application' | 'external' | 'human_error' | 'process'
    description: string
    contributingFactors: string[]
  }
  
  // 해결 방안
  resolution?: {
    description: string
    preventiveMeasures: string[]
    monitoringImprovements: string[]
  }
  
  // 커뮤니케이션
  communications: Array<{
    timestamp: Date
    channel: 'slack' | 'email' | 'status_page' | 'phone'
    audience: 'internal' | 'customers' | 'stakeholders'
    message: string
    author: string
  }>
  
  // 타임라인
  timeline: Array<{
    timestamp: Date
    action: string
    author: string
    details?: string
    automatedAction?: boolean
  }>
  
  // 메트릭
  metrics: {
    detectionTime: number // 장애 발생부터 감지까지 시간 (분)
    responseTime: number // 감지부터 첫 대응까지 시간 (분)
    resolutionTime?: number // 시작부터 해결까지 시간 (분)
    customerImpactDuration?: number // 고객 영향 지속 시간 (분)
  }
}

export interface RunbookStep {
  id: string
  title: string
  description: string
  type: 'manual' | 'automated' | 'verification'
  estimatedTime: number // 분 단위
  prerequisites: string[]
  commands?: string[]
  automationScript?: string
  verificationSteps: string[]
  rollbackSteps?: string[]
}

export interface Runbook {
  id: string
  name: string
  category: 'infrastructure' | 'application' | 'database' | 'network' | 'security'
  severity: IncidentSeverity['level'][]
  description: string
  triggers: string[]
  steps: RunbookStep[]
  estimatedTotalTime: number
  lastUpdated: Date
  version: string
  author: string
  approvedBy: string
}

// 사전 정의된 심각도 레벨
export const SEVERITY_LEVELS: Record<string, IncidentSeverity> = {
  P0: {
    level: 'P0',
    name: 'Critical',
    description: '서비스 완전 중단, 모든 사용자 영향',
    responseTime: 15, // 15분 이내 응답
    escalationTime: 30 // 30분 이내 에스컬레이션
  },
  P1: {
    level: 'P1', 
    name: 'High',
    description: '핵심 기능 중단, 대부분 사용자 영향',
    responseTime: 30,
    escalationTime: 60
  },
  P2: {
    level: 'P2',
    name: 'Medium', 
    description: '일부 기능 영향, 일부 사용자 영향',
    responseTime: 60,
    escalationTime: 120
  },
  P3: {
    level: 'P3',
    name: 'Low',
    description: '성능 저하, 최소한 사용자 영향',
    responseTime: 120,
    escalationTime: 240
  },
  P4: {
    level: 'P4',
    name: 'Informational',
    description: '모니터링 알림, 사용자 영향 없음',
    responseTime: 240,
    escalationTime: 480
  }
}

// 상태 전환 정의
export const STATUS_TRANSITIONS: Record<IncidentStatus['status'], IncidentStatus> = {
  detected: {
    status: 'detected',
    description: '장애가 감지되었지만 아직 조사가 시작되지 않음',
    allowedTransitions: ['investigating']
  },
  investigating: {
    status: 'investigating',
    description: '장애 원인을 조사 중',
    allowedTransitions: ['identified', 'resolved']
  },
  identified: {
    status: 'identified',
    description: '근본 원인을 파악하고 해결 작업 진행 중',
    allowedTransitions: ['monitoring', 'investigating']
  },
  monitoring: {
    status: 'monitoring',
    description: '해결책을 적용하고 모니터링 중',
    allowedTransitions: ['resolved', 'identified']
  },
  resolved: {
    status: 'resolved',
    description: '장애가 해결됨, 사후 검토 대기 중',
    allowedTransitions: ['closed', 'investigating']
  },
  closed: {
    status: 'closed',
    description: '인시던트 완전 종료, 사후 검토 완료',
    allowedTransitions: []
  }
}

// 기본 런북 템플릿들
export const DEFAULT_RUNBOOKS: Runbook[] = [
  {
    id: 'high-response-time',
    name: 'API 응답 시간 급증 대응',
    category: 'application',
    severity: ['P1', 'P2'],
    description: 'API 응답 시간이 임계값을 초과했을 때의 대응 절차',
    triggers: ['API 응답 시간 > 2초', '에러율 > 5%', 'DB 연결 지연'],
    steps: [
      {
        id: 'check-system-resources',
        title: '시스템 리소스 확인',
        description: 'CPU, 메모리, 디스크 사용률 확인',
        type: 'verification',
        estimatedTime: 5,
        prerequisites: ['모니터링 대시보드 접근 권한'],
        verificationSteps: [
          'CPU 사용률 < 80%',
          '메모리 사용률 < 90%',
          '디스크 I/O 정상 범위'
        ]
      },
      {
        id: 'check-database-performance',
        title: '데이터베이스 성능 확인',
        description: 'DB 연결 풀, 슬로우 쿼리, 락 상태 확인',
        type: 'verification',
        estimatedTime: 10,
        prerequisites: ['DB 모니터링 도구 접근'],
        verificationSteps: [
          '연결 풀 사용률 확인',
          '슬로우 쿼리 로그 분석',
          '데드락 발생 여부 확인'
        ]
      },
      {
        id: 'scale-application',
        title: '애플리케이션 스케일링',
        description: 'Vercel 함수 인스턴스 수 증가 또는 Django 인스턴스 추가',
        type: 'automated',
        estimatedTime: 15,
        prerequisites: ['배포 권한', '인프라 관리 권한'],
        automationScript: 'scale-application.sh',
        verificationSteps: [
          '새 인스턴스 정상 실행 확인',
          '로드 밸런서 연결 확인',
          '응답 시간 개선 확인'
        ],
        rollbackSteps: [
          '스케일링 이전 상태로 롤백',
          '인스턴스 수 원복'
        ]
      }
    ],
    estimatedTotalTime: 30,
    lastUpdated: new Date(),
    version: '1.0',
    author: 'DevOps Team',
    approvedBy: 'CTO'
  },
  {
    id: 'database-connection-failure',
    name: '데이터베이스 연결 실패 대응',
    category: 'database',
    severity: ['P0', 'P1'],
    description: '데이터베이스 연결 실패 시 긴급 대응 절차',
    triggers: ['DB 연결 실패', 'Connection timeout', 'Max connections reached'],
    steps: [
      {
        id: 'verify-db-status',
        title: '데이터베이스 서버 상태 확인',
        description: 'DB 서버가 실행 중인지 확인',
        type: 'verification',
        estimatedTime: 5,
        prerequisites: ['DB 서버 접근 권한'],
        verificationSteps: [
          'PostgreSQL 프로세스 실행 상태',
          '포트 5432 리스닝 확인',
          '디스크 공간 확인'
        ]
      },
      {
        id: 'restart-database',
        title: '데이터베이스 재시작',
        description: 'DB 서버 안전 재시작',
        type: 'manual',
        estimatedTime: 10,
        prerequisites: ['DB 관리자 권한', '백업 상태 확인'],
        commands: [
          'sudo systemctl stop postgresql',
          'sudo systemctl start postgresql',
          'sudo systemctl status postgresql'
        ],
        verificationSteps: [
          '재시작 성공 확인',
          '연결 테스트 통과',
          '애플리케이션 연결 복구'
        ],
        rollbackSteps: [
          '이전 설정으로 복원',
          '백업에서 복구 (필요시)'
        ]
      }
    ],
    estimatedTotalTime: 20,
    lastUpdated: new Date(),
    version: '1.2',
    author: 'Database Team',
    approvedBy: 'Lead Engineer'
  }
]

export class IncidentManager {
  private incidents = new Map<string, IncidentResponse>()
  private runbooks = new Map<string, Runbook>()
  private ongoingIncidentChecks = new Map<string, NodeJS.Timeout>()

  constructor() {
    this.loadDefaultRunbooks()
    this.startPeriodicChecks()
  }

  private loadDefaultRunbooks(): void {
    DEFAULT_RUNBOOKS.forEach(runbook => {
      this.runbooks.set(runbook.id, runbook)
    })
  }

  // 인시던트 생성
  createIncident(
    title: string,
    description: string,
    severity: IncidentSeverity['level'],
    affectedServices: string[] = [],
    automatedDetection: boolean = false
  ): string {
    const incident: IncidentResponse = {
      id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      title,
      description,
      severity: SEVERITY_LEVELS[severity],
      status: 'detected',
      startTime: new Date(),
      impact: {
        affectedUsers: 0,
        affectedServices,
        businessImpact: this.calculateBusinessImpact(severity, affectedServices)
      },
      team: this.assignTeam(affectedServices),
      communications: [],
      timeline: [{
        timestamp: new Date(),
        action: automatedDetection ? '자동 감지로 인시던트 생성' : '수동으로 인시던트 생성',
        author: automatedDetection ? 'System' : 'Manual',
        automatedAction: automatedDetection
      }],
      metrics: {
        detectionTime: 0,
        responseTime: 0
      }
    }

    this.incidents.set(incident.id, incident)
    
    // 즉시 알림 발송
    this.sendIncidentAlert(incident)
    
    // 응답 시간 체크 스케줄링
    this.scheduleResponseTimeCheck(incident)
    
    // 런북 추천
    this.recommendRunbooks(incident)

    console.log(`🚨 Incident created: ${incident.id} - ${title} (${severity})`)
    
    return incident.id
  }

  // 인시던트 상태 업데이트
  updateIncidentStatus(
    incidentId: string,
    newStatus: IncidentStatus['status'],
    author: string,
    details?: string
  ): boolean {
    const incident = this.incidents.get(incidentId)
    if (!incident) {
      console.error(`Incident ${incidentId} not found`)
      return false
    }

    // 상태 전환 유효성 검사
    const currentStatusInfo = STATUS_TRANSITIONS[incident.status]
    if (!currentStatusInfo.allowedTransitions.includes(newStatus)) {
      console.error(`Invalid status transition: ${incident.status} -> ${newStatus}`)
      return false
    }

    const oldStatus = incident.status
    incident.status = newStatus

    // 시간 기록
    const now = new Date()
    switch (newStatus) {
      case 'investigating':
        if (!incident.acknowledgedTime) {
          incident.acknowledgedTime = now
          incident.metrics.responseTime = Math.floor((now.getTime() - incident.startTime.getTime()) / 60000)
        }
        break
      case 'resolved':
        incident.resolvedTime = now
        incident.metrics.resolutionTime = Math.floor((now.getTime() - incident.startTime.getTime()) / 60000)
        break
      case 'closed':
        incident.closedTime = now
        break
    }

    // 타임라인 업데이트
    incident.timeline.push({
      timestamp: now,
      action: `상태 변경: ${oldStatus} → ${newStatus}`,
      author,
      details
    })

    // 상태 변경 알림
    this.sendStatusUpdateAlert(incident, oldStatus, newStatus, author)

    // 해결 시 사후 검토 프로세스 시작
    if (newStatus === 'resolved') {
      this.initiatePostmortemProcess(incident)
    }

    console.log(`📊 Incident ${incidentId} status updated: ${oldStatus} → ${newStatus}`)
    
    return true
  }

  // 에스컬레이션
  escalateIncident(incidentId: string, reason: string, escalatedTo: string[]): boolean {
    const incident = this.incidents.get(incidentId)
    if (!incident) return false

    incident.escalatedTo = escalatedTo
    incident.timeline.push({
      timestamp: new Date(),
      action: `인시던트 에스컬레이션: ${escalatedTo.join(', ')}`,
      author: 'System',
      details: reason,
      automatedAction: true
    })

    // 에스컬레이션 알림
    this.sendEscalationAlert(incident, reason, escalatedTo)

    console.log(`⬆️ Incident ${incidentId} escalated to: ${escalatedTo.join(', ')}`)
    
    return true
  }

  // 커뮤니케이션 추가
  addCommunication(
    incidentId: string,
    channel: IncidentResponse['communications'][0]['channel'],
    audience: IncidentResponse['communications'][0]['audience'],
    message: string,
    author: string
  ): boolean {
    const incident = this.incidents.get(incidentId)
    if (!incident) return false

    incident.communications.push({
      timestamp: new Date(),
      channel,
      audience,
      message,
      author
    })

    incident.timeline.push({
      timestamp: new Date(),
      action: `커뮤니케이션 발송: ${channel} (${audience})`,
      author,
      details: message
    })

    console.log(`📢 Communication sent for incident ${incidentId}: ${channel}`)
    
    return true
  }

  // 근본 원인 분석 추가
  addRootCauseAnalysis(
    incidentId: string,
    category: 'infrastructure' | 'application' | 'external' | 'human_error' | 'process',
    description: string,
    contributingFactors: string[],
    author: string
  ): boolean {
    const incident = this.incidents.get(incidentId)
    if (!incident) return false

    incident.rootCause = {
      category,
      description,
      contributingFactors
    }

    incident.timeline.push({
      timestamp: new Date(),
      action: '근본 원인 분석 완료',
      author,
      details: description
    })

    console.log(`🔍 Root cause analysis added for incident ${incidentId}`)
    
    return true
  }

  // 해결책 추가
  addResolution(
    incidentId: string,
    description: string,
    preventiveMeasures: string[],
    monitoringImprovements: string[],
    author: string
  ): boolean {
    const incident = this.incidents.get(incidentId)
    if (!incident) return false

    incident.resolution = {
      description,
      preventiveMeasures,
      monitoringImprovements
    }

    incident.timeline.push({
      timestamp: new Date(),
      action: '해결책 및 예방 조치 기록',
      author,
      details: description
    })

    console.log(`✅ Resolution added for incident ${incidentId}`)
    
    return true
  }

  // 런북 실행
  executeRunbook(incidentId: string, runbookId: string, author: string): boolean {
    const incident = this.incidents.get(incidentId)
    const runbook = this.runbooks.get(runbookId)
    
    if (!incident || !runbook) return false

    incident.timeline.push({
      timestamp: new Date(),
      action: `런북 실행 시작: ${runbook.name}`,
      author,
      details: `예상 소요 시간: ${runbook.estimatedTotalTime}분`
    })

    // 런북 단계별 실행 시뮬레이션
    this.simulateRunbookExecution(incident, runbook, author)

    console.log(`📖 Runbook execution started for incident ${incidentId}: ${runbook.name}`)
    
    return true
  }

  // 인시던트 조회
  getIncident(incidentId: string): IncidentResponse | undefined {
    return this.incidents.get(incidentId)
  }

  // 활성 인시던트 목록
  getActiveIncidents(): IncidentResponse[] {
    return Array.from(this.incidents.values())
      .filter(incident => !['resolved', 'closed'].includes(incident.status))
      .sort((a, b) => {
        // 심각도순, 시작시간순 정렬
        const severityOrder = ['P0', 'P1', 'P2', 'P3', 'P4']
        const aSeverity = severityOrder.indexOf(a.severity.level)
        const bSeverity = severityOrder.indexOf(b.severity.level)
        
        if (aSeverity !== bSeverity) {
          return aSeverity - bSeverity
        }
        
        return a.startTime.getTime() - b.startTime.getTime()
      })
  }

  // 인시던트 통계
  getIncidentMetrics(timeRangeHours: number = 24): {
    totalIncidents: number
    byStatus: Record<string, number>
    bySeverity: Record<string, number>
    averageResolutionTime: number
    mttr: number // Mean Time to Resolution
    mtbf: number // Mean Time Between Failures
  } {
    const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000)
    const recentIncidents = Array.from(this.incidents.values())
      .filter(incident => incident.startTime > cutoffTime)

    const byStatus = recentIncidents.reduce((acc, incident) => {
      acc[incident.status] = (acc[incident.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const bySeverity = recentIncidents.reduce((acc, incident) => {
      acc[incident.severity.level] = (acc[incident.severity.level] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const resolvedIncidents = recentIncidents.filter(i => i.metrics.resolutionTime)
    const averageResolutionTime = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.metrics.resolutionTime || 0), 0) / resolvedIncidents.length
      : 0

    return {
      totalIncidents: recentIncidents.length,
      byStatus,
      bySeverity,
      averageResolutionTime,
      mttr: averageResolutionTime,
      mtbf: recentIncidents.length > 0 ? (timeRangeHours * 60) / recentIncidents.length : 0
    }
  }

  // Private helper methods
  private calculateBusinessImpact(
    severity: IncidentSeverity['level'],
    affectedServices: string[]
  ): IncidentResponse['impact']['businessImpact'] {
    if (severity === 'P0') return 'critical'
    if (severity === 'P1') return 'high'
    if (affectedServices.includes('payment') || affectedServices.includes('authentication')) return 'high'
    if (severity === 'P2') return 'medium'
    if (severity === 'P3') return 'low'
    return 'none'
  }

  private assignTeam(affectedServices: string[]): string {
    if (affectedServices.some(s => ['database', 'redis'].includes(s))) return 'Infrastructure Team'
    if (affectedServices.some(s => ['api', 'backend'].includes(s))) return 'Backend Team'
    if (affectedServices.some(s => ['frontend', 'ui'].includes(s))) return 'Frontend Team'
    return 'DevOps Team'
  }

  private async sendIncidentAlert(incident: IncidentResponse): Promise<void> {
    const alertData = {
      incidentId: incident.id,
      title: incident.title,
      severity: incident.severity.level,
      services: incident.impact.affectedServices,
      timestamp: incident.startTime.toISOString()
    }

    // Slack 알림
    if (process.env.SLACK_WEBHOOK_URL) {
      const color = {
        P0: '#cc0000',
        P1: '#ff4444', 
        P2: '#ff9500',
        P3: '#36a64f',
        P4: '#808080'
      }[incident.severity.level] || '#808080'

      const slackMessage = {
        channel: '#incidents',
        username: 'Incident Manager',
        icon_emoji: '🚨',
        attachments: [{
          color,
          title: `🚨 ${incident.severity.name} Incident: ${incident.title}`,
          text: incident.description,
          fields: [
            {
              title: 'Incident ID',
              value: incident.id,
              short: true
            },
            {
              title: 'Severity',
              value: `${incident.severity.level} - ${incident.severity.name}`,
              short: true
            },
            {
              title: 'Affected Services',
              value: incident.impact.affectedServices.join(', ') || 'Unknown',
              short: false
            },
            {
              title: 'Response Time SLA',
              value: `${incident.severity.responseTime} minutes`,
              short: true
            }
          ],
          timestamp: Math.floor(incident.startTime.getTime() / 1000)
        }]
      }

      try {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackMessage)
        })
      } catch (error) {
        console.error('Failed to send Slack alert:', error)
      }
    }

    // PagerDuty/이메일 등 추가 알림 채널
    // ...
  }

  private async sendStatusUpdateAlert(
    incident: IncidentResponse,
    oldStatus: string,
    newStatus: string,
    author: string
  ): Promise<void> {
    // 상태 업데이트 알림 로직
    console.log(`📢 Status update alert sent for ${incident.id}: ${oldStatus} → ${newStatus}`)
  }

  private async sendEscalationAlert(
    incident: IncidentResponse,
    reason: string,
    escalatedTo: string[]
  ): Promise<void> {
    // 에스컬레이션 알림 로직
    console.log(`⬆️ Escalation alert sent for ${incident.id} to ${escalatedTo.join(', ')}`)
  }

  private scheduleResponseTimeCheck(incident: IncidentResponse): void {
    const responseTimeMs = incident.severity.responseTime * 60 * 1000
    
    const timeoutId = setTimeout(() => {
      const currentIncident = this.incidents.get(incident.id)
      
      if (currentIncident && !currentIncident.acknowledgedTime) {
        // SLA 위반 - 자동 에스컬레이션
        const escalationTeam = this.getEscalationTeam(currentIncident.severity.level)
        this.escalateIncident(
          incident.id,
          `응답 시간 SLA 위반 (${incident.severity.responseTime}분)`,
          escalationTeam
        )
      }
    }, responseTimeMs)

    this.ongoingIncidentChecks.set(incident.id, timeoutId)
  }

  private getEscalationTeam(severity: IncidentSeverity['level']): string[] {
    switch (severity) {
      case 'P0':
        return ['CTO', 'Engineering Manager', 'On-call Engineer']
      case 'P1':
        return ['Engineering Manager', 'Senior Engineers']
      default:
        return ['Team Lead']
    }
  }

  private recommendRunbooks(incident: IncidentResponse): void {
    const relevantRunbooks = Array.from(this.runbooks.values())
      .filter(runbook => 
        runbook.severity.includes(incident.severity.level) &&
        runbook.triggers.some(trigger => 
          incident.description.toLowerCase().includes(trigger.toLowerCase()) ||
          incident.title.toLowerCase().includes(trigger.toLowerCase())
        )
      )

    if (relevantRunbooks.length > 0) {
      incident.timeline.push({
        timestamp: new Date(),
        action: `추천 런북: ${relevantRunbooks.map(r => r.name).join(', ')}`,
        author: 'System',
        automatedAction: true
      })

      console.log(`📖 Recommended runbooks for ${incident.id}: ${relevantRunbooks.map(r => r.name).join(', ')}`)
    }
  }

  private simulateRunbookExecution(
    incident: IncidentResponse,
    runbook: Runbook,
    author: string
  ): void {
    // 실제 구현에서는 각 단계를 순차적으로 실행하고 결과를 기록
    runbook.steps.forEach((step, index) => {
      setTimeout(() => {
        incident.timeline.push({
          timestamp: new Date(),
          action: `런북 단계 ${index + 1}/${runbook.steps.length}: ${step.title}`,
          author,
          details: `예상 소요 시간: ${step.estimatedTime}분`
        })
      }, index * 1000) // 1초 간격으로 시뮬레이션
    })
  }

  private initiatePostmortemProcess(incident: IncidentResponse): void {
    // P0, P1 인시던트는 반드시 사후 검토
    if (['P0', 'P1'].includes(incident.severity.level)) {
      incident.timeline.push({
        timestamp: new Date(),
        action: '사후 검토 프로세스 시작',
        author: 'System',
        details: '근본 원인 분석 및 예방 조치 수립 필요',
        automatedAction: true
      })

      console.log(`📝 Postmortem process initiated for ${incident.id}`)
    }
  }

  private startPeriodicChecks(): void {
    // 5분마다 SLA 위반 체크
    setInterval(() => {
      this.checkSLACompliance()
    }, 5 * 60 * 1000)

    console.log('🔄 Incident management periodic checks started')
  }

  private checkSLACompliance(): void {
    const activeIncidents = this.getActiveIncidents()
    const now = new Date()

    activeIncidents.forEach(incident => {
      const elapsedMinutes = Math.floor((now.getTime() - incident.startTime.getTime()) / 60000)
      
      // 응답 시간 SLA 체크
      if (!incident.acknowledgedTime && elapsedMinutes > incident.severity.responseTime) {
        const escalationTeam = this.getEscalationTeam(incident.severity.level)
        this.escalateIncident(
          incident.id,
          `응답 시간 SLA 위반 (${elapsedMinutes}분 경과)`,
          escalationTeam
        )
      }
      
      // 에스컬레이션 시간 체크
      if (incident.acknowledgedTime && !incident.escalatedTo && 
          elapsedMinutes > incident.severity.escalationTime) {
        const escalationTeam = this.getEscalationTeam(incident.severity.level)
        this.escalateIncident(
          incident.id,
          `에스컬레이션 시간 SLA 위반 (${elapsedMinutes}분 경과)`,
          escalationTeam
        )
      }
    })
  }

  // 리소스 정리
  destroy(): void {
    this.ongoingIncidentChecks.forEach(timeoutId => {
      clearTimeout(timeoutId)
    })
    this.ongoingIncidentChecks.clear()
    console.log('🛑 Incident Manager destroyed')
  }
}

// 전역 싱글톤
export const incidentManager = new IncidentManager()

// React Hook for integration
export function useIncidentManagement() {
  const createIncident = (
    title: string,
    description: string,
    severity: IncidentSeverity['level'],
    affectedServices?: string[]
  ) => incidentManager.createIncident(title, description, severity, affectedServices)

  const updateStatus = (
    incidentId: string,
    status: IncidentStatus['status'],
    author: string,
    details?: string
  ) => incidentManager.updateIncidentStatus(incidentId, status, author, details)

  const getActiveIncidents = () => incidentManager.getActiveIncidents()
  const getIncidentMetrics = (hours?: number) => incidentManager.getIncidentMetrics(hours)

  return {
    createIncident,
    updateStatus,
    getActiveIncidents,
    getIncidentMetrics,
    escalate: incidentManager.escalateIncident.bind(incidentManager),
    addCommunication: incidentManager.addCommunication.bind(incidentManager),
    addRootCause: incidentManager.addRootCauseAnalysis.bind(incidentManager),
    addResolution: incidentManager.addResolution.bind(incidentManager)
  }
}