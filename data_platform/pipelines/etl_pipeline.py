"""
ETL/ELT 파이프라인 구현
슬라이스 지향 아키텍처에 따른 도메인별 파이프라인 설계

설계 원칙:
1. 각 비즈니스 슬라이스별 독립적인 파이프라인
2. 에러 복구 및 재시도 메커니즘
3. 증분 처리 및 멱등성 보장
4. 데이터 계보(Lineage) 추적
"""

from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import json
import logging
import hashlib
from abc import ABC, abstractmethod
import pandas as pd
from concurrent.futures import ThreadPoolExecutor, as_completed
import redis
from django.db import connection, transaction
from django.conf import settings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PipelineStatus(Enum):
    """파이프라인 상태"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    SKIPPED = "skipped"


class ProcessingMode(Enum):
    """처리 모드"""
    BATCH = "batch"
    STREAMING = "streaming"
    MICRO_BATCH = "micro_batch"


@dataclass
class PipelineConfig:
    """파이프라인 설정"""
    name: str
    slice_name: str  # 비즈니스 슬라이스
    mode: ProcessingMode
    schedule: Optional[str] = None  # cron 표현식
    retry_count: int = 3
    retry_delay: int = 60  # seconds
    timeout: int = 3600  # seconds
    slo_freshness_minutes: int = 15  # 데이터 신선도 SLO
    slo_completeness_percent: float = 99.0  # 완전성 SLO
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PipelineRun:
    """파이프라인 실행 정보"""
    run_id: str
    pipeline_name: str
    status: PipelineStatus
    started_at: datetime
    completed_at: Optional[datetime] = None
    records_processed: int = 0
    records_failed: int = 0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class DataLineage:
    """데이터 계보 추적"""
    
    def __init__(self):
        self.lineage_graph = {}
        
    def add_transformation(self, source: str, target: str, transformation: str, timestamp: datetime):
        """변환 추가"""
        if source not in self.lineage_graph:
            self.lineage_graph[source] = []
        
        self.lineage_graph[source].append({
            "target": target,
            "transformation": transformation,
            "timestamp": timestamp
        })
    
    def get_upstream(self, dataset: str) -> List[str]:
        """상위 데이터셋 조회"""
        upstream = []
        for source, targets in self.lineage_graph.items():
            for target_info in targets:
                if target_info["target"] == dataset:
                    upstream.append(source)
        return upstream
    
    def get_downstream(self, dataset: str) -> List[str]:
        """하위 데이터셋 조회"""
        if dataset in self.lineage_graph:
            return [t["target"] for t in self.lineage_graph[dataset]]
        return []


class BasePipeline(ABC):
    """기본 파이프라인 추상 클래스"""
    
    def __init__(self, config: PipelineConfig):
        self.config = config
        self.lineage = DataLineage()
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST if hasattr(settings, 'REDIS_HOST') else 'localhost',
            port=settings.REDIS_PORT if hasattr(settings, 'REDIS_PORT') else 6379,
            decode_responses=True
        )
        
    @abstractmethod
    def extract(self, **kwargs) -> pd.DataFrame:
        """데이터 추출"""
        pass
    
    @abstractmethod
    def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        """데이터 변환"""
        pass
    
    @abstractmethod
    def load(self, data: pd.DataFrame) -> bool:
        """데이터 적재"""
        pass
    
    def validate(self, data: pd.DataFrame) -> Dict[str, Any]:
        """데이터 검증"""
        from ..tests.test_data_quality import DataQualityValidator, DataQualityExpectation, DataQualityDimension
        
        validator = DataQualityValidator(self.config.name)
        
        # 기본 검증 - null 체크
        validator.add_expectation(DataQualityExpectation(
            name="no_empty_dataframe",
            dimension=DataQualityDimension.COMPLETENESS,
            check_function=lambda df: ExpectationResult(
                success=not df.empty,
                observed_value=len(df),
                message=f"DataFrame has {len(df)} records"
            ),
            severity="critical"
        ))
        
        return validator.validate(data)
    
    def run(self, **kwargs) -> PipelineRun:
        """파이프라인 실행"""
        run_id = self._generate_run_id()
        run = PipelineRun(
            run_id=run_id,
            pipeline_name=self.config.name,
            status=PipelineStatus.RUNNING,
            started_at=datetime.now()
        )
        
        try:
            # 체크포인트 복구
            checkpoint = self._load_checkpoint(run_id)
            if checkpoint:
                logger.info(f"Resuming from checkpoint: {checkpoint}")
            
            # Extract
            logger.info(f"Starting extraction for {self.config.name}")
            raw_data = self.extract(**kwargs)
            self._save_checkpoint(run_id, "extracted", raw_data)
            
            # Validate raw data
            validation_result = self.validate(raw_data)
            if validation_result['failed'] > 0 and validation_result['pass_rate'] < 0.9:
                raise ValueError(f"Data quality check failed: {validation_result}")
            
            # Transform
            logger.info(f"Starting transformation for {self.config.name}")
            transformed_data = self.transform(raw_data)
            self._save_checkpoint(run_id, "transformed", transformed_data)
            
            # Validate transformed data
            validation_result = self.validate(transformed_data)
            if validation_result['failed'] > 0 and validation_result['pass_rate'] < 0.95:
                raise ValueError(f"Transformed data quality check failed: {validation_result}")
            
            # Load
            logger.info(f"Starting load for {self.config.name}")
            success = self.load(transformed_data)
            
            if success:
                run.status = PipelineStatus.SUCCESS
                run.records_processed = len(transformed_data)
            else:
                run.status = PipelineStatus.FAILED
                run.error_message = "Load failed"
            
        except Exception as e:
            logger.error(f"Pipeline {self.config.name} failed: {str(e)}")
            run.status = PipelineStatus.FAILED
            run.error_message = str(e)
            
            # 재시도 로직
            if kwargs.get('retry_count', 0) < self.config.retry_count:
                run.status = PipelineStatus.RETRYING
                return self._retry_pipeline(run, kwargs)
        
        finally:
            run.completed_at = datetime.now()
            self._save_run_history(run)
            self._cleanup_checkpoint(run_id)
        
        return run
    
    def _generate_run_id(self) -> str:
        """실행 ID 생성"""
        timestamp = datetime.now().isoformat()
        return hashlib.md5(f"{self.config.name}_{timestamp}".encode()).hexdigest()
    
    def _save_checkpoint(self, run_id: str, stage: str, data: pd.DataFrame):
        """체크포인트 저장"""
        checkpoint_key = f"checkpoint:{run_id}:{stage}"
        self.redis_client.setex(
            checkpoint_key,
            3600,  # 1시간 TTL
            data.to_json()
        )
    
    def _load_checkpoint(self, run_id: str) -> Optional[Dict[str, pd.DataFrame]]:
        """체크포인트 로드"""
        checkpoints = {}
        for stage in ["extracted", "transformed"]:
            checkpoint_key = f"checkpoint:{run_id}:{stage}"
            data = self.redis_client.get(checkpoint_key)
            if data:
                checkpoints[stage] = pd.read_json(data)
        return checkpoints if checkpoints else None
    
    def _cleanup_checkpoint(self, run_id: str):
        """체크포인트 정리"""
        for stage in ["extracted", "transformed"]:
            checkpoint_key = f"checkpoint:{run_id}:{stage}"
            self.redis_client.delete(checkpoint_key)
    
    def _save_run_history(self, run: PipelineRun):
        """실행 이력 저장"""
        history_key = f"pipeline:history:{self.config.name}"
        self.redis_client.lpush(history_key, json.dumps({
            "run_id": run.run_id,
            "status": run.status.value,
            "started_at": run.started_at.isoformat(),
            "completed_at": run.completed_at.isoformat() if run.completed_at else None,
            "records_processed": run.records_processed,
            "records_failed": run.records_failed,
            "error_message": run.error_message
        }))
        self.redis_client.ltrim(history_key, 0, 99)  # 최근 100개 유지
    
    def _retry_pipeline(self, run: PipelineRun, kwargs: Dict[str, Any]) -> PipelineRun:
        """파이프라인 재시도"""
        import time
        retry_count = kwargs.get('retry_count', 0) + 1
        logger.info(f"Retrying pipeline {self.config.name} (attempt {retry_count}/{self.config.retry_count})")
        time.sleep(self.config.retry_delay)
        kwargs['retry_count'] = retry_count
        return self.run(**kwargs)


# === 사용자 이벤트 파이프라인 ===

class UserEventPipeline(BasePipeline):
    """사용자 이벤트 처리 파이프라인"""
    
    def __init__(self):
        super().__init__(PipelineConfig(
            name="user_event_pipeline",
            slice_name="user_analytics",
            mode=ProcessingMode.MICRO_BATCH,
            schedule="*/5 * * * *",  # 5분마다
            slo_freshness_minutes=5,
            slo_completeness_percent=99.5
        ))
    
    def extract(self, **kwargs) -> pd.DataFrame:
        """사용자 이벤트 추출"""
        # 마지막 처리 시점 조회
        last_processed = self.redis_client.get(f"pipeline:{self.config.name}:last_processed")
        if last_processed:
            last_processed = datetime.fromisoformat(last_processed)
        else:
            last_processed = datetime.now() - timedelta(hours=1)
        
        # Django ORM을 통한 데이터 추출
        query = """
            SELECT 
                u.id as user_id,
                u.username,
                u.email,
                u.login_method,
                u.last_login,
                u.date_joined,
                COUNT(DISTINCT p.id) as project_count,
                COUNT(DISTINCT f.id) as feedback_count
            FROM users_user u
            LEFT JOIN projects_members m ON u.id = m.user_id
            LEFT JOIN projects_project p ON m.project_id = p.id
            LEFT JOIN feedbacks_feedbackcomment f ON u.id = f.user_id
            WHERE u.updated >= %s
            GROUP BY u.id
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, [last_processed])
            columns = [col[0] for col in cursor.description]
            data = cursor.fetchall()
        
        df = pd.DataFrame(data, columns=columns)
        
        # 이벤트 생성
        events = []
        for _, row in df.iterrows():
            events.append({
                "event_id": hashlib.md5(f"user_{row['user_id']}_{datetime.now().isoformat()}".encode()).hexdigest(),
                "event_type": "user.activity",
                "timestamp": datetime.now(),
                "user_id": row['user_id'],
                "user_data": row.to_dict()
            })
        
        return pd.DataFrame(events)
    
    def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        """사용자 이벤트 변환"""
        # 사용자 세그먼트 추가
        data['user_segment'] = data.apply(self._determine_user_segment, axis=1)
        
        # 활동 점수 계산
        data['activity_score'] = data.apply(self._calculate_activity_score, axis=1)
        
        # 타임스탬프 정규화
        data['timestamp'] = pd.to_datetime(data['timestamp'])
        data['date'] = data['timestamp'].dt.date
        data['hour'] = data['timestamp'].dt.hour
        
        return data
    
    def load(self, data: pd.DataFrame) -> bool:
        """변환된 데이터 적재"""
        try:
            # 데이터웨어하우스 테이블에 적재 (예시)
            table_name = "dwh_user_events"
            
            # 배치 삽입
            with transaction.atomic():
                for _, row in data.iterrows():
                    # 실제로는 bulk_create 사용
                    query = """
                        INSERT INTO {} (event_id, event_type, timestamp, user_id, user_segment, activity_score, metadata)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (event_id) DO UPDATE SET
                            activity_score = EXCLUDED.activity_score,
                            metadata = EXCLUDED.metadata
                    """.format(table_name)
                    
                    # 실제 구현시 실행
                    # cursor.execute(query, [...])
            
            # 마지막 처리 시점 업데이트
            self.redis_client.set(
                f"pipeline:{self.config.name}:last_processed",
                datetime.now().isoformat()
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Load failed: {str(e)}")
            return False
    
    def _determine_user_segment(self, row) -> str:
        """사용자 세그먼트 결정"""
        user_data = row.get('user_data', {})
        project_count = user_data.get('project_count', 0)
        feedback_count = user_data.get('feedback_count', 0)
        
        if project_count >= 10 and feedback_count >= 50:
            return "power_user"
        elif project_count >= 3 and feedback_count >= 10:
            return "active_user"
        elif project_count >= 1:
            return "regular_user"
        else:
            return "new_user"
    
    def _calculate_activity_score(self, row) -> float:
        """활동 점수 계산"""
        user_data = row.get('user_data', {})
        project_count = user_data.get('project_count', 0)
        feedback_count = user_data.get('feedback_count', 0)
        
        # 가중치 적용
        score = (project_count * 10) + (feedback_count * 2)
        return min(score, 100)  # 최대 100점


# === 프로젝트 분석 파이프라인 ===

class ProjectAnalyticsPipeline(BasePipeline):
    """프로젝트 분석 파이프라인"""
    
    def __init__(self):
        super().__init__(PipelineConfig(
            name="project_analytics_pipeline",
            slice_name="project_management",
            mode=ProcessingMode.BATCH,
            schedule="0 */6 * * *",  # 6시간마다
            slo_freshness_minutes=360,
            slo_completeness_percent=99.0
        ))
    
    def extract(self, **kwargs) -> pd.DataFrame:
        """프로젝트 데이터 추출"""
        query = """
            SELECT 
                p.id as project_id,
                p.name as project_name,
                p.created as created_at,
                p.updated as updated_at,
                p.user_id as owner_id,
                p.manager,
                p.consumer,
                bp.start_date as basic_plan_start,
                bp.end_date as basic_plan_end,
                vd.start_date as delivery_start,
                vd.end_date as delivery_end,
                COUNT(DISTINCT m.user_id) as member_count,
                COUNT(DISTINCT f.id) as file_count,
                COUNT(DISTINCT fc.id) as feedback_count
            FROM projects_project p
            LEFT JOIN projects_basicplan bp ON p.basic_plan_id = bp.id
            LEFT JOIN projects_videodelivery vd ON p.video_delivery_id = vd.id
            LEFT JOIN projects_members m ON p.id = m.project_id
            LEFT JOIN projects_file f ON p.id = f.project_id
            LEFT JOIN feedbacks_feedback fb ON p.feedback_id = fb.id
            LEFT JOIN feedbacks_feedbackcomment fc ON fb.id = fc.feedback_id
            GROUP BY p.id, bp.id, vd.id
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            data = cursor.fetchall()
        
        return pd.DataFrame(data, columns=columns)
    
    def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        """프로젝트 데이터 변환"""
        # 프로젝트 기간 계산
        data['project_duration_days'] = (
            pd.to_datetime(data['delivery_end']) - pd.to_datetime(data['basic_plan_start'])
        ).dt.days
        
        # 프로젝트 상태 추론
        data['project_status'] = data.apply(self._infer_project_status, axis=1)
        
        # 프로젝트 건강도 점수
        data['health_score'] = data.apply(self._calculate_health_score, axis=1)
        
        # 피드백 응답률
        data['feedback_response_rate'] = data['feedback_count'] / data['member_count'].clip(lower=1)
        
        return data
    
    def load(self, data: pd.DataFrame) -> bool:
        """프로젝트 분석 데이터 적재"""
        try:
            # 분석 테이블에 적재
            table_name = "analytics_project_metrics"
            
            # Redis에 캐싱 (대시보드용)
            for _, row in data.iterrows():
                cache_key = f"project:metrics:{row['project_id']}"
                self.redis_client.hset(cache_key, mapping={
                    "health_score": row['health_score'],
                    "duration_days": row['project_duration_days'],
                    "member_count": row['member_count'],
                    "feedback_response_rate": row['feedback_response_rate'],
                    "status": row['project_status'],
                    "updated_at": datetime.now().isoformat()
                })
                self.redis_client.expire(cache_key, 3600 * 24)  # 24시간 TTL
            
            return True
            
        except Exception as e:
            logger.error(f"Load failed: {str(e)}")
            return False
    
    def _infer_project_status(self, row) -> str:
        """프로젝트 상태 추론"""
        now = datetime.now()
        
        if pd.notna(row['delivery_end']) and pd.to_datetime(row['delivery_end']) < now:
            return "completed"
        elif pd.notna(row['delivery_start']) and pd.to_datetime(row['delivery_start']) <= now:
            return "in_delivery"
        elif pd.notna(row['basic_plan_start']) and pd.to_datetime(row['basic_plan_start']) <= now:
            return "in_progress"
        else:
            return "planning"
    
    def _calculate_health_score(self, row) -> float:
        """프로젝트 건강도 점수 계산"""
        score = 100.0
        
        # 멤버 수 체크
        if row['member_count'] < 2:
            score -= 20
        
        # 피드백 활성도
        if row['feedback_count'] == 0:
            score -= 30
        elif row['feedback_count'] < row['member_count']:
            score -= 10
        
        # 파일 업로드 여부
        if row['file_count'] == 0:
            score -= 20
        
        # 프로젝트 기간 체크
        if pd.notna(row['project_duration_days']):
            if row['project_duration_days'] > 180:  # 6개월 이상
                score -= 15
        
        return max(score, 0)


# === 실시간 협업 이벤트 스트리밍 파이프라인 ===

class CollaborationStreamingPipeline(BasePipeline):
    """실시간 협업 이벤트 처리 파이프라인"""
    
    def __init__(self):
        super().__init__(PipelineConfig(
            name="collaboration_streaming_pipeline",
            slice_name="realtime_collaboration",
            mode=ProcessingMode.STREAMING,
            slo_freshness_minutes=1,
            slo_completeness_percent=99.9
        ))
        self.buffer = []
        self.buffer_size = 100
        self.buffer_timeout = 10  # seconds
    
    def extract(self, **kwargs) -> pd.DataFrame:
        """실시간 이벤트 추출 (Redis Streams 사용)"""
        stream_key = "collaboration:events"
        last_id = kwargs.get('last_id', '0')
        
        # Redis Stream에서 이벤트 읽기
        events = self.redis_client.xread({stream_key: last_id}, count=self.buffer_size, block=self.buffer_timeout * 1000)
        
        if not events:
            return pd.DataFrame()
        
        parsed_events = []
        for stream_name, messages in events:
            for message_id, data in messages:
                parsed_events.append({
                    "message_id": message_id,
                    "timestamp": datetime.now(),
                    **data
                })
        
        return pd.DataFrame(parsed_events)
    
    def transform(self, data: pd.DataFrame) -> pd.DataFrame:
        """실시간 이벤트 변환"""
        if data.empty:
            return data
        
        # 세션별 집계
        data['session_id'] = data.get('session_id', 'unknown')
        
        # 이벤트 타입별 카운트
        event_counts = data.groupby(['session_id', 'event_type']).size().reset_index(name='count')
        
        # 세션 지속 시간 계산
        session_durations = data.groupby('session_id')['timestamp'].agg(['min', 'max'])
        session_durations['duration_seconds'] = (
            session_durations['max'] - session_durations['min']
        ).dt.total_seconds()
        
        # 결과 병합
        result = event_counts.merge(session_durations, on='session_id', how='left')
        
        return result
    
    def load(self, data: pd.DataFrame) -> bool:
        """실시간 데이터 적재"""
        if data.empty:
            return True
        
        try:
            # 실시간 메트릭 업데이트
            for _, row in data.iterrows():
                metric_key = f"realtime:collaboration:{row['session_id']}"
                self.redis_client.hincrby(metric_key, row['event_type'], int(row['count']))
                self.redis_client.hset(metric_key, "duration_seconds", row.get('duration_seconds', 0))
                self.redis_client.expire(metric_key, 3600)  # 1시간 TTL
            
            # 집계 데이터 저장 (시계열)
            ts_key = f"timeseries:collaboration:{datetime.now().strftime('%Y%m%d')}"
            self.redis_client.zadd(ts_key, {
                json.dumps(data.to_dict('records')): datetime.now().timestamp()
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Streaming load failed: {str(e)}")
            return False


# === 파이프라인 오케스트레이터 ===

class PipelineOrchestrator:
    """파이프라인 오케스트레이션 및 스케줄링"""
    
    def __init__(self):
        self.pipelines = {
            "user_events": UserEventPipeline(),
            "project_analytics": ProjectAnalyticsPipeline(),
            "collaboration_streaming": CollaborationStreamingPipeline()
        }
        self.executor = ThreadPoolExecutor(max_workers=5)
    
    def run_pipeline(self, pipeline_name: str, **kwargs) -> PipelineRun:
        """단일 파이프라인 실행"""
        if pipeline_name not in self.pipelines:
            raise ValueError(f"Pipeline {pipeline_name} not found")
        
        pipeline = self.pipelines[pipeline_name]
        return pipeline.run(**kwargs)
    
    def run_all_pipelines(self, parallel: bool = True) -> Dict[str, PipelineRun]:
        """모든 파이프라인 실행"""
        results = {}
        
        if parallel:
            futures = {}
            for name, pipeline in self.pipelines.items():
                future = self.executor.submit(pipeline.run)
                futures[future] = name
            
            for future in as_completed(futures):
                name = futures[future]
                try:
                    results[name] = future.result()
                except Exception as e:
                    logger.error(f"Pipeline {name} failed: {str(e)}")
                    results[name] = PipelineRun(
                        run_id="error",
                        pipeline_name=name,
                        status=PipelineStatus.FAILED,
                        started_at=datetime.now(),
                        error_message=str(e)
                    )
        else:
            for name, pipeline in self.pipelines.items():
                results[name] = pipeline.run()
        
        return results
    
    def get_pipeline_status(self, pipeline_name: str) -> Dict[str, Any]:
        """파이프라인 상태 조회"""
        if pipeline_name not in self.pipelines:
            raise ValueError(f"Pipeline {pipeline_name} not found")
        
        pipeline = self.pipelines[pipeline_name]
        redis_client = pipeline.redis_client
        
        # 최근 실행 이력 조회
        history_key = f"pipeline:history:{pipeline_name}"
        recent_runs = redis_client.lrange(history_key, 0, 9)
        
        runs = [json.loads(run) for run in recent_runs]
        
        # 통계 계산
        success_count = sum(1 for run in runs if run['status'] == 'success')
        fail_count = sum(1 for run in runs if run['status'] == 'failed')
        
        return {
            "pipeline_name": pipeline_name,
            "config": pipeline.config.__dict__,
            "recent_runs": runs,
            "statistics": {
                "total_runs": len(runs),
                "success_rate": success_count / len(runs) if runs else 0,
                "failure_rate": fail_count / len(runs) if runs else 0,
                "average_records_processed": sum(run.get('records_processed', 0) for run in runs) / len(runs) if runs else 0
            }
        }
    
    def monitor_slos(self) -> Dict[str, Dict[str, bool]]:
        """SLO 모니터링"""
        slo_status = {}
        
        for name, pipeline in self.pipelines.items():
            config = pipeline.config
            redis_client = pipeline.redis_client
            
            # 데이터 신선도 체크
            last_processed = redis_client.get(f"pipeline:{name}:last_processed")
            freshness_ok = True
            if last_processed:
                last_processed = datetime.fromisoformat(last_processed)
                staleness_minutes = (datetime.now() - last_processed).total_seconds() / 60
                freshness_ok = staleness_minutes <= config.slo_freshness_minutes
            
            # 완전성 체크 (최근 실행 기준)
            history_key = f"pipeline:history:{name}"
            recent_run = redis_client.lindex(history_key, 0)
            completeness_ok = True
            if recent_run:
                run_data = json.loads(recent_run)
                if run_data.get('records_processed', 0) > 0:
                    success_rate = 1 - (run_data.get('records_failed', 0) / run_data['records_processed'])
                    completeness_ok = success_rate * 100 >= config.slo_completeness_percent
            
            slo_status[name] = {
                "freshness": freshness_ok,
                "completeness": completeness_ok,
                "overall": freshness_ok and completeness_ok
            }
        
        return slo_status


# 사용 예시
if __name__ == "__main__":
    orchestrator = PipelineOrchestrator()
    
    # 모든 파이프라인 실행
    results = orchestrator.run_all_pipelines(parallel=True)
    
    for name, result in results.items():
        print(f"Pipeline: {name}")
        print(f"  Status: {result.status.value}")
        print(f"  Records: {result.records_processed}")
        if result.error_message:
            print(f"  Error: {result.error_message}")
    
    # SLO 모니터링
    slo_status = orchestrator.monitor_slos()
    print("\nSLO Status:")
    for name, status in slo_status.items():
        print(f"  {name}: {'✓' if status['overall'] else '✗'}")