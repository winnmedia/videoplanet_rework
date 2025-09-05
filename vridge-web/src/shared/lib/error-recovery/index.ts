/**
 * 사용자 친화적 에러 복구 워크플로우 시스템
 * WCAG 2.1 AA 준수, 접근성 우선 설계
 * FSD 경계: shared/lib - 공통 에러 복구 로직
 */

export interface ErrorRecoveryStep {
  id: string
  title: string
  description: string
  action?: {
    label: string
    onClick: () => Promise<void> | void
    isDestructive?: boolean
  }
  isCompleted?: boolean
  isAccessible: true // WCAG 준수 강제
}

export interface ErrorRecoveryWorkflow {
  errorType: string
  errorCode?: string | number
  userFriendlyTitle: string
  contextualMessage: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  steps: ErrorRecoveryStep[]
  preventionTips?: string[]
  supportContact?: {
    method: 'email' | 'chat' | 'phone'
    value: string
    label: string
  }
  // 접근성 관련
  announceToScreenReader: string
  keyboardShortcuts?: { key: string; action: string }[]
}

/**
 * 일반적인 에러 상황별 복구 워크플로우 정의
 */
export const ERROR_RECOVERY_WORKFLOWS: Record<string, ErrorRecoveryWorkflow> = {
  NETWORK_ERROR: {
    errorType: 'NETWORK_ERROR',
    userFriendlyTitle: '인터넷 연결 문제가 발생했습니다',
    contextualMessage: '네트워크 연결이 불안정하거나 서버에 일시적인 문제가 있을 수 있습니다.',
    severity: 'medium',
    announceToScreenReader: '네트워크 연결 오류가 발생했습니다. 복구 단계를 안내해드리겠습니다.',
    steps: [
      {
        id: 'check-connection',
        title: '1. 인터넷 연결 확인',
        description: '다른 웹사이트가 정상적으로 작동하는지 확인해주세요.',
        isAccessible: true,
      },
      {
        id: 'refresh-page',
        title: '2. 페이지 새로고침',
        description: '브라우저를 새로고침하여 연결을 다시 시도해주세요.',
        action: {
          label: '페이지 새로고침',
          onClick: () => window.location.reload(),
        },
        isAccessible: true,
      },
      {
        id: 'clear-cache',
        title: '3. 브라우저 캐시 삭제',
        description: '브라우저 설정에서 캐시를 삭제하고 다시 시도해주세요.',
        isAccessible: true,
      },
      {
        id: 'contact-support',
        title: '4. 문제가 지속되면 지원팀에 문의',
        description: '위 단계로 해결되지 않으면 기술지원팀에 연락해주세요.',
        isAccessible: true,
      },
    ],
    preventionTips: [
      '안정적인 WiFi 연결을 사용하세요',
      '정기적으로 브라우저를 업데이트하세요',
      '너무 많은 브라우저 탭을 열어두지 마세요',
    ],
    supportContact: {
      method: 'email',
      value: 'support@vridge.com',
      label: '기술지원팀 이메일',
    },
    keyboardShortcuts: [
      { key: 'Ctrl+R', action: '페이지 새로고침' },
      { key: 'F5', action: '페이지 새로고침' },
    ],
  },

  AUTHENTICATION_ERROR: {
    errorType: 'AUTHENTICATION_ERROR',
    errorCode: 401,
    userFriendlyTitle: '로그인이 만료되었습니다',
    contextualMessage: '보안을 위해 로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
    severity: 'medium',
    announceToScreenReader: '로그인 세션이 만료되었습니다. 다시 로그인이 필요합니다.',
    steps: [
      {
        id: 'relogin',
        title: '1. 다시 로그인',
        description: '로그인 페이지로 이동하여 계정 정보를 입력해주세요.',
        action: {
          label: '로그인 페이지로 이동',
          onClick: () => window.location.href = '/login',
        },
        isAccessible: true,
      },
      {
        id: 'check-credentials',
        title: '2. 계정 정보 확인',
        description: '이메일 주소와 비밀번호를 정확히 입력했는지 확인해주세요.',
        isAccessible: true,
      },
      {
        id: 'reset-password',
        title: '3. 비밀번호 재설정 (필요시)',
        description: '비밀번호를 잊으셨다면 비밀번호 재설정을 이용해주세요.',
        action: {
          label: '비밀번호 재설정',
          onClick: () => window.location.href = '/reset-password',
        },
        isAccessible: true,
      },
    ],
    preventionTips: [
      '브라우저에서 로그인 상태 유지를 체크하세요',
      '정기적으로 비밀번호를 변경하세요',
      '공용 컴퓨터에서는 로그아웃을 잊지 마세요',
    ],
    supportContact: {
      method: 'email',
      value: 'account@vridge.com',
      label: '계정지원팀 이메일',
    },
  },

  VALIDATION_ERROR: {
    errorType: 'VALIDATION_ERROR',
    errorCode: 400,
    userFriendlyTitle: '입력 정보를 확인해주세요',
    contextualMessage: '제출하신 정보에 오류가 있습니다. 아래 항목을 확인해주세요.',
    severity: 'low',
    announceToScreenReader: '입력 정보에 오류가 있습니다. 수정이 필요한 항목을 안내해드리겠습니다.',
    steps: [
      {
        id: 'check-required-fields',
        title: '1. 필수 항목 확인',
        description: '빨간색으로 표시된 필수 항목이 모두 입력되었는지 확인해주세요.',
        isAccessible: true,
      },
      {
        id: 'validate-format',
        title: '2. 입력 형식 확인',
        description: '이메일, 전화번호 등이 올바른 형식으로 입력되었는지 확인해주세요.',
        isAccessible: true,
      },
      {
        id: 'retry-submission',
        title: '3. 다시 제출',
        description: '모든 정보를 확인한 후 다시 제출해주세요.',
        action: {
          label: '다시 제출',
          onClick: () => {
            // 폼 재제출 로직은 컴포넌트에서 주입
            console.log('Form resubmission triggered')
          },
        },
        isAccessible: true,
      },
    ],
    preventionTips: [
      '입력하기 전에 요구사항을 미리 확인하세요',
      '자동완성 기능을 활용하세요',
      '중요한 정보는 복사해서 보관해두세요',
    ],
    keyboardShortcuts: [
      { key: 'Tab', action: '다음 입력 필드로 이동' },
      { key: 'Shift+Tab', action: '이전 입력 필드로 이동' },
      { key: 'Enter', action: '폼 제출' },
    ],
  },

  PERMISSION_ERROR: {
    errorType: 'PERMISSION_ERROR',
    errorCode: 403,
    userFriendlyTitle: '이 기능을 사용할 권한이 없습니다',
    contextualMessage: '현재 계정으로는 이 기능에 접근할 수 없습니다.',
    severity: 'medium',
    announceToScreenReader: '접근 권한이 없습니다. 관리자에게 문의하거나 다른 계정으로 로그인이 필요합니다.',
    steps: [
      {
        id: 'check-account-type',
        title: '1. 계정 유형 확인',
        description: '현재 계정이 이 기능을 사용할 수 있는 권한을 가지고 있는지 확인해주세요.',
        isAccessible: true,
      },
      {
        id: 'contact-admin',
        title: '2. 관리자에게 문의',
        description: '권한이 필요하다면 팀 관리자나 회사 관리자에게 문의해주세요.',
        action: {
          label: '관리자 연락처 보기',
          onClick: () => {
            // 관리자 연락처 모달 표시 로직
            alert('관리자: admin@company.com')
          },
        },
        isAccessible: true,
      },
      {
        id: 'switch-account',
        title: '3. 다른 계정으로 로그인',
        description: '권한이 있는 다른 계정으로 로그인해주세요.',
        action: {
          label: '계정 전환',
          onClick: () => window.location.href = '/login',
        },
        isAccessible: true,
      },
    ],
    preventionTips: [
      '업무 시작 전에 필요한 권한을 미리 확인하세요',
      '권한 변경이 필요하면 미리 요청하세요',
      '팀 내 권한 정책을 숙지하세요',
    ],
    supportContact: {
      method: 'email',
      value: 'admin@vridge.com',
      label: '관리자 이메일',
    },
  },

  SERVER_ERROR: {
    errorType: 'SERVER_ERROR',
    errorCode: 500,
    userFriendlyTitle: '서버에 일시적인 문제가 발생했습니다',
    contextualMessage: '시스템 점검 중이거나 예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    severity: 'high',
    announceToScreenReader: '서버 오류가 발생했습니다. 자동으로 복구를 시도하고 있습니다.',
    steps: [
      {
        id: 'wait-and-retry',
        title: '1. 잠시 후 다시 시도',
        description: '1-2분 정도 기다린 후 다시 시도해주세요.',
        action: {
          label: '다시 시도',
          onClick: () => window.location.reload(),
        },
        isAccessible: true,
      },
      {
        id: 'check-status',
        title: '2. 서비스 상태 확인',
        description: '서비스 상태 페이지에서 점검 일정을 확인해주세요.',
        action: {
          label: '서비스 상태 보기',
          onClick: () => window.open('https://status.vridge.com', '_blank'),
        },
        isAccessible: true,
      },
      {
        id: 'save-work',
        title: '3. 작업 내용 백업',
        description: '입력하던 내용이 있다면 다른 곳에 미리 복사해두세요.',
        isAccessible: true,
      },
      {
        id: 'report-issue',
        title: '4. 문제 신고',
        description: '문제가 지속되면 기술지원팀에 신고해주세요.',
        action: {
          label: '문제 신고하기',
          onClick: () => window.location.href = '/support',
        },
        isAccessible: true,
      },
    ],
    preventionTips: [
      '중요한 작업은 자주 저장하세요',
      '서비스 점검 일정을 미리 확인하세요',
      '작업 내용을 로컬에 백업하는 습관을 기르세요',
    ],
    supportContact: {
      method: 'chat',
      value: '/support/chat',
      label: '실시간 채팅 지원',
    },
    keyboardShortcuts: [
      { key: 'Ctrl+S', action: '현재 작업 저장' },
      { key: 'Ctrl+R', action: '페이지 새로고침' },
    ],
  },

  NOT_FOUND_ERROR: {
    errorType: 'NOT_FOUND_ERROR',
    errorCode: 404,
    userFriendlyTitle: '요청하신 페이지를 찾을 수 없습니다',
    contextualMessage: '페이지가 이동되었거나 삭제되었을 수 있습니다.',
    severity: 'low',
    announceToScreenReader: '페이지를 찾을 수 없습니다. 대체 경로를 안내해드리겠습니다.',
    steps: [
      {
        id: 'check-url',
        title: '1. 주소 확인',
        description: '주소창의 URL이 정확한지 확인해주세요.',
        isAccessible: true,
      },
      {
        id: 'go-home',
        title: '2. 홈페이지로 이동',
        description: '홈페이지에서 원하는 페이지를 다시 찾아보세요.',
        action: {
          label: '홈페이지로 가기',
          onClick: () => window.location.href = '/',
        },
        isAccessible: true,
      },
      {
        id: 'use-search',
        title: '3. 검색 기능 사용',
        description: '사이트 검색을 통해 원하는 내용을 찾아보세요.',
        action: {
          label: '검색하기',
          onClick: () => {
            const searchQuery = prompt('검색하실 내용을 입력해주세요:')
            if (searchQuery) {
              window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`
            }
          },
        },
        isAccessible: true,
      },
      {
        id: 'contact-support',
        title: '4. 지원팀에 문의',
        description: '특정 페이지를 찾고 계시다면 지원팀에 문의해주세요.',
        isAccessible: true,
      },
    ],
    preventionTips: [
      '북마크를 활용하여 자주 사용하는 페이지를 저장하세요',
      '사이트 메뉴를 통해 페이지에 접근하세요',
      '검색 기능을 적극 활용하세요',
    ],
    supportContact: {
      method: 'email',
      value: 'help@vridge.com',
      label: '고객지원팀 이메일',
    },
    keyboardShortcuts: [
      { key: 'Ctrl+/', action: '검색창 포커스' },
      { key: 'Alt+Home', action: '홈페이지로 이동' },
    ],
  },
}

/**
 * 에러 타입과 코드를 기반으로 적절한 복구 워크플로우를 반환
 */
export function getErrorRecoveryWorkflow(
  errorType: string,
  errorCode?: string | number
): ErrorRecoveryWorkflow | null {
  // 직접 매칭
  if (ERROR_RECOVERY_WORKFLOWS[errorType]) {
    return ERROR_RECOVERY_WORKFLOWS[errorType]
  }

  // HTTP 상태 코드 기반 매칭
  if (errorCode) {
    const codeStr = errorCode.toString()
    for (const workflow of Object.values(ERROR_RECOVERY_WORKFLOWS)) {
      if (workflow.errorCode?.toString() === codeStr) {
        return workflow
      }
    }
  }

  // 기본 서버 에러 반환
  return ERROR_RECOVERY_WORKFLOWS.SERVER_ERROR
}

/**
 * 에러 복구 과정의 진행률 계산
 */
export function calculateRecoveryProgress(steps: ErrorRecoveryStep[]): number {
  const completedSteps = steps.filter(step => step.isCompleted).length
  return Math.round((completedSteps / steps.length) * 100)
}

/**
 * 접근성을 고려한 에러 메시지 생성
 */
export function generateAccessibleErrorMessage(
  workflow: ErrorRecoveryWorkflow,
  includeSteps = true
): string {
  let message = `${workflow.userFriendlyTitle}. ${workflow.contextualMessage}`
  
  if (includeSteps && workflow.steps.length > 0) {
    message += ` 해결 방법: ${workflow.steps.length}단계로 안내해드리겠습니다.`
  }
  
  if (workflow.keyboardShortcuts && workflow.keyboardShortcuts.length > 0) {
    const shortcuts = workflow.keyboardShortcuts
      .map(shortcut => `${shortcut.key}: ${shortcut.action}`)
      .join(', ')
    message += ` 키보드 단축키: ${shortcuts}`
  }
  
  return message
}