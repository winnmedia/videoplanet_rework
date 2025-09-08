/**
 * 환경 변수 검증 모듈 통합 인덱스
 * FSD 아키텍처: shared/lib/env-validation 레이어
 */

// SendGrid 전용 검증 및 설정
export {
  validateSendGridEnv,
  checkSendGridHealth,
  createSendGridConfig,
  sendGridConfig,
  type SendGridEnv,
} from './sendgrid'

// 추후 다른 서비스별 환경 변수 검증 모듈 추가 예정
// export { validateAuth0Env } from './auth0'
// export { validateStripeEnv } from './stripe'