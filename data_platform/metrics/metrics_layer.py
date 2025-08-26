"""
메트릭 레이어 구현
일관되고 신뢰할 수 있는 비즈니스 메트릭 계산 및 제공

설계 원칙:
1. 단일 진실의 원천 (Single Source of Truth)
2. 메트릭 버전 관리
3. 캐싱 및 사전 계산
4. 비즈니스 로직 중앙화
"""

from typing import Dict, Any, List, Optional, Union, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from enum import Enum
import json
import pandas as pd
import numpy as np
from abc import ABC, abstractmethod
import redis
from django.db import connection
from django.conf import settings
import hashlib


class MetricType(Enum):
    """메트릭 타입"""
    COUNTER = "counter"  # 카운트 (예: 사용자 수)
    GAUGE = "gauge"  # 현재 값 (예: 활성 세션 수)
    RATIO = "ratio"  # 비율 (예: 전환율)
    DISTRIBUTION = "distribution"  # 분포 (예: 응답 시간 분포)
    COMPOSITE = "composite"  # 복합 메트릭


class AggregationPeriod(Enum):
    """집계 기간"""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class MetricGranularity(Enum):
    """메트릭 세분화 수준"""
    GLOBAL = "global"  # 전체
    USER = "user"  # 사용자별
    PROJECT = "project"  # 프로젝트별
    TEAM = "team"  # 팀별
    SEGMENT = "segment"  # 세그먼트별


@dataclass
class MetricDefinition:
    """메트릭 정의"""
    name: str
    display_name: str
    description: str
    type: MetricType
    formula: str  # SQL 또는 계산 공식
    dimensions: List[str]  # 차원 (group by 필드)
    filters: Dict[str, Any] = field(default_factory=dict)
    version: str = "v1.0.0"
    owner: str = "data_team"
    slo_threshold: Optional[float] = None
    cache_ttl: int = 3600  # seconds
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MetricValue:
    """메트릭 값"""
    metric_name: str
    value: Union[float, int, Dict[str, Any]]
    timestamp: datetime
    dimensions: Dict[str, Any] = field(default_factory=dict)
    confidence_interval: Optional[tuple] = None
    sample_size: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class BaseMetric(ABC):
    """기본 메트릭 추상 클래스"""
    
    def __init__(self, definition: MetricDefinition):
        self.definition = definition
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST if hasattr(settings, 'REDIS_HOST') else 'localhost',
            port=settings.REDIS_PORT if hasattr(settings, 'REDIS_PORT') else 6379,
            decode_responses=True
        )
    
    @abstractmethod
    def calculate(self, start_date: date, end_date: date, **kwargs) -> MetricValue:
        """메트릭 계산"""
        pass
    
    def get_cached_value(self, cache_key: str) -> Optional[MetricValue]:
        """캐시된 값 조회"""
        cached = self.redis_client.get(cache_key)
        if cached:
            data = json.loads(cached)
            return MetricValue(
                metric_name=data['metric_name'],
                value=data['value'],
                timestamp=datetime.fromisoformat(data['timestamp']),
                dimensions=data.get('dimensions', {}),
                confidence_interval=tuple(data['confidence_interval']) if data.get('confidence_interval') else None,
                sample_size=data.get('sample_size'),
                metadata=data.get('metadata', {})
            )
        return None
    
    def cache_value(self, cache_key: str, value: MetricValue):
        """값 캐싱"""
        data = {
            'metric_name': value.metric_name,
            'value': value.value,
            'timestamp': value.timestamp.isoformat(),
            'dimensions': value.dimensions,
            'confidence_interval': list(value.confidence_interval) if value.confidence_interval else None,
            'sample_size': value.sample_size,
            'metadata': value.metadata
        }
        self.redis_client.setex(cache_key, self.definition.cache_ttl, json.dumps(data))
    
    def generate_cache_key(self, start_date: date, end_date: date, **kwargs) -> str:
        """캐시 키 생성"""
        key_parts = [
            self.definition.name,
            self.definition.version,
            str(start_date),
            str(end_date)
        ]
        
        # 차원 추가
        for dim in sorted(kwargs.keys()):
            key_parts.append(f"{dim}:{kwargs[dim]}")
        
        key_string = ":".join(key_parts)
        return f"metric:{hashlib.md5(key_string.encode()).hexdigest()}"


# === 핵심 비즈니스 메트릭 구현 ===

class ActiveUsersMetric(BaseMetric):
    """활성 사용자 메트릭"""
    
    def __init__(self):
        super().__init__(MetricDefinition(
            name="active_users",
            display_name="활성 사용자",
            description="지정 기간 동안 활동한 고유 사용자 수",
            type=MetricType.COUNTER,
            formula="COUNT(DISTINCT user_id)",
            dimensions=["period", "segment"],
            slo_threshold=100,  # 최소 100명
            cache_ttl=3600
        ))
    
    def calculate(self, start_date: date, end_date: date, **kwargs) -> MetricValue:
        """활성 사용자 계산"""
        # 캐시 확인
        cache_key = self.generate_cache_key(start_date, end_date, **kwargs)
        cached = self.get_cached_value(cache_key)
        if cached:
            return cached
        
        # 실제 계산
        segment = kwargs.get('segment', 'all')
        
        query = """
            SELECT 
                COUNT(DISTINCT u.id) as active_users,
                COUNT(DISTINCT DATE(u.last_login)) as active_days
            FROM users_user u
            WHERE u.last_login BETWEEN %s AND %s
        """
        
        params = [start_date, end_date]
        
        if segment != 'all':
            # 세그먼트별 필터링 추가
            query += " AND u.login_method = %s"
            params.append(segment)
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            result = cursor.fetchone()
        
        value = MetricValue(
            metric_name=self.definition.name,
            value=result[0] if result else 0,
            timestamp=datetime.now(),
            dimensions={
                'start_date': str(start_date),
                'end_date': str(end_date),
                'segment': segment,
                'active_days': result[1] if result else 0
            }
        )
        
        # 캐시 저장
        self.cache_value(cache_key, value)
        
        return value


class ProjectSuccessRateMetric(BaseMetric):
    """프로젝트 성공률 메트릭"""
    
    def __init__(self):
        super().__init__(MetricDefinition(
            name="project_success_rate",
            display_name="프로젝트 성공률",
            description="정시 완료된 프로젝트 비율",
            type=MetricType.RATIO,
            formula="COUNT(on_time_projects) / COUNT(all_projects)",
            dimensions=["period", "team"],
            slo_threshold=0.8,  # 80% 이상
            cache_ttl=7200
        ))
    
    def calculate(self, start_date: date, end_date: date, **kwargs) -> MetricValue:
        """프로젝트 성공률 계산"""
        cache_key = self.generate_cache_key(start_date, end_date, **kwargs)
        cached = self.get_cached_value(cache_key)
        if cached:
            return cached
        
        query = """
            SELECT 
                COUNT(*) as total_projects,
                SUM(CASE 
                    WHEN vd.end_date <= vd.start_date + INTERVAL '30 days' 
                    THEN 1 ELSE 0 
                END) as on_time_projects,
                AVG(EXTRACT(DAY FROM (vd.end_date - bp.start_date))) as avg_duration_days
            FROM projects_project p
            LEFT JOIN projects_basicplan bp ON p.basic_plan_id = bp.id
            LEFT JOIN projects_videodelivery vd ON p.video_delivery_id = vd.id
            WHERE p.created BETWEEN %s AND %s
            AND vd.end_date IS NOT NULL
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, [start_date, end_date])
            result = cursor.fetchone()
        
        total = result[0] if result and result[0] else 0
        on_time = result[1] if result and result[1] else 0
        success_rate = (on_time / total) if total > 0 else 0
        
        value = MetricValue(
            metric_name=self.definition.name,
            value=success_rate,
            timestamp=datetime.now(),
            dimensions={
                'start_date': str(start_date),
                'end_date': str(end_date),
                'total_projects': total,
                'on_time_projects': on_time,
                'avg_duration_days': float(result[2]) if result and result[2] else 0
            },
            confidence_interval=(success_rate - 0.05, success_rate + 0.05) if total > 30 else None,
            sample_size=total
        )
        
        self.cache_value(cache_key, value)
        return value


class FeedbackResponseTimeMetric(BaseMetric):
    """피드백 응답 시간 메트릭"""
    
    def __init__(self):
        super().__init__(MetricDefinition(
            name="feedback_response_time",
            display_name="피드백 평균 응답 시간",
            description="피드백 생성 후 첫 응답까지의 평균 시간",
            type=MetricType.DISTRIBUTION,
            formula="AVG(first_response_time)",
            dimensions=["period", "priority"],
            slo_threshold=24,  # 24시간 이내
            cache_ttl=3600
        ))
    
    def calculate(self, start_date: date, end_date: date, **kwargs) -> MetricValue:
        """피드백 응답 시간 계산"""
        cache_key = self.generate_cache_key(start_date, end_date, **kwargs)
        cached = self.get_cached_value(cache_key)
        if cached:
            return cached
        
        query = """
            WITH feedback_responses AS (
                SELECT 
                    f.id as feedback_id,
                    f.created as feedback_created,
                    MIN(fc.created) as first_response,
                    EXTRACT(EPOCH FROM (MIN(fc.created) - f.created)) / 3600 as response_hours
                FROM feedbacks_feedback f
                LEFT JOIN feedbacks_feedbackcomment fc ON f.id = fc.feedback_id
                WHERE f.created BETWEEN %s AND %s
                GROUP BY f.id
            )
            SELECT 
                AVG(response_hours) as avg_hours,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_hours) as median_hours,
                PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_hours) as p95_hours,
                COUNT(*) as total_feedbacks
            FROM feedback_responses
            WHERE first_response IS NOT NULL
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, [start_date, end_date])
            result = cursor.fetchone()
        
        distribution = {
            'mean': float(result[0]) if result and result[0] else 0,
            'median': float(result[1]) if result and result[1] else 0,
            'p95': float(result[2]) if result and result[2] else 0,
            'count': result[3] if result and result[3] else 0
        }
        
        value = MetricValue(
            metric_name=self.definition.name,
            value=distribution,
            timestamp=datetime.now(),
            dimensions={
                'start_date': str(start_date),
                'end_date': str(end_date)
            },
            sample_size=distribution['count']
        )
        
        self.cache_value(cache_key, value)
        return value


class UserEngagementScoreMetric(BaseMetric):
    """사용자 참여도 점수 (복합 메트릭)"""
    
    def __init__(self):
        super().__init__(MetricDefinition(
            name="user_engagement_score",
            display_name="사용자 참여도 점수",
            description="다양한 활동을 종합한 사용자 참여도 점수",
            type=MetricType.COMPOSITE,
            formula="weighted_sum(activities)",
            dimensions=["user_id", "period"],
            cache_ttl=3600
        ))
    
    def calculate(self, start_date: date, end_date: date, **kwargs) -> MetricValue:
        """사용자 참여도 점수 계산"""
        user_id = kwargs.get('user_id')
        
        cache_key = self.generate_cache_key(start_date, end_date, **kwargs)
        cached = self.get_cached_value(cache_key)
        if cached:
            return cached
        
        # 다양한 활동 지표 수집
        query = """
            SELECT 
                u.id as user_id,
                COUNT(DISTINCT p.id) as project_count,
                COUNT(DISTINCT fc.id) as feedback_count,
                COUNT(DISTINCT fm.id) as message_count,
                COUNT(DISTINCT DATE(u.last_login)) as active_days,
                EXTRACT(EPOCH FROM (MAX(u.last_login) - MIN(u.date_joined))) / 86400 as tenure_days
            FROM users_user u
            LEFT JOIN projects_members pm ON u.id = pm.user_id
            LEFT JOIN projects_project p ON pm.project_id = p.id AND p.created BETWEEN %s AND %s
            LEFT JOIN feedbacks_feedbackcomment fc ON u.id = fc.user_id AND fc.created BETWEEN %s AND %s
            LEFT JOIN feedbacks_feedbackmessage fm ON u.id = fm.user_id AND fm.created BETWEEN %s AND %s
            WHERE u.last_login BETWEEN %s AND %s
        """
        
        params = [start_date, end_date] * 4
        
        if user_id:
            query += " AND u.id = %s"
            params.append(user_id)
        
        query += " GROUP BY u.id"
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()
        
        # 참여도 점수 계산
        scores = []
        for row in results:
            data = dict(zip(columns, row))
            
            # 가중치 적용
            score = (
                data['project_count'] * 10 +  # 프로젝트 참여
                data['feedback_count'] * 2 +  # 피드백 제공
                data['message_count'] * 1 +  # 메시지 전송
                data['active_days'] * 5 +  # 활동 일수
                min(data['tenure_days'] / 30, 10) * 5  # 가입 기간 (최대 10개월)
            )
            
            scores.append({
                'user_id': data['user_id'],
                'score': min(score, 100),  # 최대 100점
                'components': {
                    'projects': data['project_count'],
                    'feedbacks': data['feedback_count'],
                    'messages': data['message_count'],
                    'active_days': data['active_days'],
                    'tenure_days': data['tenure_days']
                }
            })
        
        # 전체 또는 특정 사용자
        if user_id and scores:
            value_data = scores[0]
        else:
            value_data = {
                'average_score': np.mean([s['score'] for s in scores]) if scores else 0,
                'total_users': len(scores),
                'score_distribution': {
                    'high': len([s for s in scores if s['score'] >= 70]),
                    'medium': len([s for s in scores if 30 <= s['score'] < 70]),
                    'low': len([s for s in scores if s['score'] < 30])
                }
            }
        
        value = MetricValue(
            metric_name=self.definition.name,
            value=value_data,
            timestamp=datetime.now(),
            dimensions={
                'start_date': str(start_date),
                'end_date': str(end_date),
                'user_id': user_id if user_id else 'all'
            }
        )
        
        self.cache_value(cache_key, value)
        return value


class CollaborationIntensityMetric(BaseMetric):
    """협업 강도 메트릭"""
    
    def __init__(self):
        super().__init__(MetricDefinition(
            name="collaboration_intensity",
            display_name="협업 강도",
            description="프로젝트별 팀 협업 활동 강도",
            type=MetricType.GAUGE,
            formula="interactions_per_member_per_day",
            dimensions=["project_id", "period"],
            cache_ttl=1800
        ))
    
    def calculate(self, start_date: date, end_date: date, **kwargs) -> MetricValue:
        """협업 강도 계산"""
        project_id = kwargs.get('project_id')
        
        cache_key = self.generate_cache_key(start_date, end_date, **kwargs)
        cached = self.get_cached_value(cache_key)
        if cached:
            return cached
        
        query = """
            WITH project_activity AS (
                SELECT 
                    p.id as project_id,
                    p.name as project_name,
                    COUNT(DISTINCT m.user_id) as member_count,
                    COUNT(DISTINCT fc.id) as feedback_comments,
                    COUNT(DISTINCT fm.id) as feedback_messages,
                    COUNT(DISTINCT f.id) as files_uploaded,
                    EXTRACT(DAY FROM (%s::date - %s::date)) + 1 as period_days
                FROM projects_project p
                LEFT JOIN projects_members m ON p.id = m.project_id
                LEFT JOIN feedbacks_feedback fb ON p.feedback_id = fb.id
                LEFT JOIN feedbacks_feedbackcomment fc ON fb.id = fc.feedback_id 
                    AND fc.created BETWEEN %s AND %s
                LEFT JOIN feedbacks_feedbackmessage fm ON fb.id = fm.feedback_id 
                    AND fm.created BETWEEN %s AND %s
                LEFT JOIN projects_file f ON p.id = f.project_id 
                    AND f.created BETWEEN %s AND %s
                WHERE p.created <= %s
        """
        
        params = [end_date, start_date, start_date, end_date, 
                 start_date, end_date, start_date, end_date, end_date]
        
        if project_id:
            query += " AND p.id = %s"
            params.append(project_id)
        
        query += " GROUP BY p.id"
        
        with connection.cursor() as cursor:
            cursor.execute(query, params)
            columns = [col[0] for col in cursor.description]
            results = cursor.fetchall()
        
        intensities = []
        for row in results:
            data = dict(zip(columns, row))
            
            # 협업 강도 = 일일 멤버당 상호작용 수
            total_interactions = (
                data['feedback_comments'] + 
                data['feedback_messages'] + 
                data['files_uploaded'] * 2  # 파일 업로드는 가중치 2
            )
            
            intensity = 0
            if data['member_count'] > 0 and data['period_days'] > 0:
                intensity = total_interactions / (data['member_count'] * data['period_days'])
            
            intensities.append({
                'project_id': data['project_id'],
                'project_name': data['project_name'],
                'intensity': round(intensity, 2),
                'member_count': data['member_count'],
                'total_interactions': total_interactions,
                'breakdown': {
                    'comments': data['feedback_comments'],
                    'messages': data['feedback_messages'],
                    'files': data['files_uploaded']
                }
            })
        
        # 결과 포맷
        if project_id and intensities:
            value_data = intensities[0]
        else:
            value_data = {
                'average_intensity': np.mean([i['intensity'] for i in intensities]) if intensities else 0,
                'max_intensity': max([i['intensity'] for i in intensities]) if intensities else 0,
                'projects_analyzed': len(intensities),
                'top_projects': sorted(intensities, key=lambda x: x['intensity'], reverse=True)[:5]
            }
        
        value = MetricValue(
            metric_name=self.definition.name,
            value=value_data,
            timestamp=datetime.now(),
            dimensions={
                'start_date': str(start_date),
                'end_date': str(end_date),
                'project_id': project_id if project_id else 'all'
            }
        )
        
        self.cache_value(cache_key, value)
        return value


# === 메트릭 스토어 (중앙 관리) ===

class MetricStore:
    """메트릭 중앙 저장소"""
    
    def __init__(self):
        self.metrics = {}
        self._register_metrics()
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST if hasattr(settings, 'REDIS_HOST') else 'localhost',
            port=settings.REDIS_PORT if hasattr(settings, 'REDIS_PORT') else 6379,
            decode_responses=True
        )
    
    def _register_metrics(self):
        """메트릭 등록"""
        self.metrics['active_users'] = ActiveUsersMetric()
        self.metrics['project_success_rate'] = ProjectSuccessRateMetric()
        self.metrics['feedback_response_time'] = FeedbackResponseTimeMetric()
        self.metrics['user_engagement_score'] = UserEngagementScoreMetric()
        self.metrics['collaboration_intensity'] = CollaborationIntensityMetric()
    
    def get_metric(self, metric_name: str) -> Optional[BaseMetric]:
        """메트릭 조회"""
        return self.metrics.get(metric_name)
    
    def calculate_metric(self, metric_name: str, start_date: date, end_date: date, **kwargs) -> MetricValue:
        """메트릭 계산"""
        metric = self.get_metric(metric_name)
        if not metric:
            raise ValueError(f"Metric {metric_name} not found")
        
        return metric.calculate(start_date, end_date, **kwargs)
    
    def get_all_metrics(self) -> List[MetricDefinition]:
        """모든 메트릭 정의 조회"""
        return [m.definition for m in self.metrics.values()]
    
    def calculate_dashboard(self, dashboard_name: str, start_date: date, end_date: date) -> Dict[str, Any]:
        """대시보드용 메트릭 세트 계산"""
        dashboards = {
            'executive': ['active_users', 'project_success_rate', 'user_engagement_score'],
            'project_manager': ['project_success_rate', 'feedback_response_time', 'collaboration_intensity'],
            'user_analytics': ['active_users', 'user_engagement_score', 'feedback_response_time']
        }
        
        if dashboard_name not in dashboards:
            raise ValueError(f"Dashboard {dashboard_name} not defined")
        
        results = {}
        for metric_name in dashboards[dashboard_name]:
            try:
                value = self.calculate_metric(metric_name, start_date, end_date)
                results[metric_name] = {
                    'value': value.value,
                    'timestamp': value.timestamp.isoformat(),
                    'dimensions': value.dimensions
                }
            except Exception as e:
                results[metric_name] = {
                    'error': str(e)
                }
        
        return {
            'dashboard': dashboard_name,
            'period': {
                'start': str(start_date),
                'end': str(end_date)
            },
            'metrics': results,
            'generated_at': datetime.now().isoformat()
        }
    
    def check_slos(self) -> Dict[str, Dict[str, Any]]:
        """SLO 체크"""
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        slo_results = {}
        
        for metric_name, metric in self.metrics.items():
            if metric.definition.slo_threshold is not None:
                try:
                    value = metric.calculate(yesterday, today)
                    
                    # 값 타입에 따른 비교
                    if isinstance(value.value, (int, float)):
                        meets_slo = value.value >= metric.definition.slo_threshold
                        actual = value.value
                    elif isinstance(value.value, dict):
                        # 딕셔너리인 경우 주요 지표 선택
                        if 'mean' in value.value:
                            actual = value.value['mean']
                            meets_slo = actual <= metric.definition.slo_threshold
                        elif 'average_score' in value.value:
                            actual = value.value['average_score']
                            meets_slo = actual >= metric.definition.slo_threshold
                        else:
                            actual = None
                            meets_slo = None
                    else:
                        actual = None
                        meets_slo = None
                    
                    slo_results[metric_name] = {
                        'meets_slo': meets_slo,
                        'threshold': metric.definition.slo_threshold,
                        'actual': actual,
                        'checked_at': datetime.now().isoformat()
                    }
                    
                except Exception as e:
                    slo_results[metric_name] = {
                        'error': str(e),
                        'checked_at': datetime.now().isoformat()
                    }
        
        return slo_results
    
    def export_metrics_catalog(self) -> str:
        """메트릭 카탈로그 내보내기"""
        catalog = []
        catalog.append("=" * 80)
        catalog.append("METRICS CATALOG")
        catalog.append("=" * 80)
        catalog.append(f"Generated at: {datetime.now().isoformat()}")
        catalog.append(f"Total Metrics: {len(self.metrics)}\n")
        
        for metric_name, metric in self.metrics.items():
            definition = metric.definition
            catalog.append(f"\n{definition.display_name} ({definition.name})")
            catalog.append("-" * 40)
            catalog.append(f"Description: {definition.description}")
            catalog.append(f"Type: {definition.type.value}")
            catalog.append(f"Formula: {definition.formula}")
            catalog.append(f"Dimensions: {', '.join(definition.dimensions)}")
            catalog.append(f"Version: {definition.version}")
            catalog.append(f"Owner: {definition.owner}")
            if definition.slo_threshold:
                catalog.append(f"SLO Threshold: {definition.slo_threshold}")
            catalog.append(f"Cache TTL: {definition.cache_ttl} seconds")
        
        return "\n".join(catalog)


# === 메트릭 API 서비스 ===

class MetricService:
    """메트릭 서비스 레이어"""
    
    def __init__(self):
        self.store = MetricStore()
    
    def get_metric_value(self, metric_name: str, period: str = 'daily', **filters) -> Dict[str, Any]:
        """메트릭 값 조회 API"""
        # 기간 파싱
        end_date = date.today()
        if period == 'daily':
            start_date = end_date - timedelta(days=1)
        elif period == 'weekly':
            start_date = end_date - timedelta(days=7)
        elif period == 'monthly':
            start_date = end_date - timedelta(days=30)
        else:
            start_date = end_date - timedelta(days=1)
        
        try:
            value = self.store.calculate_metric(metric_name, start_date, end_date, **filters)
            return {
                'success': True,
                'data': {
                    'metric': metric_name,
                    'value': value.value,
                    'period': period,
                    'dimensions': value.dimensions,
                    'timestamp': value.timestamp.isoformat()
                }
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_metric_trend(self, metric_name: str, days: int = 30, **filters) -> Dict[str, Any]:
        """메트릭 트렌드 조회"""
        end_date = date.today()
        trend_data = []
        
        for i in range(days):
            current_date = end_date - timedelta(days=i)
            try:
                value = self.store.calculate_metric(
                    metric_name, 
                    current_date, 
                    current_date, 
                    **filters
                )
                trend_data.append({
                    'date': str(current_date),
                    'value': value.value if isinstance(value.value, (int, float)) else value.value.get('value', 0)
                })
            except:
                trend_data.append({
                    'date': str(current_date),
                    'value': None
                })
        
        return {
            'metric': metric_name,
            'period_days': days,
            'trend': list(reversed(trend_data)),
            'generated_at': datetime.now().isoformat()
        }
    
    def compare_metrics(self, metric_name: str, dimension: str, values: List[str]) -> Dict[str, Any]:
        """메트릭 비교"""
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        comparisons = {}
        for value in values:
            try:
                metric_value = self.store.calculate_metric(
                    metric_name,
                    start_date,
                    end_date,
                    **{dimension: value}
                )
                comparisons[value] = metric_value.value
            except Exception as e:
                comparisons[value] = {'error': str(e)}
        
        return {
            'metric': metric_name,
            'dimension': dimension,
            'comparisons': comparisons,
            'period': {
                'start': str(start_date),
                'end': str(end_date)
            }
        }


# 사용 예시
if __name__ == "__main__":
    service = MetricService()
    
    # 일일 활성 사용자
    dau = service.get_metric_value('active_users', period='daily')
    print(f"Daily Active Users: {dau}")
    
    # 프로젝트 성공률 트렌드
    trend = service.get_metric_trend('project_success_rate', days=7)
    print(f"Project Success Rate Trend: {trend}")
    
    # SLO 체크
    store = MetricStore()
    slo_status = store.check_slos()
    print(f"SLO Status: {slo_status}")
    
    # 메트릭 카탈로그
    catalog = store.export_metrics_catalog()
    print(catalog)