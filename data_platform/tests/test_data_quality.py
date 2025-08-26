"""
데이터 품질 테스트 스위트
Great Expectations 스타일의 데이터 품질 검증 구현

TDD 원칙:
1. 모든 파이프라인은 데이터 품질 테스트를 먼저 작성
2. 테스트는 비즈니스 규칙을 인코딩
3. 실패하는 테스트를 작성한 후 파이프라인 구현
"""

import pytest
from typing import Dict, Any, List, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from enum import Enum


class ExpectationResult:
    """기대값 검증 결과"""
    def __init__(self, success: bool, observed_value: Any = None, expected_value: Any = None, message: str = ""):
        self.success = success
        self.observed_value = observed_value
        self.expected_value = expected_value
        self.message = message
        self.timestamp = datetime.now()


class DataQualityDimension(Enum):
    """데이터 품질 차원"""
    COMPLETENESS = "completeness"  # 완전성
    ACCURACY = "accuracy"  # 정확성
    CONSISTENCY = "consistency"  # 일관성
    TIMELINESS = "timeliness"  # 적시성
    VALIDITY = "validity"  # 유효성
    UNIQUENESS = "uniqueness"  # 고유성


@dataclass
class DataQualityExpectation:
    """데이터 품질 기대값 정의"""
    name: str
    dimension: DataQualityDimension
    check_function: Callable
    severity: str = "warning"  # warning, error, critical
    metadata: Dict[str, Any] = field(default_factory=dict)


class DataQualityValidator:
    """데이터 품질 검증기"""
    
    def __init__(self, dataset_name: str):
        self.dataset_name = dataset_name
        self.expectations: List[DataQualityExpectation] = []
        self.results: List[Dict[str, Any]] = []
        
    def add_expectation(self, expectation: DataQualityExpectation):
        """기대값 추가"""
        self.expectations.append(expectation)
        
    def validate(self, data: pd.DataFrame) -> Dict[str, Any]:
        """데이터 검증 실행"""
        self.results = []
        passed = 0
        failed = 0
        
        for expectation in self.expectations:
            try:
                result = expectation.check_function(data)
                self.results.append({
                    "expectation": expectation.name,
                    "dimension": expectation.dimension.value,
                    "severity": expectation.severity,
                    "result": result,
                    "timestamp": datetime.now()
                })
                
                if result.success:
                    passed += 1
                else:
                    failed += 1
                    
            except Exception as e:
                self.results.append({
                    "expectation": expectation.name,
                    "dimension": expectation.dimension.value,
                    "severity": expectation.severity,
                    "result": ExpectationResult(False, message=str(e)),
                    "timestamp": datetime.now()
                })
                failed += 1
        
        return {
            "dataset": self.dataset_name,
            "total_expectations": len(self.expectations),
            "passed": passed,
            "failed": failed,
            "pass_rate": passed / len(self.expectations) if self.expectations else 0,
            "results": self.results,
            "validated_at": datetime.now()
        }


# === 사용자 이벤트 데이터 품질 테스트 ===

class UserEventQualityTests:
    """사용자 이벤트 데이터 품질 테스트"""
    
    @staticmethod
    def test_user_id_not_null(df: pd.DataFrame) -> ExpectationResult:
        """user_id는 절대 null이 될 수 없음"""
        null_count = df['user_id'].isnull().sum()
        return ExpectationResult(
            success=null_count == 0,
            observed_value=null_count,
            expected_value=0,
            message=f"Found {null_count} null user_ids"
        )
    
    @staticmethod
    def test_timestamp_within_range(df: pd.DataFrame) -> ExpectationResult:
        """타임스탬프는 현재 시간보다 미래일 수 없음"""
        if 'timestamp' not in df.columns:
            return ExpectationResult(False, message="timestamp column not found")
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        future_events = df[df['timestamp'] > datetime.now()]
        
        return ExpectationResult(
            success=len(future_events) == 0,
            observed_value=len(future_events),
            expected_value=0,
            message=f"Found {len(future_events)} events with future timestamps"
        )
    
    @staticmethod
    def test_event_type_valid(df: pd.DataFrame) -> ExpectationResult:
        """이벤트 타입이 정의된 타입 중 하나여야 함"""
        valid_types = ['user.registered', 'user.login', 'user.logout', 'user.profile.updated']
        invalid_events = df[~df['event_type'].isin(valid_types)]
        
        return ExpectationResult(
            success=len(invalid_events) == 0,
            observed_value=len(invalid_events),
            expected_value=0,
            message=f"Found {len(invalid_events)} events with invalid types"
        )
    
    @staticmethod
    def test_session_continuity(df: pd.DataFrame) -> ExpectationResult:
        """같은 세션 내 이벤트는 시간 순서가 일관되어야 함"""
        if 'session_id' not in df.columns or 'timestamp' not in df.columns:
            return ExpectationResult(False, message="Required columns not found")
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        violations = []
        
        for session_id in df['session_id'].unique():
            if pd.isna(session_id):
                continue
            session_events = df[df['session_id'] == session_id].sort_values('timestamp')
            if not session_events['timestamp'].is_monotonic_increasing:
                violations.append(session_id)
        
        return ExpectationResult(
            success=len(violations) == 0,
            observed_value=len(violations),
            expected_value=0,
            message=f"Found {len(violations)} sessions with non-sequential timestamps"
        )
    
    @staticmethod
    def test_login_rate_anomaly(df: pd.DataFrame) -> ExpectationResult:
        """로그인 이벤트 비율이 비정상적이지 않아야 함 (10-60% 범위)"""
        login_events = df[df['event_type'] == 'user.login']
        login_rate = len(login_events) / len(df) if len(df) > 0 else 0
        
        return ExpectationResult(
            success=0.1 <= login_rate <= 0.6,
            observed_value=login_rate,
            expected_value="0.1-0.6",
            message=f"Login rate {login_rate:.2%} is outside normal range"
        )


# === 프로젝트 이벤트 데이터 품질 테스트 ===

class ProjectEventQualityTests:
    """프로젝트 이벤트 데이터 품질 테스트"""
    
    @staticmethod
    def test_project_id_format(df: pd.DataFrame) -> ExpectationResult:
        """project_id는 유효한 형식이어야 함"""
        if 'project_id' not in df.columns:
            return ExpectationResult(False, message="project_id column not found")
        
        # UUID 형식 체크 또는 숫자 ID 체크
        invalid_ids = df[df['project_id'].apply(lambda x: not str(x).isdigit() and len(str(x)) != 36)]
        
        return ExpectationResult(
            success=len(invalid_ids) == 0,
            observed_value=len(invalid_ids),
            expected_value=0,
            message=f"Found {len(invalid_ids)} invalid project IDs"
        )
    
    @staticmethod
    def test_project_phase_transitions(df: pd.DataFrame) -> ExpectationResult:
        """프로젝트 단계 전환이 유효해야 함"""
        valid_phases = ['basic_plan', 'storyboard', 'filming', 'video_edit', 
                       'post_work', 'video_preview', 'confirmation', 'video_delivery']
        
        if 'event_type' not in df.columns:
            return ExpectationResult(False, message="event_type column not found")
        
        phase_events = df[df['event_type'] == 'project.phase.changed']
        if 'phase' in phase_events.columns:
            invalid_phases = phase_events[~phase_events['phase'].isin(valid_phases)]
            return ExpectationResult(
                success=len(invalid_phases) == 0,
                observed_value=len(invalid_phases),
                expected_value=0
            )
        
        return ExpectationResult(True, message="No phase change events found")
    
    @staticmethod
    def test_member_consistency(df: pd.DataFrame) -> ExpectationResult:
        """멤버 추가/제거 일관성 검증"""
        add_events = df[df['event_type'] == 'project.member.added']
        remove_events = df[df['event_type'] == 'project.member.removed']
        
        # 같은 프로젝트에서 제거된 멤버 수가 추가된 멤버 수보다 많을 수 없음
        for project_id in df['project_id'].unique():
            project_adds = len(add_events[add_events['project_id'] == project_id])
            project_removes = len(remove_events[remove_events['project_id'] == project_id])
            
            if project_removes > project_adds:
                return ExpectationResult(
                    success=False,
                    observed_value=f"adds: {project_adds}, removes: {project_removes}",
                    expected_value="removes <= adds",
                    message=f"Project {project_id} has more removes than adds"
                )
        
        return ExpectationResult(True, message="Member consistency check passed")


# === 피드백 이벤트 데이터 품질 테스트 ===

class FeedbackEventQualityTests:
    """피드백 이벤트 데이터 품질 테스트"""
    
    @staticmethod
    def test_feedback_response_time(df: pd.DataFrame) -> ExpectationResult:
        """피드백 응답 시간이 SLO 내에 있어야 함 (24시간)"""
        if 'event_type' not in df.columns or 'timestamp' not in df.columns:
            return ExpectationResult(False, message="Required columns not found")
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # 피드백 생성과 첫 응답 간 시간 계산
        feedback_created = df[df['event_type'] == 'feedback.created']
        feedback_responded = df[df['event_type'].isin(['feedback.comment.added', 'feedback.message.sent'])]
        
        slow_responses = []
        for _, created in feedback_created.iterrows():
            responses = feedback_responded[
                (feedback_responded['feedback_id'] == created.get('feedback_id')) &
                (feedback_responded['timestamp'] > created['timestamp'])
            ]
            
            if not responses.empty:
                response_time = responses.iloc[0]['timestamp'] - created['timestamp']
                if response_time > timedelta(hours=24):
                    slow_responses.append(created.get('feedback_id'))
        
        return ExpectationResult(
            success=len(slow_responses) == 0,
            observed_value=len(slow_responses),
            expected_value=0,
            message=f"Found {len(slow_responses)} feedbacks with slow response times"
        )
    
    @staticmethod
    def test_feedback_completeness(df: pd.DataFrame) -> ExpectationResult:
        """피드백 데이터 필수 필드 완전성 검증"""
        required_fields = ['feedback_id', 'project_id', 'user_id', 'timestamp']
        feedback_events = df[df['event_type'].str.startswith('feedback.')]
        
        missing_fields = []
        for field in required_fields:
            if field not in feedback_events.columns:
                missing_fields.append(field)
            elif feedback_events[field].isnull().any():
                null_count = feedback_events[field].isnull().sum()
                missing_fields.append(f"{field} ({null_count} nulls)")
        
        return ExpectationResult(
            success=len(missing_fields) == 0,
            observed_value=missing_fields,
            expected_value=[],
            message=f"Missing required fields: {', '.join(missing_fields)}" if missing_fields else "All required fields present"
        )


# === 시스템 메트릭 데이터 품질 테스트 ===

class SystemMetricQualityTests:
    """시스템 메트릭 데이터 품질 테스트"""
    
    @staticmethod
    def test_api_latency_percentiles(df: pd.DataFrame) -> ExpectationResult:
        """API 레이턴시 백분위수가 SLO 내에 있어야 함"""
        if 'latency_ms' not in df.columns:
            return ExpectationResult(False, message="latency_ms column not found")
        
        p50 = df['latency_ms'].quantile(0.5)
        p95 = df['latency_ms'].quantile(0.95)
        p99 = df['latency_ms'].quantile(0.99)
        
        # SLO: p50 < 100ms, p95 < 500ms, p99 < 1000ms
        success = p50 < 100 and p95 < 500 and p99 < 1000
        
        return ExpectationResult(
            success=success,
            observed_value=f"p50={p50:.0f}ms, p95={p95:.0f}ms, p99={p99:.0f}ms",
            expected_value="p50<100ms, p95<500ms, p99<1000ms",
            message="API latency within SLO" if success else "API latency exceeds SLO"
        )
    
    @staticmethod
    def test_error_rate(df: pd.DataFrame) -> ExpectationResult:
        """에러율이 임계값 이하여야 함 (1%)"""
        if 'status_code' not in df.columns:
            return ExpectationResult(False, message="status_code column not found")
        
        error_events = df[df['status_code'] >= 500]
        error_rate = len(error_events) / len(df) if len(df) > 0 else 0
        
        return ExpectationResult(
            success=error_rate < 0.01,
            observed_value=f"{error_rate:.2%}",
            expected_value="<1%",
            message=f"Error rate is {error_rate:.2%}"
        )
    
    @staticmethod
    def test_data_freshness(df: pd.DataFrame) -> ExpectationResult:
        """데이터가 충분히 최신이어야 함 (1시간 이내)"""
        if 'timestamp' not in df.columns:
            return ExpectationResult(False, message="timestamp column not found")
        
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        latest_event = df['timestamp'].max()
        staleness = datetime.now() - latest_event
        
        return ExpectationResult(
            success=staleness < timedelta(hours=1),
            observed_value=f"{staleness.total_seconds()/3600:.1f} hours",
            expected_value="<1 hour",
            message=f"Data is {staleness.total_seconds()/3600:.1f} hours old"
        )


def create_user_event_validator() -> DataQualityValidator:
    """사용자 이벤트 검증기 생성"""
    validator = DataQualityValidator("user_events")
    
    # 완전성 테스트
    validator.add_expectation(DataQualityExpectation(
        name="user_id_not_null",
        dimension=DataQualityDimension.COMPLETENESS,
        check_function=UserEventQualityTests.test_user_id_not_null,
        severity="critical"
    ))
    
    # 유효성 테스트
    validator.add_expectation(DataQualityExpectation(
        name="timestamp_within_range",
        dimension=DataQualityDimension.VALIDITY,
        check_function=UserEventQualityTests.test_timestamp_within_range,
        severity="error"
    ))
    
    validator.add_expectation(DataQualityExpectation(
        name="event_type_valid",
        dimension=DataQualityDimension.VALIDITY,
        check_function=UserEventQualityTests.test_event_type_valid,
        severity="error"
    ))
    
    # 일관성 테스트
    validator.add_expectation(DataQualityExpectation(
        name="session_continuity",
        dimension=DataQualityDimension.CONSISTENCY,
        check_function=UserEventQualityTests.test_session_continuity,
        severity="warning"
    ))
    
    # 정확성 테스트
    validator.add_expectation(DataQualityExpectation(
        name="login_rate_anomaly",
        dimension=DataQualityDimension.ACCURACY,
        check_function=UserEventQualityTests.test_login_rate_anomaly,
        severity="warning"
    ))
    
    return validator


def create_project_event_validator() -> DataQualityValidator:
    """프로젝트 이벤트 검증기 생성"""
    validator = DataQualityValidator("project_events")
    
    validator.add_expectation(DataQualityExpectation(
        name="project_id_format",
        dimension=DataQualityDimension.VALIDITY,
        check_function=ProjectEventQualityTests.test_project_id_format,
        severity="error"
    ))
    
    validator.add_expectation(DataQualityExpectation(
        name="project_phase_transitions",
        dimension=DataQualityDimension.VALIDITY,
        check_function=ProjectEventQualityTests.test_project_phase_transitions,
        severity="error"
    ))
    
    validator.add_expectation(DataQualityExpectation(
        name="member_consistency",
        dimension=DataQualityDimension.CONSISTENCY,
        check_function=ProjectEventQualityTests.test_member_consistency,
        severity="warning"
    ))
    
    return validator


def create_feedback_event_validator() -> DataQualityValidator:
    """피드백 이벤트 검증기 생성"""
    validator = DataQualityValidator("feedback_events")
    
    validator.add_expectation(DataQualityExpectation(
        name="feedback_response_time",
        dimension=DataQualityDimension.TIMELINESS,
        check_function=FeedbackEventQualityTests.test_feedback_response_time,
        severity="warning"
    ))
    
    validator.add_expectation(DataQualityExpectation(
        name="feedback_completeness",
        dimension=DataQualityDimension.COMPLETENESS,
        check_function=FeedbackEventQualityTests.test_feedback_completeness,
        severity="critical"
    ))
    
    return validator


def create_system_metric_validator() -> DataQualityValidator:
    """시스템 메트릭 검증기 생성"""
    validator = DataQualityValidator("system_metrics")
    
    validator.add_expectation(DataQualityExpectation(
        name="api_latency_percentiles",
        dimension=DataQualityDimension.ACCURACY,
        check_function=SystemMetricQualityTests.test_api_latency_percentiles,
        severity="warning"
    ))
    
    validator.add_expectation(DataQualityExpectation(
        name="error_rate",
        dimension=DataQualityDimension.ACCURACY,
        check_function=SystemMetricQualityTests.test_error_rate,
        severity="critical"
    ))
    
    validator.add_expectation(DataQualityExpectation(
        name="data_freshness",
        dimension=DataQualityDimension.TIMELINESS,
        check_function=SystemMetricQualityTests.test_data_freshness,
        severity="error"
    ))
    
    return validator


# === 통합 테스트 러너 ===

class DataQualityTestRunner:
    """데이터 품질 테스트 실행기"""
    
    def __init__(self):
        self.validators = {
            "user_events": create_user_event_validator(),
            "project_events": create_project_event_validator(),
            "feedback_events": create_feedback_event_validator(),
            "system_metrics": create_system_metric_validator()
        }
        
    def run_all_tests(self, datasets: Dict[str, pd.DataFrame]) -> Dict[str, Any]:
        """모든 데이터셋에 대한 테스트 실행"""
        results = {}
        total_passed = 0
        total_failed = 0
        
        for dataset_name, validator in self.validators.items():
            if dataset_name in datasets:
                result = validator.validate(datasets[dataset_name])
                results[dataset_name] = result
                total_passed += result['passed']
                total_failed += result['failed']
            else:
                results[dataset_name] = {
                    "error": f"Dataset {dataset_name} not provided",
                    "passed": 0,
                    "failed": len(validator.expectations)
                }
                total_failed += len(validator.expectations)
        
        return {
            "summary": {
                "total_tests": total_passed + total_failed,
                "passed": total_passed,
                "failed": total_failed,
                "pass_rate": total_passed / (total_passed + total_failed) if (total_passed + total_failed) > 0 else 0,
                "tested_at": datetime.now()
            },
            "details": results
        }
    
    def generate_report(self, test_results: Dict[str, Any]) -> str:
        """테스트 결과 리포트 생성"""
        report = []
        report.append("=" * 80)
        report.append("DATA QUALITY TEST REPORT")
        report.append("=" * 80)
        report.append(f"Generated at: {test_results['summary']['tested_at']}")
        report.append(f"Overall Pass Rate: {test_results['summary']['pass_rate']:.1%}")
        report.append(f"Total Tests: {test_results['summary']['total_tests']}")
        report.append(f"Passed: {test_results['summary']['passed']}")
        report.append(f"Failed: {test_results['summary']['failed']}")
        report.append("")
        
        for dataset_name, results in test_results['details'].items():
            report.append(f"\n{dataset_name.upper()}")
            report.append("-" * 40)
            
            if 'error' in results:
                report.append(f"ERROR: {results['error']}")
                continue
            
            report.append(f"Pass Rate: {results['pass_rate']:.1%}")
            report.append(f"Passed: {results['passed']}/{results['total_expectations']}")
            
            # 실패한 테스트 상세
            failed_tests = [r for r in results['results'] if not r['result'].success]
            if failed_tests:
                report.append("\nFailed Tests:")
                for test in failed_tests:
                    report.append(f"  - {test['expectation']} ({test['severity']})")
                    report.append(f"    {test['result'].message}")
        
        return "\n".join(report)