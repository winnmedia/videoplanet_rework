"""
피처 스토어 구현
ML 모델을 위한 피처 엔지니어링 및 서빙 인프라

설계 원칙:
1. Point-in-time correctness (시점 정합성)
2. 피처 버전 관리 및 계보 추적
3. 온라인/오프라인 일관성
4. 피처 드리프트 감지
"""

from typing import Dict, Any, List, Optional, Union, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta, date
from enum import Enum
import json
import pandas as pd
import numpy as np
from abc import ABC, abstractmethod
import redis
import hashlib
from sklearn.preprocessing import StandardScaler, LabelEncoder
from scipy import stats
import pickle


class FeatureType(Enum):
    """피처 타입"""
    NUMERIC = "numeric"
    CATEGORICAL = "categorical"
    EMBEDDING = "embedding"
    BINARY = "binary"
    TIMESTAMP = "timestamp"
    TEXT = "text"


class FeatureSource(Enum):
    """피처 소스"""
    BATCH = "batch"  # 배치 계산
    STREAMING = "streaming"  # 실시간 계산
    REQUEST = "request"  # 요청 시점 계산


@dataclass
class FeatureDefinition:
    """피처 정의"""
    name: str
    description: str
    type: FeatureType
    source: FeatureSource
    entity: str  # user, project, feedback 등
    computation_function: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    version: str = "v1.0.0"
    ttl_seconds: int = 3600
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FeatureValue:
    """피처 값"""
    feature_name: str
    entity_id: str
    value: Any
    timestamp: datetime
    version: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class FeatureDriftDetector:
    """피처 드리프트 감지기"""
    
    def __init__(self, baseline_window_days: int = 30, detection_threshold: float = 0.05):
        self.baseline_window_days = baseline_window_days
        self.detection_threshold = detection_threshold
        self.baselines = {}
    
    def update_baseline(self, feature_name: str, values: np.ndarray):
        """베이스라인 업데이트"""
        self.baselines[feature_name] = {
            'mean': np.mean(values),
            'std': np.std(values),
            'quantiles': np.percentile(values, [25, 50, 75]),
            'updated_at': datetime.now()
        }
    
    def detect_drift(self, feature_name: str, current_values: np.ndarray) -> Dict[str, Any]:
        """드리프트 감지"""
        if feature_name not in self.baselines:
            return {'drift_detected': False, 'message': 'No baseline available'}
        
        baseline = self.baselines[feature_name]
        
        # KS 테스트 (Kolmogorov-Smirnov test)
        baseline_distribution = np.random.normal(
            baseline['mean'], 
            baseline['std'], 
            size=len(current_values)
        )
        ks_statistic, p_value = stats.ks_2samp(baseline_distribution, current_values)
        
        # 평균 이동 감지
        current_mean = np.mean(current_values)
        mean_shift = abs(current_mean - baseline['mean']) / (baseline['std'] + 1e-10)
        
        # 분산 변화 감지
        current_std = np.std(current_values)
        std_ratio = current_std / (baseline['std'] + 1e-10)
        
        drift_detected = (
            p_value < self.detection_threshold or
            mean_shift > 3 or  # 3 표준편차 이상 이동
            std_ratio > 2 or std_ratio < 0.5  # 분산 2배 이상 변화
        )
        
        return {
            'drift_detected': drift_detected,
            'ks_statistic': ks_statistic,
            'p_value': p_value,
            'mean_shift': mean_shift,
            'std_ratio': std_ratio,
            'baseline_mean': baseline['mean'],
            'current_mean': current_mean,
            'baseline_std': baseline['std'],
            'current_std': current_std
        }


class BaseFeature(ABC):
    """기본 피처 추상 클래스"""
    
    def __init__(self, definition: FeatureDefinition):
        self.definition = definition
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=False  # 바이너리 데이터 처리를 위해
        )
        self.drift_detector = FeatureDriftDetector()
    
    @abstractmethod
    def compute(self, entity_id: str, timestamp: Optional[datetime] = None) -> Any:
        """피처 계산"""
        pass
    
    def get_cached_value(self, entity_id: str, timestamp: Optional[datetime] = None) -> Optional[FeatureValue]:
        """캐시된 값 조회"""
        cache_key = self._generate_cache_key(entity_id, timestamp)
        cached = self.redis_client.get(cache_key)
        
        if cached:
            return pickle.loads(cached)
        return None
    
    def cache_value(self, feature_value: FeatureValue):
        """값 캐싱"""
        cache_key = self._generate_cache_key(feature_value.entity_id, feature_value.timestamp)
        serialized = pickle.dumps(feature_value)
        self.redis_client.setex(cache_key, self.definition.ttl_seconds, serialized)
    
    def _generate_cache_key(self, entity_id: str, timestamp: Optional[datetime] = None) -> str:
        """캐시 키 생성"""
        if timestamp:
            time_str = timestamp.strftime("%Y%m%d%H")
        else:
            time_str = "latest"
        
        return f"feature:{self.definition.name}:{self.definition.version}:{entity_id}:{time_str}"
    
    def get_point_in_time_value(self, entity_id: str, timestamp: datetime) -> FeatureValue:
        """특정 시점의 피처 값 조회 (Point-in-time correctness)"""
        # 먼저 캐시 확인
        cached = self.get_cached_value(entity_id, timestamp)
        if cached:
            return cached
        
        # 캐시에 없으면 계산
        value = self.compute(entity_id, timestamp)
        
        feature_value = FeatureValue(
            feature_name=self.definition.name,
            entity_id=entity_id,
            value=value,
            timestamp=timestamp,
            version=self.definition.version
        )
        
        # 캐시 저장
        self.cache_value(feature_value)
        
        return feature_value


# === 사용자 피처 구현 ===

class UserActivityFeature(BaseFeature):
    """사용자 활동 피처"""
    
    def __init__(self):
        super().__init__(FeatureDefinition(
            name="user_activity_features",
            description="사용자 활동 관련 피처 세트",
            type=FeatureType.NUMERIC,
            source=FeatureSource.BATCH,
            entity="user",
            version="v1.0.0",
            ttl_seconds=3600
        ))
    
    def compute(self, entity_id: str, timestamp: Optional[datetime] = None) -> Dict[str, float]:
        """사용자 활동 피처 계산"""
        if not timestamp:
            timestamp = datetime.now()
        
        # 시뮬레이션 데이터 (실제로는 DB 쿼리)
        features = {
            'login_count_7d': np.random.poisson(5),
            'login_count_30d': np.random.poisson(20),
            'project_count': np.random.poisson(3),
            'feedback_count_7d': np.random.poisson(10),
            'feedback_count_30d': np.random.poisson(40),
            'avg_session_duration_minutes': np.random.gamma(2, 15),
            'days_since_registration': np.random.randint(1, 365),
            'is_premium_user': np.random.choice([0, 1], p=[0.8, 0.2])
        }
        
        return features


class UserEngagementFeature(BaseFeature):
    """사용자 참여도 피처"""
    
    def __init__(self):
        super().__init__(FeatureDefinition(
            name="user_engagement_features",
            description="사용자 참여도 관련 피처",
            type=FeatureType.NUMERIC,
            source=FeatureSource.BATCH,
            entity="user",
            dependencies=["user_activity_features"],
            version="v1.0.0"
        ))
    
    def compute(self, entity_id: str, timestamp: Optional[datetime] = None) -> Dict[str, float]:
        """사용자 참여도 피처 계산"""
        # 의존 피처 가져오기
        activity_feature = UserActivityFeature()
        activity_data = activity_feature.compute(entity_id, timestamp)
        
        # 참여도 점수 계산
        engagement_score = (
            activity_data['login_count_7d'] * 2 +
            activity_data['feedback_count_7d'] * 3 +
            activity_data['project_count'] * 5 +
            min(activity_data['avg_session_duration_minutes'] / 10, 10)
        )
        
        # 참여도 레벨
        if engagement_score >= 50:
            engagement_level = 'high'
        elif engagement_score >= 20:
            engagement_level = 'medium'
        else:
            engagement_level = 'low'
        
        features = {
            'engagement_score': engagement_score,
            'engagement_level_encoded': {'low': 0, 'medium': 1, 'high': 2}[engagement_level],
            'login_frequency': activity_data['login_count_30d'] / 30,
            'feedback_frequency': activity_data['feedback_count_30d'] / 30,
            'retention_probability': min(engagement_score / 100, 1.0)
        }
        
        return features


class UserTextFeature(BaseFeature):
    """사용자 텍스트 피처 (피드백, 메시지 등)"""
    
    def __init__(self):
        super().__init__(FeatureDefinition(
            name="user_text_features",
            description="사용자 작성 텍스트 기반 피처",
            type=FeatureType.TEXT,
            source=FeatureSource.BATCH,
            entity="user",
            version="v1.0.0"
        ))
    
    def compute(self, entity_id: str, timestamp: Optional[datetime] = None) -> Dict[str, Any]:
        """텍스트 피처 계산"""
        # 시뮬레이션 데이터 (실제로는 DB에서 텍스트 추출)
        sample_texts = [
            "좋은 프로젝트입니다. 수정사항이 조금 있습니다.",
            "전체적으로 만족스럽습니다.",
            "디자인이 훌륭해요!",
            "일정을 조정해주세요."
        ]
        
        # 텍스트 통계
        avg_length = np.mean([len(text) for text in sample_texts])
        total_messages = len(sample_texts)
        
        # 감성 분석 (시뮬레이션)
        sentiment_scores = np.random.beta(7, 3, size=len(sample_texts))  # 긍정 편향
        
        features = {
            'avg_message_length': avg_length,
            'total_messages': total_messages,
            'avg_sentiment_score': np.mean(sentiment_scores),
            'sentiment_std': np.std(sentiment_scores),
            'positive_message_ratio': np.sum(sentiment_scores > 0.5) / len(sentiment_scores)
        }
        
        return features


# === 프로젝트 피처 구현 ===

class ProjectFeature(BaseFeature):
    """프로젝트 피처"""
    
    def __init__(self):
        super().__init__(FeatureDefinition(
            name="project_features",
            description="프로젝트 관련 피처",
            type=FeatureType.NUMERIC,
            source=FeatureSource.BATCH,
            entity="project",
            version="v1.0.0"
        ))
    
    def compute(self, entity_id: str, timestamp: Optional[datetime] = None) -> Dict[str, float]:
        """프로젝트 피처 계산"""
        features = {
            'member_count': np.random.poisson(5),
            'file_count': np.random.poisson(10),
            'feedback_count': np.random.poisson(20),
            'days_since_creation': np.random.randint(1, 180),
            'completion_percentage': np.random.beta(7, 3) * 100,
            'is_on_schedule': np.random.choice([0, 1], p=[0.3, 0.7]),
            'budget_utilization': np.random.beta(5, 2) * 100,
            'risk_score': np.random.gamma(2, 10)
        }
        
        return features


class ProjectCollaborationFeature(BaseFeature):
    """프로젝트 협업 피처"""
    
    def __init__(self):
        super().__init__(FeatureDefinition(
            name="project_collaboration_features",
            description="프로젝트 협업 관련 피처",
            type=FeatureType.NUMERIC,
            source=FeatureSource.STREAMING,
            entity="project",
            version="v1.0.0"
        ))
    
    def compute(self, entity_id: str, timestamp: Optional[datetime] = None) -> Dict[str, float]:
        """협업 피처 계산"""
        features = {
            'daily_interactions': np.random.poisson(15),
            'unique_contributors_7d': np.random.poisson(4),
            'avg_response_time_hours': np.random.gamma(2, 3),
            'collaboration_index': np.random.beta(5, 2) * 100,
            'communication_density': np.random.gamma(3, 5),
            'file_sharing_rate': np.random.poisson(3)
        }
        
        return features


# === 피처 스토어 ===

class FeatureStore:
    """중앙 피처 스토어"""
    
    def __init__(self):
        self.features = {}
        self.redis_client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=False
        )
        self._register_features()
    
    def _register_features(self):
        """피처 등록"""
        self.features['user_activity'] = UserActivityFeature()
        self.features['user_engagement'] = UserEngagementFeature()
        self.features['user_text'] = UserTextFeature()
        self.features['project'] = ProjectFeature()
        self.features['project_collaboration'] = ProjectCollaborationFeature()
    
    def get_feature_vector(self, entity_type: str, entity_id: str, 
                          feature_names: Optional[List[str]] = None,
                          timestamp: Optional[datetime] = None) -> pd.DataFrame:
        """피처 벡터 조회"""
        if not timestamp:
            timestamp = datetime.now()
        
        # 엔티티 타입에 해당하는 피처 필터링
        entity_features = {
            name: feature for name, feature in self.features.items()
            if feature.definition.entity == entity_type
        }
        
        if feature_names:
            entity_features = {
                name: feature for name, feature in entity_features.items()
                if name in feature_names
            }
        
        # 피처 값 수집
        feature_data = {}
        for name, feature in entity_features.items():
            try:
                value = feature.get_point_in_time_value(entity_id, timestamp)
                if isinstance(value.value, dict):
                    for k, v in value.value.items():
                        feature_data[f"{name}_{k}"] = v
                else:
                    feature_data[name] = value.value
            except Exception as e:
                print(f"Error computing feature {name}: {str(e)}")
        
        # DataFrame으로 변환
        df = pd.DataFrame([feature_data])
        df['entity_id'] = entity_id
        df['timestamp'] = timestamp
        
        return df
    
    def get_training_dataset(self, entity_type: str, entity_ids: List[str],
                           start_date: date, end_date: date,
                           feature_names: Optional[List[str]] = None) -> pd.DataFrame:
        """학습용 데이터셋 생성"""
        all_data = []
        
        current_date = start_date
        while current_date <= end_date:
            timestamp = datetime.combine(current_date, datetime.min.time())
            
            for entity_id in entity_ids:
                feature_vector = self.get_feature_vector(
                    entity_type, entity_id, feature_names, timestamp
                )
                all_data.append(feature_vector)
            
            current_date += timedelta(days=1)
        
        if all_data:
            return pd.concat(all_data, ignore_index=True)
        return pd.DataFrame()
    
    def serve_online_features(self, entity_type: str, entity_id: str,
                            feature_names: List[str]) -> Dict[str, Any]:
        """온라인 서빙용 피처 제공 (낮은 레이턴시)"""
        start_time = datetime.now()
        
        # 캐시 우선 조회
        cache_key = f"online_features:{entity_type}:{entity_id}:{':'.join(sorted(feature_names))}"
        cached = self.redis_client.get(cache_key)
        
        if cached:
            features = pickle.loads(cached)
            features['cache_hit'] = True
        else:
            # 실시간 계산
            features = {}
            for feature_name in feature_names:
                if feature_name in self.features:
                    feature = self.features[feature_name]
                    if feature.definition.entity == entity_type:
                        value = feature.compute(entity_id)
                        if isinstance(value, dict):
                            features.update(value)
                        else:
                            features[feature_name] = value
            
            # 캐시 저장 (1분 TTL)
            self.redis_client.setex(cache_key, 60, pickle.dumps(features))
            features['cache_hit'] = False
        
        # 레이턴시 측정
        latency_ms = (datetime.now() - start_time).total_seconds() * 1000
        features['serving_latency_ms'] = latency_ms
        
        return features
    
    def monitor_feature_drift(self, feature_name: str, 
                            entity_type: str,
                            sample_size: int = 1000) -> Dict[str, Any]:
        """피처 드리프트 모니터링"""
        if feature_name not in self.features:
            return {'error': f"Feature {feature_name} not found"}
        
        feature = self.features[feature_name]
        if feature.definition.entity != entity_type:
            return {'error': f"Feature {feature_name} is not for entity type {entity_type}"}
        
        # 최근 데이터 샘플링 (시뮬레이션)
        current_values = []
        for _ in range(sample_size):
            entity_id = f"sample_{np.random.randint(1000)}"
            value = feature.compute(entity_id)
            if isinstance(value, dict):
                # 첫 번째 숫자 값 사용
                for v in value.values():
                    if isinstance(v, (int, float)):
                        current_values.append(v)
                        break
            elif isinstance(value, (int, float)):
                current_values.append(value)
        
        current_values = np.array(current_values)
        
        # 베이스라인이 없으면 설정
        if feature_name not in feature.drift_detector.baselines:
            feature.drift_detector.update_baseline(feature_name, current_values)
            return {
                'status': 'baseline_set',
                'feature': feature_name,
                'sample_size': len(current_values),
                'mean': np.mean(current_values),
                'std': np.std(current_values)
            }
        
        # 드리프트 감지
        drift_result = feature.drift_detector.detect_drift(feature_name, current_values)
        
        return {
            'feature': feature_name,
            'drift_analysis': drift_result,
            'sample_size': len(current_values),
            'monitored_at': datetime.now().isoformat()
        }
    
    def get_feature_importance(self, model_name: str = "default") -> Dict[str, float]:
        """피처 중요도 조회 (모델별)"""
        # 시뮬레이션된 피처 중요도
        importance = {
            'user_activity_login_count_30d': 0.15,
            'user_activity_project_count': 0.12,
            'user_engagement_engagement_score': 0.25,
            'user_engagement_retention_probability': 0.18,
            'project_completion_percentage': 0.10,
            'project_collaboration_collaboration_index': 0.08,
            'project_is_on_schedule': 0.07,
            'user_text_avg_sentiment_score': 0.05
        }
        
        return importance
    
    def export_feature_catalog(self) -> str:
        """피처 카탈로그 내보내기"""
        catalog = []
        catalog.append("=" * 80)
        catalog.append("FEATURE CATALOG")
        catalog.append("=" * 80)
        catalog.append(f"Generated at: {datetime.now().isoformat()}")
        catalog.append(f"Total Features: {len(self.features)}\n")
        
        for name, feature in self.features.items():
            definition = feature.definition
            catalog.append(f"\n{name}")
            catalog.append("-" * 40)
            catalog.append(f"Description: {definition.description}")
            catalog.append(f"Entity: {definition.entity}")
            catalog.append(f"Type: {definition.type.value}")
            catalog.append(f"Source: {definition.source.value}")
            catalog.append(f"Version: {definition.version}")
            if definition.dependencies:
                catalog.append(f"Dependencies: {', '.join(definition.dependencies)}")
            catalog.append(f"TTL: {definition.ttl_seconds} seconds")
        
        return "\n".join(catalog)


# === ML 모델 서빙 예시 ===

class ModelServer:
    """ML 모델 서빙 서버"""
    
    def __init__(self):
        self.feature_store = FeatureStore()
        self.models = {}  # 모델 레지스트리
    
    def predict(self, model_name: str, entity_type: str, entity_id: str) -> Dict[str, Any]:
        """예측 수행"""
        # 필요한 피처 목록 (모델별로 다름)
        required_features = {
            'user_churn': ['user_activity', 'user_engagement'],
            'project_success': ['project', 'project_collaboration'],
            'feedback_priority': ['user_text', 'user_engagement']
        }
        
        if model_name not in required_features:
            return {'error': f"Model {model_name} not found"}
        
        # 피처 조회
        features = self.feature_store.serve_online_features(
            entity_type, 
            entity_id,
            required_features[model_name]
        )
        
        # 예측 (시뮬레이션)
        if model_name == 'user_churn':
            # 이탈 확률 예측
            churn_prob = 1 / (1 + np.exp(features.get('engagement_score', 0) / 10))
            prediction = {
                'churn_probability': churn_prob,
                'risk_level': 'high' if churn_prob > 0.7 else 'medium' if churn_prob > 0.3 else 'low'
            }
        elif model_name == 'project_success':
            # 프로젝트 성공 확률
            success_prob = features.get('completion_percentage', 50) / 100 * features.get('is_on_schedule', 0.5)
            prediction = {
                'success_probability': success_prob,
                'recommendation': 'increase_resources' if success_prob < 0.5 else 'maintain_course'
            }
        else:
            prediction = {'score': np.random.random()}
        
        return {
            'model': model_name,
            'entity_id': entity_id,
            'prediction': prediction,
            'features_used': list(features.keys()),
            'latency_ms': features.get('serving_latency_ms', 0),
            'timestamp': datetime.now().isoformat()
        }


# 사용 예시
if __name__ == "__main__":
    # 피처 스토어 초기화
    store = FeatureStore()
    
    # 사용자 피처 벡터 조회
    user_features = store.get_feature_vector('user', 'user_123')
    print("User Features:")
    print(user_features)
    
    # 학습 데이터셋 생성
    training_data = store.get_training_dataset(
        'project',
        ['proj_1', 'proj_2', 'proj_3'],
        date.today() - timedelta(days=7),
        date.today()
    )
    print(f"\nTraining Dataset Shape: {training_data.shape}")
    
    # 온라인 서빙
    online_features = store.serve_online_features(
        'user', 'user_456', ['user_activity', 'user_engagement']
    )
    print(f"\nOnline Features (latency: {online_features.get('serving_latency_ms', 0):.2f}ms):")
    print(online_features)
    
    # 드리프트 모니터링
    drift_status = store.monitor_feature_drift('user_activity', 'user', sample_size=100)
    print(f"\nDrift Monitoring: {drift_status}")
    
    # 모델 예측
    model_server = ModelServer()
    prediction = model_server.predict('user_churn', 'user', 'user_789')
    print(f"\nPrediction: {prediction}")
    
    # 피처 카탈로그
    catalog = store.export_feature_catalog()
    print(f"\n{catalog}")