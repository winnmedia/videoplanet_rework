const path = require('path')

/**
 * Pact 계약 테스트 설정
 * 프론트엔드(Consumer)와 백엔드(Provider) 간의 API 계약을 검증합니다.
 * 
 * 계약 기반 테스트의 장점:
 * - API 변경 시 계약 위반을 조기에 감지
 * - 프론트엔드와 백엔드 개발팀 간의 명확한 계약 정의
 * - 독립적인 개발 및 테스트 가능
 * - 버전 호환성 확인
 */

module.exports = {
  // Consumer (프론트엔드) 설정
  consumer: {
    name: 'vridge-frontend',
    version: '1.0.0'
  },

  // Provider (백엔드) 설정
  provider: {
    name: 'vridge-backend',
    version: '1.0.0'
  },

  // Pact 파일 생성 위치
  pactfile_write_mode: 'overwrite',
  pact_dir: path.resolve(__dirname, 'pacts'),

  // 로그 설정
  log_level: process.env.NODE_ENV === 'test' ? 'INFO' : 'DEBUG',
  log_dir: path.resolve(__dirname, 'logs'),

  // Pact Broker 설정 (팀 환경에서 사용)
  pact_broker: {
    url: process.env.PACT_BROKER_URL || 'https://pact-broker.vlanet.net',
    auth: {
      username: process.env.PACT_BROKER_USERNAME,
      password: process.env.PACT_BROKER_PASSWORD
    }
  },

  // 검증 설정
  verification: {
    // Provider 검증 시 사용할 베이스 URL
    provider_base_url: process.env.PROVIDER_URL || 'https://api.vlanet.net',
    
    // Provider 상태 설정 URL
    provider_states_setup_url: process.env.PROVIDER_URL ? 
      `${process.env.PROVIDER_URL}/pact/provider-states` : 
      'https://api.vlanet.net/pact/provider-states',
    
    // 검증할 Pact 파일 또는 URL
    pact_urls: [
      path.resolve(__dirname, 'pacts', 'vridge-frontend-vridge-backend.json')
    ],

    // 태그별 검증 (브랜치별 배포 시 사용)
    consumer_version_tags: ['main', 'develop'],
    
    // can-i-deploy 체크 (배포 안전성 확인)
    enable_pending: true,
    include_wip_pacts_since: '2025-01-01'
  },

  // 테스트 환경 설정
  test: {
    // 테스트 실행 시 Mock Provider 포트
    mock_port: 9000,
    
    // 테스트 타임아웃 (밀리초)
    timeout: 10000,
    
    // 테스트 격리를 위한 클린업 설정
    cleanup: true
  },

  // 발행 설정 (CI/CD 파이프라인에서 사용)
  publish: {
    // 계약을 Pact Broker에 발행할지 여부
    enabled: process.env.CI === 'true',
    
    // Consumer 버전 (보통 Git SHA 또는 빌드 번호)
    consumer_version: process.env.GIT_SHA || process.env.BUILD_NUMBER || '1.0.0',
    
    // 브랜치 태그
    branch: process.env.GIT_BRANCH || 'main',
    
    // 태그 (환경별)
    tags: process.env.NODE_ENV === 'production' ? ['prod'] : ['dev', 'test']
  },

  // 계약 검증 매트릭스 (배포 안전성 확인)
  matrix: {
    // 배포 가능 여부 확인 시 사용할 환경
    environments: [
      {
        name: 'production',
        consumer_version_selector: { tag: 'prod' },
        provider_version_selector: { tag: 'prod' }
      },
      {
        name: 'staging',
        consumer_version_selector: { tag: 'main' },
        provider_version_selector: { tag: 'main' }
      }
    ]
  },

  // 웹훅 설정 (계약 변경 시 알림)
  webhooks: [
    {
      description: '계약 변경 시 Slack 알림',
      events: ['contract_content_changed'],
      request: {
        method: 'POST',
        url: process.env.SLACK_WEBHOOK_URL,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          text: '프로젝트 관리 API 계약이 변경되었습니다.',
          channel: '#api-contracts',
          username: 'Pact Bot'
        }
      }
    }
  ]
}

// Jest 설정에서 사용할 수 있도록 내보내기
module.exports.jestConfig = {
  testEnvironment: 'node',
  setupFilesAfterEnv: [
    path.resolve(__dirname, 'src', 'shared', 'api', 'pact', 'setup.js')
  ],
  testMatch: [
    '**/*.pact.test.{js,ts}'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}