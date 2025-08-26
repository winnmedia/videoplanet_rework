"""
vridge 데이터 플랫폼 초기화 모듈

이 모듈은 데이터 플랫폼의 모든 구성 요소를 초기화하고
통합 인터페이스를 제공합니다.
"""

from .schemas import registry as schema_registry, initialize_schemas
from .pipelines.etl_pipeline import PipelineOrchestrator
from .metrics.metrics_layer import MetricStore, MetricService
from .features.feature_store import FeatureStore, ModelServer
from .monitoring.monitoring_system import DataPlatformMonitor
from .tests.test_data_quality import DataQualityTestRunner

import logging
from typing import Dict, Any, Optional
from datetime import date, timedelta

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataPlatform:
    """
    vridge 데이터 플랫폼 통합 클래스
    
    모든 데이터 플랫폼 컴포넌트에 대한 단일 진입점을 제공합니다.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        데이터 플랫폼 초기화
        
        Args:
            config: 플랫폼 설정 (선택사항)
        """
        self.config = config or self._get_default_config()
        
        logger.info("Initializing vridge Data Platform...")
        
        # 스키마 초기화
        initialize_schemas()
        self.schema_registry = schema_registry
        logger.info("Schema registry initialized")
        
        # 파이프라인 초기화
        self.pipeline_orchestrator = PipelineOrchestrator()
        logger.info("Pipeline orchestrator initialized")
        
        # 메트릭 초기화
        self.metric_store = MetricStore()
        self.metric_service = MetricService()
        logger.info("Metrics layer initialized")
        
        # 피처 스토어 초기화
        self.feature_store = FeatureStore()
        self.model_server = ModelServer()
        logger.info("Feature store initialized")
        
        # 데이터 품질 테스트 초기화
        self.quality_test_runner = DataQualityTestRunner()
        logger.info("Data quality test runner initialized")
        
        # 모니터링 초기화
        self.monitor = DataPlatformMonitor(self.config.get('notifications', {}))
        logger.info("Monitoring system initialized")
        
        logger.info("vridge Data Platform initialization complete")
    
    def _get_default_config(self) -> Dict[str, Any]:
        """기본 설정 반환"""
        return {
            'notifications': {
                'email': {
                    'from': 'data-platform@vridge.kr',
                    'to': ['admin@vridge.kr']
                },
                'slack': {
                    'webhook_url': 'https://hooks.slack.com/services/xxx'
                }
            },
            'redis': {
                'host': 'localhost',
                'port': 6379
            },
            'monitoring': {
                'interval_seconds': 60,
                'enabled': True
            }
        }
    
    def run_pipeline(self, pipeline_name: str, **kwargs) -> Dict[str, Any]:
        """
        특정 파이프라인 실행
        
        Args:
            pipeline_name: 실행할 파이프라인 이름
            **kwargs: 파이프라인 파라미터
            
        Returns:
            파이프라인 실행 결과
        """
        logger.info(f"Running pipeline: {pipeline_name}")
        return self.pipeline_orchestrator.run_pipeline(pipeline_name, **kwargs)
    
    def run_all_pipelines(self, parallel: bool = True) -> Dict[str, Any]:
        """
        모든 파이프라인 실행
        
        Args:
            parallel: 병렬 실행 여부
            
        Returns:
            모든 파이프라인 실행 결과
        """
        logger.info(f"Running all pipelines (parallel={parallel})")
        return self.pipeline_orchestrator.run_all_pipelines(parallel=parallel)
    
    def get_metric(self, metric_name: str, period: str = 'daily', **filters) -> Dict[str, Any]:
        """
        메트릭 값 조회
        
        Args:
            metric_name: 메트릭 이름
            period: 조회 기간
            **filters: 필터 조건
            
        Returns:
            메트릭 값
        """
        return self.metric_service.get_metric_value(metric_name, period, **filters)
    
    def get_dashboard(self, dashboard_name: str) -> Dict[str, Any]:
        """
        대시보드 데이터 조회
        
        Args:
            dashboard_name: 대시보드 이름
            
        Returns:
            대시보드 데이터
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        return self.metric_store.calculate_dashboard(dashboard_name, start_date, end_date)
    
    def get_features(self, entity_type: str, entity_id: str, 
                    feature_names: Optional[list] = None) -> Dict[str, Any]:
        """
        피처 조회
        
        Args:
            entity_type: 엔티티 타입 (user, project 등)
            entity_id: 엔티티 ID
            feature_names: 조회할 피처 이름 목록
            
        Returns:
            피처 값
        """
        return self.feature_store.serve_online_features(
            entity_type, entity_id, feature_names or []
        )
    
    def predict(self, model_name: str, entity_type: str, entity_id: str) -> Dict[str, Any]:
        """
        ML 모델 예측
        
        Args:
            model_name: 모델 이름
            entity_type: 엔티티 타입
            entity_id: 엔티티 ID
            
        Returns:
            예측 결과
        """
        return self.model_server.predict(model_name, entity_type, entity_id)
    
    def run_quality_tests(self, datasets: Dict[str, Any]) -> Dict[str, Any]:
        """
        데이터 품질 테스트 실행
        
        Args:
            datasets: 테스트할 데이터셋
            
        Returns:
            테스트 결과
        """
        logger.info("Running data quality tests")
        return self.quality_test_runner.run_all_tests(datasets)
    
    def check_health(self) -> Dict[str, Any]:
        """
        플랫폼 상태 확인
        
        Returns:
            플랫폼 상태 정보
        """
        health_status = {
            'platform': 'healthy',
            'components': {}
        }
        
        # 파이프라인 상태
        try:
            slo_status = self.pipeline_orchestrator.monitor_slos()
            health_status['components']['pipelines'] = {
                'status': 'healthy' if all(s['overall'] for s in slo_status.values()) else 'degraded',
                'details': slo_status
            }
        except Exception as e:
            health_status['components']['pipelines'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
        
        # 메트릭 상태
        try:
            metric_slos = self.metric_store.check_slos()
            health_status['components']['metrics'] = {
                'status': 'healthy' if all(m.get('meets_slo') for m in metric_slos.values() if m.get('meets_slo') is not None) else 'degraded',
                'details': metric_slos
            }
        except Exception as e:
            health_status['components']['metrics'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
        
        # 모니터링 상태
        try:
            monitoring_dashboard = self.monitor.get_monitoring_dashboard()
            health_status['components']['monitoring'] = {
                'status': monitoring_dashboard['system_health'],
                'active_alerts': monitoring_dashboard['alert_statistics']['total']
            }
        except Exception as e:
            health_status['components']['monitoring'] = {
                'status': 'unhealthy',
                'error': str(e)
            }
        
        # 전체 상태 결정
        component_statuses = [c.get('status', 'unknown') for c in health_status['components'].values()]
        if any(s == 'unhealthy' for s in component_statuses):
            health_status['platform'] = 'unhealthy'
        elif any(s == 'degraded' for s in component_statuses):
            health_status['platform'] = 'degraded'
        
        return health_status
    
    def start_monitoring(self, interval_seconds: Optional[int] = None):
        """
        백그라운드 모니터링 시작
        
        Args:
            interval_seconds: 모니터링 주기 (초)
        """
        if self.config.get('monitoring', {}).get('enabled', True):
            interval = interval_seconds or self.config.get('monitoring', {}).get('interval_seconds', 60)
            self.monitor.start_monitoring(interval)
            logger.info(f"Monitoring started with {interval}s interval")
        else:
            logger.info("Monitoring is disabled in configuration")
    
    def stop_monitoring(self):
        """백그라운드 모니터링 중지"""
        self.monitor.stop_monitoring()
        logger.info("Monitoring stopped")
    
    def generate_reports(self) -> Dict[str, str]:
        """
        각종 리포트 생성
        
        Returns:
            생성된 리포트 딕셔너리
        """
        reports = {}
        
        # 메트릭 카탈로그
        reports['metrics_catalog'] = self.metric_store.export_metrics_catalog()
        
        # 피처 카탈로그
        reports['feature_catalog'] = self.feature_store.export_feature_catalog()
        
        # 데이터 품질 리포트
        # 샘플 데이터로 테스트 실행
        import pandas as pd
        import numpy as np
        
        sample_data = {
            'user_events': pd.DataFrame({
                'user_id': np.arange(100),
                'event_type': np.random.choice(['user.login', 'user.logout'], 100),
                'timestamp': pd.date_range('2024-01-01', periods=100, freq='H'),
                'session_id': np.random.choice(['session_1', 'session_2', 'session_3'], 100)
            })
        }
        
        test_results = self.quality_test_runner.run_all_tests(sample_data)
        reports['quality_test_report'] = self.quality_test_runner.generate_report(test_results)
        
        logger.info("Reports generated successfully")
        return reports


# 싱글톤 인스턴스 (선택사항)
_platform_instance = None


def get_platform(config: Optional[Dict[str, Any]] = None) -> DataPlatform:
    """
    데이터 플랫폼 싱글톤 인스턴스 반환
    
    Args:
        config: 플랫폼 설정 (첫 호출 시에만 사용)
        
    Returns:
        DataPlatform 인스턴스
    """
    global _platform_instance
    
    if _platform_instance is None:
        _platform_instance = DataPlatform(config)
    
    return _platform_instance


# 편의 함수들
def run_daily_pipeline():
    """일일 파이프라인 실행"""
    platform = get_platform()
    results = platform.run_all_pipelines(parallel=True)
    logger.info(f"Daily pipeline results: {results}")
    return results


def get_executive_dashboard():
    """경영진 대시보드 데이터 반환"""
    platform = get_platform()
    return platform.get_dashboard('executive')


def check_platform_health():
    """플랫폼 상태 확인"""
    platform = get_platform()
    return platform.check_health()


# 초기화 시 실행
if __name__ == "__main__":
    # 플랫폼 초기화
    platform = DataPlatform()
    
    # 상태 확인
    health = platform.check_health()
    print(f"Platform Health: {health}")
    
    # 리포트 생성
    reports = platform.generate_reports()
    print("\n=== METRICS CATALOG ===")
    print(reports['metrics_catalog'])
    print("\n=== FEATURE CATALOG ===")
    print(reports['feature_catalog'])
    print("\n=== DATA QUALITY REPORT ===")
    print(reports['quality_test_report'])
    
    # 모니터링 시작 (선택사항)
    # platform.start_monitoring(interval_seconds=60)