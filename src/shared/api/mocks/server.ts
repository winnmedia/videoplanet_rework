/**
 * 서버용 MSW 설정
 * Jest 테스트에서 사용
 */

import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)