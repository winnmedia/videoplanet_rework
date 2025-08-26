"""
데이터 플랫폼 모니터링 시스템
파이프라인, 데이터 품질, SLO 모니터링 및 알림

설계 원칙:
1. 프로액티브 모니터링 (문제 발생 전 감지)
2. 알림 정밀도 최적화 (노이즈 최소화)
3. 자동 복구 메커니즘
4. 근본 원인 분석 지원
"""

from typing import Dict, Any, List, Optional, Callable, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
import logging
from abc import ABC, abstractmethod
import redis
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import requests
import pandas as pd
import numpy as np
from collections import deque
import threading
import time

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """알림 심각도"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class MonitoringMetricType(Enum):
    """모니터링 메트릭 타입"""
    PIPELINE_STATUS = "pipeline_status"
    DATA_QUALITY = "data_quality"
    SLO_COMPLIANCE = "slo_compliance"
    SYSTEM_HEALTH = "system_health"
    FEATURE_DRIFT = "feature_drift"
    ANOMALY = "anomaly"


class AlertChannel(Enum):
    """알림 채널"""
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    LOG = "log"


@dataclass
class Alert:
    """알림 정의"""
    id: str
    title: str
    message: str
    severity: AlertSeverity
    metric_type: MonitoringMetricType
    source: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolution_message: Optional[str] = None


@dataclass
class MonitoringRule:
    """모니터링 규칙"""
    name: str
    description: str
    metric_type: MonitoringMetricType
    condition: Callable[[Any], bool]
    severity: AlertSeverity
    cooldown_minutes: int = 60  # 재알림 방지
    auto_resolve: bool = False
    resolution_condition: Optional[Callable[[Any], bool]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class AnomalyDetector:
    """이상 감지기"""
    
    def __init__(self, window_size: int = 100, z_threshold: float = 3.0):
        self.window_size = window_size
        self.z_threshold = z_threshold
        self.data_windows = {}
    
    def add_data_point(self, metric_name: str, value: float):
        """데이터 포인트 추가"""
        if metric_name not in self.data_windows:
            self.data_windows[metric_name] = deque(maxlen=self.window_size)
        
        self.data_windows[metric_name].append(value)
    
    def detect_anomaly(self, metric_name: str, current_value: float) -> Tuple[bool, Dict[str, Any]]:
        """이상 감지"""
        if metric_name not in self.data_windows:
            return False, {"message": "Insufficient data"}
        
        window = list(self.data_windows[metric_name])
        
        if len(window) < 10:  # 최소 데이터 요구
            return False, {"message": "Insufficient data"}
        
        # Z-score 계산
        mean = np.mean(window)
        std = np.std(window)
        
        if std == 0:
            z_score = 0
        else:
            z_score = abs((current_value - mean) / std)
        
        is_anomaly = z_score > self.z_threshold
        
        # IQR 방법도 함께 사용
        q1 = np.percentile(window, 25)
        q3 = np.percentile(window, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        is_outlier = current_value < lower_bound or current_value > upper_bound
        
        return is_anomaly or is_outlier, {
            "z_score": z_score,
            "mean": mean,
            "std": std,
            "current_value": current_value,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "is_z_anomaly": is_anomaly,
            "is_iqr_outlier": is_outlier
        }


class AlertManager:
    """알림 관리자"""
    
    def __init__(self):
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
        self.alert_history = []
        self.cooldowns = {}  # 규칙별 쿨다운 추적
    
    def create_alert(self, rule: MonitoringRule, message: str, metadata: Dict[str, Any]) -> Alert:
        """알림 생성"""
        alert_id = f"{rule.name}_{datetime.now().timestamp()}"
        
        alert = Alert(
            id=alert_id,
            title=f"[{rule.severity.value.upper()}] {rule.name}",
            message=message,
            severity=rule.severity,
            metric_type=rule.metric_type,
            source=rule.name,
            timestamp=datetime.now(),
            metadata=metadata
        )
        
        # Redis에 저장
        self._save_alert(alert)
        
        # 히스토리 추가
        self.alert_history.append(alert)
        
        return alert
    
    def should_alert(self, rule: MonitoringRule) -> bool:
        """알림 발송 여부 결정 (쿨다운 체크)"""
        if rule.name not in self.cooldowns:
            return True
        
        last_alert_time = self.cooldowns[rule.name]
        cooldown_expired = (datetime.now() - last_alert_time).total_seconds() / 60 > rule.cooldown_minutes
        
        return cooldown_expired
    
    def update_cooldown(self, rule: MonitoringRule):
        """쿨다운 업데이트"""
        self.cooldowns[rule.name] = datetime.now()
    
    def resolve_alert(self, alert_id: str, resolution_message: str):
        """알림 해결"""
        alert_key = f"alert:{alert_id}"
        alert_data = self.redis_client.get(alert_key)
        
        if alert_data:
            alert_dict = json.loads(alert_data)
            alert_dict['resolved'] = True
            alert_dict['resolved_at'] = datetime.now().isoformat()
            alert_dict['resolution_message'] = resolution_message
            
            self.redis_client.set(alert_key, json.dumps(alert_dict))
    
    def get_active_alerts(self) -> List[Alert]:
        """활성 알림 조회"""
        pattern = "alert:*"
        active_alerts = []
        
        for key in self.redis_client.scan_iter(match=pattern):
            alert_data = self.redis_client.get(key)
            if alert_data:
                alert_dict = json.loads(alert_data)
                if not alert_dict.get('resolved', False):
                    active_alerts.append(self._dict_to_alert(alert_dict))
        
        return active_alerts
    
    def _save_alert(self, alert: Alert):
        """알림 저장"""
        alert_key = f"alert:{alert.id}"
        alert_dict = {
            'id': alert.id,
            'title': alert.title,
            'message': alert.message,
            'severity': alert.severity.value,
            'metric_type': alert.metric_type.value,
            'source': alert.source,
            'timestamp': alert.timestamp.isoformat(),
            'metadata': alert.metadata,
            'resolved': alert.resolved
        }
        
        self.redis_client.set(alert_key, json.dumps(alert_dict))
        self.redis_client.expire(alert_key, 86400 * 7)  # 7일 후 만료
    
    def _dict_to_alert(self, alert_dict: Dict[str, Any]) -> Alert:
        """딕셔너리를 Alert 객체로 변환"""
        return Alert(
            id=alert_dict['id'],
            title=alert_dict['title'],
            message=alert_dict['message'],
            severity=AlertSeverity(alert_dict['severity']),
            metric_type=MonitoringMetricType(alert_dict['metric_type']),
            source=alert_dict['source'],
            timestamp=datetime.fromisoformat(alert_dict['timestamp']),
            metadata=alert_dict.get('metadata', {}),
            resolved=alert_dict.get('resolved', False),
            resolved_at=datetime.fromisoformat(alert_dict['resolved_at']) if alert_dict.get('resolved_at') else None,
            resolution_message=alert_dict.get('resolution_message')
        )


class NotificationService:
    """알림 전송 서비스"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
    
    def send_alert(self, alert: Alert, channels: List[AlertChannel]):
        """알림 전송"""
        for channel in channels:
            try:
                if channel == AlertChannel.EMAIL:
                    self._send_email(alert)
                elif channel == AlertChannel.SLACK:
                    self._send_slack(alert)
                elif channel == AlertChannel.WEBHOOK:
                    self._send_webhook(alert)
                elif channel == AlertChannel.LOG:
                    self._log_alert(alert)
            except Exception as e:
                logger.error(f"Failed to send alert via {channel.value}: {str(e)}")
    
    def _send_email(self, alert: Alert):
        """이메일 알림"""
        if 'email' not in self.config:
            return
        
        email_config = self.config['email']
        
        msg = MIMEMultipart()
        msg['From'] = email_config['from']
        msg['To'] = ', '.join(email_config['to'])
        msg['Subject'] = alert.title
        
        body = f"""
        Alert Details:
        ---------------
        Message: {alert.message}
        Severity: {alert.severity.value}
        Source: {alert.source}
        Timestamp: {alert.timestamp}
        
        Metadata:
        {json.dumps(alert.metadata, indent=2)}
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        # SMTP 서버 연결 및 전송 (시뮬레이션)
        logger.info(f"Email alert sent: {alert.title}")
    
    def _send_slack(self, alert: Alert):
        """Slack 알림"""
        if 'slack' not in self.config:
            return
        
        slack_config = self.config['slack']
        webhook_url = slack_config['webhook_url']
        
        # 심각도별 색상
        color_map = {
            AlertSeverity.INFO: "#36a64f",
            AlertSeverity.WARNING: "#ff9900",
            AlertSeverity.ERROR: "#ff0000",
            AlertSeverity.CRITICAL: "#990000"
        }
        
        payload = {
            "attachments": [
                {
                    "color": color_map[alert.severity],
                    "title": alert.title,
                    "text": alert.message,
                    "fields": [
                        {"title": "Source", "value": alert.source, "short": True},
                        {"title": "Severity", "value": alert.severity.value, "short": True},
                        {"title": "Timestamp", "value": str(alert.timestamp), "short": False}
                    ],
                    "footer": "Data Platform Monitoring",
                    "ts": int(alert.timestamp.timestamp())
                }
            ]
        }
        
        # Webhook 전송 (시뮬레이션)
        logger.info(f"Slack alert sent: {alert.title}")
    
    def _send_webhook(self, alert: Alert):
        """웹훅 알림"""
        if 'webhook' not in self.config:
            return
        
        webhook_config = self.config['webhook']
        url = webhook_config['url']
        
        payload = {
            "alert_id": alert.id,
            "title": alert.title,
            "message": alert.message,
            "severity": alert.severity.value,
            "source": alert.source,
            "timestamp": alert.timestamp.isoformat(),
            "metadata": alert.metadata
        }
        
        # HTTP POST 요청 (시뮬레이션)
        logger.info(f"Webhook alert sent: {alert.title}")
    
    def _log_alert(self, alert: Alert):
        """로그 알림"""
        log_level = {
            AlertSeverity.INFO: logging.INFO,
            AlertSeverity.WARNING: logging.WARNING,
            AlertSeverity.ERROR: logging.ERROR,
            AlertSeverity.CRITICAL: logging.CRITICAL
        }
        
        logger.log(
            log_level[alert.severity],
            f"ALERT: {alert.title} - {alert.message} (Source: {alert.source})"
        )


class DataPlatformMonitor:
    """데이터 플랫폼 통합 모니터링"""
    
    def __init__(self, notification_config: Dict[str, Any]):
        self.alert_manager = AlertManager()
        self.notification_service = NotificationService(notification_config)
        self.anomaly_detector = AnomalyDetector()
        self.rules = []
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
        self._setup_default_rules()
        self.monitoring_thread = None
        self.stop_monitoring = False
    
    def _setup_default_rules(self):
        """기본 모니터링 규칙 설정"""
        
        # 파이프라인 실패율 규칙
        self.add_rule(MonitoringRule(
            name="pipeline_failure_rate",
            description="파이프라인 실패율이 임계값 초과",
            metric_type=MonitoringMetricType.PIPELINE_STATUS,
            condition=lambda metrics: metrics.get('failure_rate', 0) > 0.1,
            severity=AlertSeverity.ERROR,
            cooldown_minutes=30,
            auto_resolve=True,
            resolution_condition=lambda metrics: metrics.get('failure_rate', 0) <= 0.05
        ))
        
        # 데이터 품질 규칙
        self.add_rule(MonitoringRule(
            name="data_quality_degradation",
            description="데이터 품질 점수가 임계값 미달",
            metric_type=MonitoringMetricType.DATA_QUALITY,
            condition=lambda metrics: metrics.get('quality_score', 100) < 90,
            severity=AlertSeverity.WARNING,
            cooldown_minutes=60
        ))
        
        # SLO 위반 규칙
        self.add_rule(MonitoringRule(
            name="slo_violation",
            description="SLO 목표 미달성",
            metric_type=MonitoringMetricType.SLO_COMPLIANCE,
            condition=lambda metrics: metrics.get('slo_compliance', 100) < 99,
            severity=AlertSeverity.CRITICAL,
            cooldown_minutes=15
        ))
        
        # 시스템 리소스 규칙
        self.add_rule(MonitoringRule(
            name="high_memory_usage",
            description="메모리 사용률 과다",
            metric_type=MonitoringMetricType.SYSTEM_HEALTH,
            condition=lambda metrics: metrics.get('memory_usage_percent', 0) > 85,
            severity=AlertSeverity.WARNING,
            cooldown_minutes=30,
            auto_resolve=True,
            resolution_condition=lambda metrics: metrics.get('memory_usage_percent', 0) < 70
        ))
        
        # 피처 드리프트 규칙
        self.add_rule(MonitoringRule(
            name="feature_drift_detected",
            description="피처 분포 변화 감지",
            metric_type=MonitoringMetricType.FEATURE_DRIFT,
            condition=lambda metrics: metrics.get('drift_detected', False),
            severity=AlertSeverity.WARNING,
            cooldown_minutes=120
        ))
    
    def add_rule(self, rule: MonitoringRule):
        """모니터링 규칙 추가"""
        self.rules.append(rule)
    
    def collect_metrics(self) -> Dict[str, Any]:
        """메트릭 수집"""
        metrics = {}
        
        # 파이프라인 메트릭
        pipeline_metrics = self._collect_pipeline_metrics()
        metrics.update(pipeline_metrics)
        
        # 데이터 품질 메트릭
        quality_metrics = self._collect_quality_metrics()
        metrics.update(quality_metrics)
        
        # SLO 메트릭
        slo_metrics = self._collect_slo_metrics()
        metrics.update(slo_metrics)
        
        # 시스템 메트릭
        system_metrics = self._collect_system_metrics()
        metrics.update(system_metrics)
        
        # 피처 드리프트 메트릭
        drift_metrics = self._collect_drift_metrics()
        metrics.update(drift_metrics)
        
        return metrics
    
    def _collect_pipeline_metrics(self) -> Dict[str, Any]:
        """파이프라인 메트릭 수집"""
        # 최근 파이프라인 실행 이력 조회
        pipeline_names = ['user_event_pipeline', 'project_analytics_pipeline']
        total_runs = 0
        failed_runs = 0
        
        for pipeline in pipeline_names:
            history_key = f"pipeline:history:{pipeline}"
            recent_runs = self.redis_client.lrange(history_key, 0, 9)
            
            for run in recent_runs:
                run_data = json.loads(run)
                total_runs += 1
                if run_data.get('status') == 'failed':
                    failed_runs += 1
        
        failure_rate = failed_runs / total_runs if total_runs > 0 else 0
        
        return {
            'pipeline_total_runs': total_runs,
            'pipeline_failed_runs': failed_runs,
            'failure_rate': failure_rate
        }
    
    def _collect_quality_metrics(self) -> Dict[str, Any]:
        """데이터 품질 메트릭 수집"""
        # 시뮬레이션 데이터
        quality_scores = np.random.beta(9, 1, size=10) * 100  # 대부분 높은 점수
        
        return {
            'quality_score': np.mean(quality_scores),
            'quality_min': np.min(quality_scores),
            'quality_max': np.max(quality_scores)
        }
    
    def _collect_slo_metrics(self) -> Dict[str, Any]:
        """SLO 메트릭 수집"""
        # 시뮬레이션 데이터
        slo_targets = {
            'latency_p99': {'target': 1000, 'actual': np.random.gamma(2, 400)},
            'availability': {'target': 99.9, 'actual': np.random.uniform(99.5, 100)},
            'error_rate': {'target': 1, 'actual': np.random.uniform(0, 2)}
        }
        
        violations = sum(1 for slo in slo_targets.values() 
                        if slo['actual'] > slo['target'] if 'rate' in slo 
                        else slo['actual'] < slo['target'])
        
        slo_compliance = (len(slo_targets) - violations) / len(slo_targets) * 100
        
        return {
            'slo_compliance': slo_compliance,
            'slo_violations': violations,
            'slo_details': slo_targets
        }
    
    def _collect_system_metrics(self) -> Dict[str, Any]:
        """시스템 메트릭 수집"""
        # 시뮬레이션 데이터
        import psutil
        
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                'cpu_usage_percent': cpu_percent,
                'memory_usage_percent': memory.percent,
                'disk_usage_percent': disk.percent,
                'memory_available_gb': memory.available / (1024**3)
            }
        except:
            # 폴백 시뮬레이션 데이터
            return {
                'cpu_usage_percent': np.random.uniform(20, 80),
                'memory_usage_percent': np.random.uniform(40, 90),
                'disk_usage_percent': np.random.uniform(30, 70),
                'memory_available_gb': np.random.uniform(4, 16)
            }
    
    def _collect_drift_metrics(self) -> Dict[str, Any]:
        """피처 드리프트 메트릭 수집"""
        # 시뮬레이션 데이터
        drift_detected = np.random.random() < 0.1  # 10% 확률로 드리프트 감지
        
        return {
            'drift_detected': drift_detected,
            'drift_score': np.random.beta(2, 5) if drift_detected else 0,
            'affected_features': ['user_activity_score'] if drift_detected else []
        }
    
    def evaluate_rules(self, metrics: Dict[str, Any]) -> List[Alert]:
        """규칙 평가 및 알림 생성"""
        alerts = []
        
        for rule in self.rules:
            try:
                # 규칙 조건 평가
                if rule.condition(metrics):
                    # 쿨다운 체크
                    if self.alert_manager.should_alert(rule):
                        # 알림 생성
                        alert = self.alert_manager.create_alert(
                            rule,
                            f"{rule.description}. Current metrics: {self._format_relevant_metrics(rule, metrics)}",
                            {"metrics": self._get_relevant_metrics(rule, metrics)}
                        )
                        alerts.append(alert)
                        
                        # 쿨다운 업데이트
                        self.alert_manager.update_cooldown(rule)
                
                # 자동 해결 체크
                elif rule.auto_resolve and rule.resolution_condition:
                    if rule.resolution_condition(metrics):
                        # 활성 알림 해결
                        active_alerts = self.alert_manager.get_active_alerts()
                        for active_alert in active_alerts:
                            if active_alert.source == rule.name:
                                self.alert_manager.resolve_alert(
                                    active_alert.id,
                                    f"Automatically resolved. Metrics back to normal: {self._format_relevant_metrics(rule, metrics)}"
                                )
                
            except Exception as e:
                logger.error(f"Error evaluating rule {rule.name}: {str(e)}")
        
        return alerts
    
    def _get_relevant_metrics(self, rule: MonitoringRule, metrics: Dict[str, Any]) -> Dict[str, Any]:
        """규칙과 관련된 메트릭만 추출"""
        relevant = {}
        
        if rule.metric_type == MonitoringMetricType.PIPELINE_STATUS:
            relevant = {k: v for k, v in metrics.items() if 'pipeline' in k or 'failure' in k}
        elif rule.metric_type == MonitoringMetricType.DATA_QUALITY:
            relevant = {k: v for k, v in metrics.items() if 'quality' in k}
        elif rule.metric_type == MonitoringMetricType.SLO_COMPLIANCE:
            relevant = {k: v for k, v in metrics.items() if 'slo' in k}
        elif rule.metric_type == MonitoringMetricType.SYSTEM_HEALTH:
            relevant = {k: v for k, v in metrics.items() if 'cpu' in k or 'memory' in k or 'disk' in k}
        elif rule.metric_type == MonitoringMetricType.FEATURE_DRIFT:
            relevant = {k: v for k, v in metrics.items() if 'drift' in k}
        
        return relevant
    
    def _format_relevant_metrics(self, rule: MonitoringRule, metrics: Dict[str, Any]) -> str:
        """관련 메트릭 포맷팅"""
        relevant = self._get_relevant_metrics(rule, metrics)
        formatted = []
        
        for key, value in relevant.items():
            if isinstance(value, float):
                formatted.append(f"{key}={value:.2f}")
            else:
                formatted.append(f"{key}={value}")
        
        return ", ".join(formatted)
    
    def run_monitoring_cycle(self):
        """모니터링 사이클 실행"""
        # 메트릭 수집
        metrics = self.collect_metrics()
        
        # 이상 감지
        for key, value in metrics.items():
            if isinstance(value, (int, float)):
                self.anomaly_detector.add_data_point(key, value)
                is_anomaly, anomaly_info = self.anomaly_detector.detect_anomaly(key, value)
                
                if is_anomaly:
                    metrics[f"{key}_anomaly"] = True
                    metrics[f"{key}_anomaly_info"] = anomaly_info
        
        # 규칙 평가
        alerts = self.evaluate_rules(metrics)
        
        # 알림 전송
        for alert in alerts:
            channels = self._determine_alert_channels(alert)
            self.notification_service.send_alert(alert, channels)
        
        # 메트릭 저장
        self._save_metrics(metrics)
        
        return {
            'metrics': metrics,
            'alerts_generated': len(alerts),
            'active_alerts': len(self.alert_manager.get_active_alerts()),
            'timestamp': datetime.now().isoformat()
        }
    
    def _determine_alert_channels(self, alert: Alert) -> List[AlertChannel]:
        """알림 채널 결정"""
        channels = [AlertChannel.LOG]
        
        if alert.severity == AlertSeverity.CRITICAL:
            channels.extend([AlertChannel.EMAIL, AlertChannel.SLACK])
        elif alert.severity == AlertSeverity.ERROR:
            channels.append(AlertChannel.SLACK)
        elif alert.severity == AlertSeverity.WARNING:
            channels.append(AlertChannel.WEBHOOK)
        
        return channels
    
    def _save_metrics(self, metrics: Dict[str, Any]):
        """메트릭 저장"""
        timestamp = datetime.now()
        
        # 시계열 데이터로 저장
        for key, value in metrics.items():
            if isinstance(value, (int, float)):
                ts_key = f"metrics:timeseries:{key}:{timestamp.strftime('%Y%m%d')}"
                self.redis_client.zadd(ts_key, {
                    json.dumps({'value': value, 'timestamp': timestamp.isoformat()}): timestamp.timestamp()
                })
                self.redis_client.expire(ts_key, 86400 * 30)  # 30일 보관
    
    def start_monitoring(self, interval_seconds: int = 60):
        """모니터링 시작"""
        def monitoring_loop():
            while not self.stop_monitoring:
                try:
                    result = self.run_monitoring_cycle()
                    logger.info(f"Monitoring cycle completed: {result}")
                except Exception as e:
                    logger.error(f"Monitoring cycle error: {str(e)}")
                
                time.sleep(interval_seconds)
        
        self.stop_monitoring = False
        self.monitoring_thread = threading.Thread(target=monitoring_loop)
        self.monitoring_thread.daemon = True
        self.monitoring_thread.start()
        logger.info("Monitoring started")
    
    def stop_monitoring(self):
        """모니터링 중지"""
        self.stop_monitoring = True
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logger.info("Monitoring stopped")
    
    def get_monitoring_dashboard(self) -> Dict[str, Any]:
        """모니터링 대시보드 데이터"""
        metrics = self.collect_metrics()
        active_alerts = self.alert_manager.get_active_alerts()
        
        # 알림 통계
        alert_stats = {
            'total': len(active_alerts),
            'critical': len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
            'error': len([a for a in active_alerts if a.severity == AlertSeverity.ERROR]),
            'warning': len([a for a in active_alerts if a.severity == AlertSeverity.WARNING]),
            'info': len([a for a in active_alerts if a.severity == AlertSeverity.INFO])
        }
        
        # 시스템 상태 요약
        system_health = "healthy"
        if alert_stats['critical'] > 0:
            system_health = "critical"
        elif alert_stats['error'] > 0:
            system_health = "degraded"
        elif alert_stats['warning'] > 0:
            system_health = "warning"
        
        return {
            'system_health': system_health,
            'metrics_summary': {
                'pipeline_failure_rate': metrics.get('failure_rate', 0),
                'data_quality_score': metrics.get('quality_score', 100),
                'slo_compliance': metrics.get('slo_compliance', 100),
                'cpu_usage': metrics.get('cpu_usage_percent', 0),
                'memory_usage': metrics.get('memory_usage_percent', 0)
            },
            'alert_statistics': alert_stats,
            'active_alerts': [
                {
                    'id': a.id,
                    'title': a.title,
                    'severity': a.severity.value,
                    'timestamp': a.timestamp.isoformat()
                }
                for a in active_alerts[:10]  # 최근 10개
            ],
            'last_updated': datetime.now().isoformat()
        }


# 사용 예시
if __name__ == "__main__":
    # 알림 설정
    notification_config = {
        'email': {
            'from': 'monitoring@vridge.kr',
            'to': ['admin@vridge.kr'],
            'smtp_server': 'smtp.gmail.com',
            'smtp_port': 587
        },
        'slack': {
            'webhook_url': 'https://hooks.slack.com/services/xxx'
        },
        'webhook': {
            'url': 'https://api.vridge.kr/monitoring/webhook'
        }
    }
    
    # 모니터링 시작
    monitor = DataPlatformMonitor(notification_config)
    
    # 수동 모니터링 사이클 실행
    result = monitor.run_monitoring_cycle()
    print(f"Monitoring Result: {result}")
    
    # 대시보드 데이터 조회
    dashboard = monitor.get_monitoring_dashboard()
    print(f"\nDashboard Data:")
    print(json.dumps(dashboard, indent=2))
    
    # 백그라운드 모니터링 시작 (실제 운영 시)
    # monitor.start_monitoring(interval_seconds=60)
    # time.sleep(300)  # 5분 실행
    # monitor.stop_monitoring()