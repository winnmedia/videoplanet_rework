#!/usr/bin/env node

/**
 * VLANET 데이터 일관성 및 무결성 검증 스크립트
 * TDD Red Phase - 실패하는 검증부터 시작
 */

const fs = require('fs');
const path = require('path');

// 색상 출력을 위한 헬퍼
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
};

const log = (color, prefix, message) => {
  console.log(`${colors[color]}${prefix}${colors.reset} ${message}`);
};

const success = (message) => log('green', '✅', message);
const error = (message) => log('red', '❌', message);
const warning = (message) => log('yellow', '⚠️ ', message);
const info = (message) => log('blue', 'ℹ️ ', message);

class DataIntegrityChecker {
  constructor() {
    this.results = {
      totalChecks: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      criticalIssues: [],
      recommendations: []
    };
    
    this.srcPath = path.join(__dirname, '../src');
  }

  /**
   * 메인 검증 실행
   */
  async run() {
    console.log(`${colors.cyan}🔍 VLANET 데이터 무결성 검증 시작${colors.reset}\n`);
    
    await this.checkDataContracts();
    await this.checkPipelineDataFlow();
    await this.checkReduxStateIntegrity();
    await this.checkLocalStorageConsistency();
    await this.checkAPIContractCompliance();
    await this.checkDtoViewModelTransforms();
    await this.checkCrossSliceSync();
    await this.checkErrorRecovery();
    await this.checkGDPRCompliance();
    await this.checkPerformanceOptimization();
    
    this.generateReport();
  }

  /**
   * 1. Zod 스키마 기반 데이터 계약 검증
   */
  async checkDataContracts() {
    info('데이터 계약 스키마 검증 중...');
    
    try {
      // 데이터 계약 파일 존재 확인
      const contractsPath = path.join(this.srcPath, 'shared/lib/data-contracts.ts');
      if (!fs.existsSync(contractsPath)) {
        this.addResult(false, '데이터 계약 파일이 존재하지 않습니다', true);
        return;
      }

      const contractsContent = fs.readFileSync(contractsPath, 'utf-8');
      
      // 필수 스키마 존재 확인
      const requiredSchemas = [
        'userDataContract',
        'projectDataContract',
        'videoDataContract',
        'analyticsDataContract',
        'pipelineProgressContract',
        'DataContractValidator'
      ];

      requiredSchemas.forEach(schema => {
        if (contractsContent.includes(schema)) {
          this.addResult(true, `${schema} 스키마 정의 확인됨`);
        } else {
          this.addResult(false, `${schema} 스키마가 누락됨`, true);
        }
      });

      // GDPR 준수 필드 확인
      if (contractsContent.includes('gdprConsent') && contractsContent.includes('consentGiven')) {
        this.addResult(true, 'GDPR 준수 필드가 데이터 계약에 포함됨');
      } else {
        this.addResult(false, 'GDPR 준수 필드가 누락됨', true);
      }

      // 스키마 레지스트리 확인
      if (contractsContent.includes('SCHEMA_REGISTRY')) {
        this.addResult(true, '스키마 레지스트리가 정의됨');
      } else {
        this.addResult(false, '스키마 레지스트리가 누락됨');
      }

    } catch (error) {
      this.addResult(false, `데이터 계약 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 2. 7단계 파이프라인 데이터 흐름 검증
   */
  async checkPipelineDataFlow() {
    info('7단계 파이프라인 데이터 흐름 검증 중...');
    
    try {
      const pipelineStorePath = path.join(this.srcPath, 'processes/userPipeline/model/pipelineStore.ts');
      
      if (!fs.existsSync(pipelineStorePath)) {
        this.addResult(false, '파이프라인 스토어 파일이 존재하지 않습니다', true);
        return;
      }

      const pipelineContent = fs.readFileSync(pipelineStorePath, 'utf-8');

      // 7단계 파이프라인 정의 확인
      const expectedSteps = ['signup', 'login', 'project', 'invite', 'planning', 'prompt', 'feedback'];
      
      // 각 단계가 파일에 문자열로 존재하는지 직접 확인
      expectedSteps.forEach(step => {
        if (pipelineContent.includes(`'${step}'`) || pipelineContent.includes(`"${step}"`)) {
          this.addResult(true, `파이프라인 단계 '${step}' 정의 확인됨`);
        } else {
          this.addResult(false, `파이프라인 단계 '${step}' 누락됨`, true);
        }
      });

      // PIPELINE_ORDER 정의 확인
      if (pipelineContent.includes('PIPELINE_ORDER')) {
        this.addResult(true, 'PIPELINE_ORDER 상수 정의 확인됨');
      } else {
        this.addResult(false, 'PIPELINE_ORDER 상수 정의 누락됨', true);
      }

      // 상태 전환 검증 로직 확인
      if (pipelineContent.includes('isValidStepTransition')) {
        this.addResult(true, '파이프라인 단계 전환 검증 로직 존재');
      } else {
        this.addResult(false, '파이프라인 단계 전환 검증 로직 누락');
      }

      // 사용자 진행률 추적 확인
      if (pipelineContent.includes('UserProgress') && pipelineContent.includes('SessionData')) {
        this.addResult(true, '사용자 진행률 추적 인터페이스 정의됨');
      } else {
        this.addResult(false, '사용자 진행률 추적 인터페이스 누락');
      }

    } catch (error) {
      this.addResult(false, `파이프라인 데이터 흐름 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 3. Redux 상태 관리 데이터 무결성 검증
   */
  async checkReduxStateIntegrity() {
    info('Redux 상태 관리 무결성 검증 중...');
    
    try {
      const storePath = path.join(this.srcPath, 'app/store.enhanced.ts');
      
      if (!fs.existsSync(storePath)) {
        this.addResult(false, '통합 스토어 파일이 존재하지 않습니다', true);
        return;
      }

      const storeContent = fs.readFileSync(storePath, 'utf-8');

      // Redux Toolkit 2.0 사용 확인
      if (storeContent.includes("@reduxjs/toolkit")) {
        this.addResult(true, 'Redux Toolkit 2.0 사용 확인됨');
      } else {
        this.addResult(false, 'Redux Toolkit 사용이 확인되지 않음');
      }

      // 영속성 설정 확인
      if (storeContent.includes('persistReducer') && storeContent.includes('persistStore')) {
        this.addResult(true, 'Redux 영속성 설정 확인됨');
      } else {
        this.addResult(false, 'Redux 영속성 설정 누락');
      }

      // 타입 안전성 검증 확인
      if (storeContent.includes('validateRootState') && storeContent.includes('isValidRootState')) {
        this.addResult(true, '상태 타입 안전성 검증 함수 존재');
      } else {
        this.addResult(false, '상태 타입 안전성 검증 함수 누락');
      }

      // 직렬화 불가능 데이터 처리 확인
      if (storeContent.includes('serializeTransforms')) {
        this.addResult(true, '직렬화 변환 로직 존재 (Set 등 처리)');
      } else {
        this.addResult(false, '직렬화 변환 로직 누락');
      }

      // 민감정보 보호 확인
      if (storeContent.includes('actionSanitizer') && storeContent.includes('stateSanitizer')) {
        this.addResult(true, 'DevTools 민감정보 보호 설정 확인됨');
      } else {
        this.addResult(false, 'DevTools 민감정보 보호 설정 누락');
      }

    } catch (error) {
      this.addResult(false, `Redux 상태 무결성 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 4. LocalStorage 영속성 데이터 검증
   */
  async checkLocalStorageConsistency() {
    info('LocalStorage 영속성 일관성 검증 중...');
    
    try {
      const persistenceMiddlewarePath = path.join(this.srcPath, 'shared/lib/middleware/persistenceMiddleware.ts');
      
      if (!fs.existsSync(persistenceMiddlewarePath)) {
        this.addResult(false, '영속성 미들웨어 파일이 존재하지 않습니다', true);
        return;
      }

      const persistenceContent = fs.readFileSync(persistenceMiddlewarePath, 'utf-8');

      // 스토리지 키 정의 확인
      if (persistenceContent.includes('STORAGE_KEYS')) {
        this.addResult(true, 'LocalStorage 키 정의 확인됨');
      } else {
        this.addResult(false, 'LocalStorage 키 정의 누락');
      }

      // 안전한 스토리지 접근 확인
      if (persistenceContent.includes('safeLocalStorageGet') && persistenceContent.includes('safeLocalStorageSet')) {
        this.addResult(true, '안전한 LocalStorage 접근 함수 존재');
      } else {
        this.addResult(false, '안전한 LocalStorage 접근 함수 누락');
      }

      // 오프라인 지원 확인
      if (persistenceContent.includes('offlineQueue') && persistenceContent.includes('processOfflineQueue')) {
        this.addResult(true, '오프라인 지원 기능 확인됨');
      } else {
        this.addResult(false, '오프라인 지원 기능 누락');
      }

      // 세션 타임아웃 관리 확인
      if (persistenceContent.includes('sessionTimeoutInterval')) {
        this.addResult(true, '세션 타임아웃 관리 확인됨');
      } else {
        this.addResult(false, '세션 타임아웃 관리 누락');
      }

      // 데이터 백업/내보내기 확인
      if (persistenceContent.includes('exportUserData')) {
        this.addResult(true, '사용자 데이터 내보내기 기능 존재');
      } else {
        this.addResult(false, '사용자 데이터 내보내기 기능 누락');
      }

    } catch (error) {
      this.addResult(false, `LocalStorage 일관성 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 5. API 응답 데이터 계약 준수 확인
   */
  async checkAPIContractCompliance() {
    info('API 응답 데이터 계약 준수 확인 중...');
    
    try {
      const apiContractPath = path.join(this.srcPath, 'shared/lib/api-contract.ts');
      
      if (fs.existsSync(apiContractPath)) {
        const apiContractContent = fs.readFileSync(apiContractPath, 'utf-8');
        
        // API 계약 검증기 확인
        if (apiContractContent.includes('APIContractValidator')) {
          this.addResult(true, 'API 계약 검증기 존재');
        } else {
          this.addResult(false, 'API 계약 검증기 누락');
        }

        // HTTP 상태 코드 처리 확인
        if (apiContractContent.includes('validateResponse') && apiContractContent.includes('statusCode')) {
          this.addResult(true, 'API 응답 상태 코드 검증 로직 존재');
        } else {
          this.addResult(false, 'API 응답 상태 코드 검증 로직 누락');
        }
      } else {
        this.addResult(false, 'API 계약 검증 파일이 존재하지 않습니다');
      }

      // MSW 핸들러 확인
      const mswHandlersPath = path.join(this.srcPath, 'shared/api/mocks/handlers.ts');
      if (fs.existsSync(mswHandlersPath)) {
        this.addResult(true, 'MSW API 모킹 핸들러 존재');
      } else {
        this.addResult(false, 'MSW API 모킹 핸들러 누락');
      }

    } catch (error) {
      this.addResult(false, `API 계약 준수 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 6. DTO-ViewModel 변환 정확성 검사
   */
  async checkDtoViewModelTransforms() {
    info('DTO-ViewModel 변환 정확성 검사 중...');
    
    try {
      const mappersPath = path.join(this.srcPath, 'shared/lib/data-mappers.ts');
      
      if (!fs.existsSync(mappersPath)) {
        this.addResult(false, '데이터 매퍼 파일이 존재하지 않습니다', true);
        return;
      }

      const mappersContent = fs.readFileSync(mappersPath, 'utf-8');

      // 필수 매퍼 클래스 확인
      const requiredMappers = [
        'UserDtoMapper',
        'ProjectDtoMapper',
        'VideoDtoMapper',
        'AnalyticsDtoMapper',
        'PipelineDtoMapper'
      ];

      requiredMappers.forEach(mapper => {
        if (mappersContent.includes(`class ${mapper}`)) {
          this.addResult(true, `${mapper} 클래스 정의 확인됨`);
        } else {
          this.addResult(false, `${mapper} 클래스 누락됨`);
        }
      });

      // snake_case → camelCase 변환 로직 확인
      if (mappersContent.includes('transformKeys') && mappersContent.includes('toCamelCase')) {
        this.addResult(true, 'DTO 키 변환 로직 확인됨');
      } else {
        this.addResult(false, 'DTO 키 변환 로직 누락');
      }

      // 데이터 계약 검증 통합 확인
      if (mappersContent.includes('DataContractValidator') && mappersContent.includes('validateWithReport')) {
        this.addResult(true, 'DTO 변환 시 데이터 계약 검증 통합됨');
      } else {
        this.addResult(false, 'DTO 변환 시 데이터 계약 검증 누락');
      }

      // GDPR 준수 데이터 필터링 확인
      if (mappersContent.includes('sanitizeForGDPR') || mappersContent.includes('anonymize')) {
        this.addResult(true, 'GDPR 준수 데이터 필터링 로직 존재');
      } else {
        this.addResult(false, 'GDPR 준수 데이터 필터링 로직 누락');
      }

    } catch (error) {
      this.addResult(false, `DTO-ViewModel 변환 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 7. 크로스 슬라이스 데이터 동기화 검증
   */
  async checkCrossSliceSync() {
    info('크로스 슬라이스 데이터 동기화 검증 중...');
    
    try {
      const crossSlicePath = path.join(this.srcPath, 'shared/lib/middleware/crossSliceSync.ts');
      
      if (!fs.existsSync(crossSlicePath)) {
        this.addResult(false, '크로스 슬라이스 동기화 미들웨어가 존재하지 않습니다', true);
        return;
      }

      const crossSliceContent = fs.readFileSync(crossSlicePath, 'utf-8');

      // 인증 상태 → 파이프라인 동기화 확인
      if (crossSliceContent.includes('loginWithThunk.fulfilled') && crossSliceContent.includes('syncWithAuthState')) {
        this.addResult(true, '인증-파이프라인 상태 동기화 로직 존재');
      } else {
        this.addResult(false, '인증-파이프라인 상태 동기화 로직 누락');
      }

      // 에러 상태 전파 확인
      if (crossSliceContent.includes("action.type.endsWith('/rejected')")) {
        this.addResult(true, '에러 상태 전파 로직 존재');
      } else {
        this.addResult(false, '에러 상태 전파 로직 누락');
      }

      // 데이터 유효성 검증 확인
      if (crossSliceContent.includes('State validation failed')) {
        this.addResult(true, '크로스 슬라이스 상태 유효성 검증 존재');
      } else {
        this.addResult(false, '크로스 슬라이스 상태 유효성 검증 누락');
      }

      // 성능 모니터링 확인
      if (crossSliceContent.includes('performance.now()')) {
        this.addResult(true, '액션 성능 모니터링 로직 존재');
      } else {
        this.addResult(false, '액션 성능 모니터링 로직 누락');
      }

    } catch (error) {
      this.addResult(false, `크로스 슬라이스 동기화 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 8. 에러 상황 데이터 복구 테스트
   */
  async checkErrorRecovery() {
    info('에러 상황 데이터 복구 메커니즘 확인 중...');
    
    try {
      // 데이터 파이프라인 복구 로직 확인
      const dataPipelinePath = path.join(this.srcPath, 'shared/lib/data-pipeline.ts');
      
      if (fs.existsSync(dataPipelinePath)) {
        const pipelineContent = fs.readFileSync(dataPipelinePath, 'utf-8');
        
        // 파이프라인 실행 실패 처리 확인
        if (pipelineContent.includes('executeStageWithTimeout') && pipelineContent.includes('catch')) {
          this.addResult(true, '파이프라인 실행 실패 처리 로직 존재');
        } else {
          this.addResult(false, '파이프라인 실행 실패 처리 로직 누락');
        }

        // SLA 위반 감지 확인
        if (pipelineContent.includes('slaViolations') && pipelineContent.includes('maxExecutionTime')) {
          this.addResult(true, 'SLA 위반 감지 로직 존재');
        } else {
          this.addResult(false, 'SLA 위반 감지 로직 누락');
        }

        // 부분 실패 복구 확인
        if (pipelineContent.includes('retryCount') && pipelineContent.includes('maxRetries')) {
          this.addResult(true, '부분 실패 재시도 로직 존재');
        } else {
          this.addResult(false, '부분 실패 재시도 로직 누락');
        }
      } else {
        this.addResult(false, '데이터 파이프라인 파일 누락');
      }

      // 백업 복구 시스템 확인
      const backupRecoveryPath = path.join(this.srcPath, 'shared/lib/backup-recovery.ts');
      if (fs.existsSync(backupRecoveryPath)) {
        this.addResult(true, '백업 복구 시스템 파일 존재');
      } else {
        this.addResult(false, '백업 복구 시스템 파일 누락');
      }

    } catch (error) {
      this.addResult(false, `에러 복구 메커니즘 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 9. GDPR 준수 데이터 처리 검증
   */
  async checkGDPRCompliance() {
    info('GDPR 준수 데이터 처리 검증 중...');
    
    try {
      const contractsPath = path.join(this.srcPath, 'shared/lib/data-contracts.ts');
      
      if (fs.existsSync(contractsPath)) {
        const contractsContent = fs.readFileSync(contractsPath, 'utf-8');
        
        // GDPR 동의 스키마 확인
        if (contractsContent.includes('gdprConsentSchema') && contractsContent.includes('consentGiven')) {
          this.addResult(true, 'GDPR 동의 스키마 정의됨');
        } else {
          this.addResult(false, 'GDPR 동의 스키마 누락', true);
        }

        // 데이터 보존 기간 확인
        if (contractsContent.includes('retentionPeriod') && contractsContent.includes('retentionExpiry')) {
          this.addResult(true, '데이터 보존 기간 관리 확인됨');
        } else {
          this.addResult(false, '데이터 보존 기간 관리 누락');
        }

        // GDPR 준수 검증 함수 확인
        if (contractsContent.includes('validateGDPRCompliance')) {
          this.addResult(true, 'GDPR 준수 검증 함수 존재');
        } else {
          this.addResult(false, 'GDPR 준수 검증 함수 누락');
        }

        // 데이터 암호화 요구사항 확인
        if (contractsContent.includes('requiresEncryption')) {
          this.addResult(true, '데이터 암호화 요구사항 검증 로직 존재');
        } else {
          this.addResult(false, '데이터 암호화 요구사항 검증 로직 누락');
        }
      }

      // 데이터 익명화 로직 확인
      const mappersPath = path.join(this.srcPath, 'shared/lib/data-mappers.ts');
      if (fs.existsSync(mappersPath)) {
        const mappersContent = fs.readFileSync(mappersPath, 'utf-8');
        
        if (mappersContent.includes('anonymize') && mappersContent.includes('generateAnonymousId')) {
          this.addResult(true, '데이터 익명화 로직 확인됨');
        } else {
          this.addResult(false, '데이터 익명화 로직 누락');
        }
      }

    } catch (error) {
      this.addResult(false, `GDPR 준수 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 10. 성능 및 메모리 최적화 검증
   */
  async checkPerformanceOptimization() {
    info('성능 및 메모리 최적화 검증 중...');
    
    try {
      // 성능 최적화 로직 확인
      const performanceOptimizerPath = path.join(this.srcPath, 'shared/lib/performance/performanceOptimizer.ts');
      
      if (fs.existsSync(performanceOptimizerPath)) {
        this.addResult(true, '성능 최적화 모듈 존재');
        
        const optimizerContent = fs.readFileSync(performanceOptimizerPath, 'utf-8');
        
        // 메모리 사용량 모니터링 확인
        if (optimizerContent.includes('memory') || optimizerContent.includes('heap')) {
          this.addResult(true, '메모리 사용량 모니터링 로직 존재');
        } else {
          this.addResult(false, '메모리 사용량 모니터링 로직 누락');
        }
      } else {
        this.addResult(false, '성능 최적화 모듈 누락');
      }

      // Redux 선택자 최적화 확인
      const selectorsPath = path.join(this.srcPath, 'shared/lib/selectors/optimizedSelectors.ts');
      if (fs.existsSync(selectorsPath)) {
        this.addResult(true, '최적화된 Redux 선택자 존재');
      } else {
        this.addResult(false, '최적화된 Redux 선택자 누락');
      }

      // 성능 예산 설정 확인
      const performanceBudgetPath = path.join(__dirname, '../performance-budget.config.js');
      if (fs.existsSync(performanceBudgetPath)) {
        this.addResult(true, '성능 예산 설정 파일 존재');
      } else {
        this.addResult(false, '성능 예산 설정 파일 누락');
      }

      // 번들 크기 분석 스크립트 확인
      const bundleAnalysisPath = path.join(__dirname, '../scripts/bundle-analysis.js');
      if (fs.existsSync(bundleAnalysisPath)) {
        this.addResult(true, '번들 크기 분석 스크립트 존재');
      } else {
        this.addResult(false, '번들 크기 분석 스크립트 누락');
      }

    } catch (error) {
      this.addResult(false, `성능 최적화 검증 실패: ${error.message}`, true);
    }
  }

  /**
   * 결과 추가 헬퍼
   */
  addResult(passed, message, isCritical = false) {
    this.results.totalChecks++;
    
    if (passed) {
      this.results.passed++;
      success(message);
    } else {
      this.results.failed++;
      
      if (isCritical) {
        this.results.criticalIssues.push(message);
        error(`[CRITICAL] ${message}`);
      } else {
        this.results.warnings++;
        warning(message);
      }
    }
  }

  /**
   * 최종 보고서 생성
   */
  generateReport() {
    console.log(`\n${colors.cyan}📊 데이터 무결성 검증 결과 보고서${colors.reset}`);
    console.log('='.repeat(60));
    
    // 요약 통계
    console.log(`\n${colors.white}검증 통계:${colors.reset}`);
    console.log(`  전체 검사 항목: ${this.results.totalChecks}`);
    console.log(`  ${colors.green}통과: ${this.results.passed}${colors.reset}`);
    console.log(`  ${colors.red}실패: ${this.results.failed}${colors.reset}`);
    console.log(`  ${colors.yellow}경고: ${this.results.warnings}${colors.reset}`);
    
    // 성공률 계산
    const successRate = ((this.results.passed / this.results.totalChecks) * 100).toFixed(1);
    console.log(`  성공률: ${successRate >= 90 ? colors.green : successRate >= 70 ? colors.yellow : colors.red}${successRate}%${colors.reset}`);
    
    // 중요 문제점
    if (this.results.criticalIssues.length > 0) {
      console.log(`\n${colors.red}⚠️  중요 문제점:${colors.reset}`);
      this.results.criticalIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }
    
    // 권장사항
    if (this.results.failed > 0) {
      console.log(`\n${colors.blue}💡 권장사항:${colors.reset}`);
      console.log('  1. 중요(CRITICAL) 문제점을 우선 해결하세요');
      console.log('  2. 데이터 계약 스키마 정의를 완성하세요');
      console.log('  3. GDPR 준수 관련 로직을 구현하세요');
      console.log('  4. API 응답 검증 로직을 강화하세요');
      console.log('  5. 에러 복구 메커니즘을 구현하세요');
    }
    
    // 전체 평가
    console.log(`\n${colors.cyan}전체 평가:${colors.reset}`);
    if (successRate >= 90) {
      console.log(`${colors.green}✅ 데이터 무결성 수준이 우수합니다!${colors.reset}`);
    } else if (successRate >= 70) {
      console.log(`${colors.yellow}⚠️  데이터 무결성 수준이 양호하나 개선이 필요합니다.${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ 데이터 무결성에 심각한 문제가 있습니다. 즉시 개선이 필요합니다.${colors.reset}`);
    }
    
    console.log('\n' + '='.repeat(60));
    
    // 프로세스 종료 코드 설정
    process.exitCode = this.results.criticalIssues.length > 0 ? 1 : 0;
  }
}

// 메인 실행
if (require.main === module) {
  const checker = new DataIntegrityChecker();
  checker.run().catch(error => {
    console.error(`${colors.red}❌ 데이터 무결성 검증 실행 중 오류 발생:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = DataIntegrityChecker;