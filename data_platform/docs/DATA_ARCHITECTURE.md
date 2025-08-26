# vridge 데이터 플랫폼 아키텍처

## 개요

vridge 프로젝트의 데이터 플랫폼은 **데이터를 제품으로 취급**하는 철학을 기반으로 설계되었습니다. 모든 데이터 아티팩트는 명확한 소유권, 버전 관리, 품질 보증을 가지며, 비즈니스 가치와 직접적으로 연결됩니다.

## 핵심 설계 원칙

### 1. Schema-First Development
- 모든 이벤트는 버전화된 스키마를 가짐
- 백워드 호환성 보장
- 스키마 진화 전략 수립

### 2. Data TDD (Test-Driven Development)
- 파이프라인 구현 전 데이터 품질 테스트 작성
- Great Expectations 스타일의 검증 프레임워크
- 90% 이상의 테스트 커버리지 목표

### 3. Slice-Oriented Architecture
- 비즈니스 슬라이스별 독립적 파이프라인
- 명확한 소유권과 SLO 정의
- 도메인 중심 설계

### 4. ML-Ready Infrastructure
- Point-in-time correct 피처 스토어
- 피처 드리프트 감지
- 온라인/오프라인 일관성 보장

## 아키텍처 구성 요소

### 1. 이벤트 스키마 레지스트리 (`schemas/`)

**목적**: 중앙화된 스키마 관리 및 버전 제어

**주요 기능**:
- 이벤트 타입 정의 및 버전 관리
- 스키마 호환성 검증
- 자동 문서화

**이벤트 카테고리**:
- User Events: 사용자 활동 추적
- Project Events: 프로젝트 생명주기 관리
- Feedback Events: 피드백 상호작용
- Collaboration Events: 실시간 협업 활동
- System Events: 시스템 메트릭 및 로그

### 2. 데이터 품질 테스트 (`tests/`)

**목적**: 데이터 신뢰성 보장

**품질 차원**:
- **Completeness**: 필수 필드 존재 여부
- **Accuracy**: 값의 정확성
- **Consistency**: 데이터 간 일관성
- **Timeliness**: 데이터 신선도
- **Validity**: 형식 및 범위 유효성
- **Uniqueness**: 중복 제거

**테스트 레벨**:
1. Unit Tests: 개별 변환 로직
2. Integration Tests: 파이프라인 전체 플로우
3. Contract Tests: 스키마 준수 여부
4. Regression Tests: 과거 데이터 재처리

### 3. ETL/ELT 파이프라인 (`pipelines/`)

**파이프라인 유형**:

#### Batch Pipelines
- `ProjectAnalyticsPipeline`: 6시간 주기 프로젝트 분석
- SLO: 99% 완전성, 360분 이내 신선도

#### Micro-batch Pipelines
- `UserEventPipeline`: 5분 주기 사용자 이벤트 처리
- SLO: 99.5% 완전성, 5분 이내 신선도

#### Streaming Pipelines
- `CollaborationStreamingPipeline`: 실시간 협업 이벤트
- SLO: 99.9% 완전성, 1분 이내 신선도

**핵심 기능**:
- 체크포인트 및 복구 메커니즘
- 멱등성 보장
- 데이터 계보(Lineage) 추적
- 자동 재시도 및 에러 핸들링

### 4. 메트릭 레이어 (`metrics/`)

**목적**: 일관된 비즈니스 메트릭 제공

**핵심 메트릭**:

| 메트릭 | 타입 | SLO | 설명 |
|--------|------|-----|------|
| Active Users | Counter | ≥100 | 활성 사용자 수 |
| Project Success Rate | Ratio | ≥80% | 프로젝트 성공률 |
| Feedback Response Time | Distribution | ≤24h | 피드백 응답 시간 |
| User Engagement Score | Composite | - | 사용자 참여도 종합 점수 |
| Collaboration Intensity | Gauge | - | 프로젝트별 협업 강도 |

**대시보드 프리셋**:
- Executive Dashboard: 경영진용 핵심 지표
- Project Manager Dashboard: 프로젝트 관리 지표
- User Analytics Dashboard: 사용자 분석 지표

### 5. 피처 스토어 (`features/`)

**목적**: ML 모델을 위한 피처 엔지니어링 및 서빙

**피처 카테고리**:

#### User Features
- `user_activity_features`: 로그인, 프로젝트, 피드백 활동
- `user_engagement_features`: 참여도 점수 및 레벨
- `user_text_features`: 텍스트 기반 감성 분석

#### Project Features
- `project_features`: 프로젝트 기본 속성
- `project_collaboration_features`: 협업 강도 지표

**주요 기능**:
- Point-in-time correctness 보장
- 온라인 서빙 (<50ms p99)
- 피처 드리프트 감지
- 피처 버전 관리

### 6. 모니터링 시스템 (`monitoring/`)

**모니터링 차원**:

| 차원 | 메트릭 | 임계값 | 알림 |
|------|--------|--------|------|
| Pipeline Status | 실패율 | >10% | ERROR |
| Data Quality | 품질 점수 | <90% | WARNING |
| SLO Compliance | 준수율 | <99% | CRITICAL |
| System Health | 리소스 사용률 | >85% | WARNING |
| Feature Drift | 드리프트 감지 | True | WARNING |

**알림 채널**:
- **CRITICAL**: Email + Slack + PagerDuty
- **ERROR**: Slack + Webhook
- **WARNING**: Webhook + Log
- **INFO**: Log only

**자동 복구**:
- 파이프라인 자동 재시도 (최대 3회)
- 캐시 무효화 및 재생성
- 자동 스케일링 트리거

## 데이터 플로우

```
[Source Systems] 
    ↓
[Event Collection]
    ↓
[Schema Validation] ← [Schema Registry]
    ↓
[Data Quality Tests]
    ↓
[ETL/ELT Pipelines] → [Data Warehouse]
    ↓                      ↓
[Metrics Layer]      [Feature Store]
    ↓                      ↓
[Dashboards]         [ML Models]
    ↑                      ↑
[Monitoring & Alerting System]
```

## SLO (Service Level Objectives)

### 데이터 신선도
- Real-time: < 1분
- Near real-time: < 5분
- Batch: < 6시간

### 데이터 완전성
- Critical paths: > 99.9%
- Standard paths: > 99%
- Best effort: > 95%

### 파이프라인 가용성
- Production: 99.9%
- Staging: 99%
- Development: 95%

### 피처 서빙 레이턴시
- p50: < 20ms
- p95: < 50ms
- p99: < 100ms

## 데이터 거버넌스

### 데이터 분류
- **PII (Personally Identifiable Information)**: 암호화 및 접근 제어
- **Business Critical**: 백업 및 복구 전략
- **Public**: 캐싱 및 CDN 배포

### 보존 정책
- Raw events: 90일
- Aggregated metrics: 2년
- ML features: 180일
- Monitoring data: 30일

### 접근 제어
- Role-based access control (RBAC)
- 데이터 슬라이스별 권한 관리
- 감사 로그 유지

## 기술 스택

### 데이터 저장소
- **PostgreSQL**: 트랜잭션 데이터
- **Redis**: 캐싱 및 실시간 데이터
- **S3**: 장기 보관 및 데이터 레이크

### 처리 프레임워크
- **Django ORM**: 데이터 접근 레이어
- **Pandas**: 데이터 변환 및 분석
- **Celery**: 비동기 작업 처리

### 모니터링 도구
- **Custom Monitoring**: 자체 구축 모니터링
- **Prometheus**: 메트릭 수집 (선택사항)
- **Grafana**: 시각화 (선택사항)

## 구현 로드맵

### Phase 1: Foundation (완료)
- [x] 스키마 레지스트리 구축
- [x] 데이터 품질 테스트 프레임워크
- [x] 기본 ETL 파이프라인

### Phase 2: Analytics (완료)
- [x] 메트릭 레이어 구현
- [x] 대시보드 설계
- [x] SLO 모니터링

### Phase 3: ML Infrastructure (완료)
- [x] 피처 스토어 구축
- [x] 드리프트 감지
- [x] 모델 서빙 인프라

### Phase 4: Production (진행 중)
- [ ] 프로덕션 배포
- [ ] 스케일링 전략 구현
- [ ] 재해 복구 계획

## 운영 가이드

### 일일 점검 사항
1. 파이프라인 실행 상태 확인
2. 데이터 품질 점수 검토
3. SLO 준수 여부 확인
4. 활성 알림 처리

### 주간 리뷰
1. 피처 드리프트 분석
2. 파이프라인 성능 최적화
3. 메트릭 정확성 검증
4. 용량 계획 업데이트

### 월간 업무
1. 스키마 버전 관리 검토
2. 데이터 보존 정책 실행
3. 접근 권한 감사
4. 재해 복구 테스트

## 문제 해결 가이드

### 파이프라인 실패
1. 에러 로그 확인
2. 체크포인트에서 재시작
3. 데이터 품질 테스트 실행
4. 수동 백필 실행 (필요시)

### 데이터 품질 이슈
1. 실패한 테스트 식별
2. 소스 데이터 검증
3. 변환 로직 검토
4. 테스트 임계값 조정 (필요시)

### 성능 저하
1. 리소스 사용률 확인
2. 쿼리 최적화
3. 캐시 효율성 검토
4. 파티셔닝 전략 조정

## 연락처

- Data Lead: Daniel (데이터 팀)
- Platform Owner: DevOps 팀
- Business Stakeholder: Product 팀

## 참고 자료

- [이벤트 스키마 카탈로그](./schemas/catalog.md)
- [메트릭 정의서](./metrics/definitions.md)
- [피처 카탈로그](./features/catalog.md)
- [API 문서](./api/README.md)