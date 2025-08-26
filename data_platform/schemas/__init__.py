"""
데이터 스키마 레지스트리 및 버전 관리 시스템

Schema-First Development 원칙:
1. 모든 이벤트는 버전화된 스키마를 가짐
2. 백워드 호환성 보장
3. 스키마 진화는 마이너 버전 업데이트
4. Breaking changes는 메이저 버전 업데이트
"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import json
from pathlib import Path


class SchemaVersion:
    """스키마 버전 관리"""
    def __init__(self, major: int, minor: int, patch: int):
        self.major = major
        self.minor = minor
        self.patch = patch
    
    def __str__(self):
        return f"v{self.major}.{self.minor}.{self.patch}"
    
    def is_compatible_with(self, other: 'SchemaVersion') -> bool:
        """백워드 호환성 체크"""
        return self.major == other.major and self.minor >= other.minor


class EventType(Enum):
    """이벤트 타입 정의"""
    # User Events
    USER_REGISTERED = "user.registered"
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    USER_PROFILE_UPDATED = "user.profile.updated"
    
    # Project Events
    PROJECT_CREATED = "project.created"
    PROJECT_UPDATED = "project.updated"
    PROJECT_MEMBER_ADDED = "project.member.added"
    PROJECT_MEMBER_REMOVED = "project.member.removed"
    PROJECT_PHASE_CHANGED = "project.phase.changed"
    PROJECT_FILE_UPLOADED = "project.file.uploaded"
    
    # Feedback Events
    FEEDBACK_CREATED = "feedback.created"
    FEEDBACK_COMMENT_ADDED = "feedback.comment.added"
    FEEDBACK_MESSAGE_SENT = "feedback.message.sent"
    FEEDBACK_STATUS_CHANGED = "feedback.status.changed"
    
    # Collaboration Events
    COLLABORATION_SESSION_STARTED = "collaboration.session.started"
    COLLABORATION_SESSION_ENDED = "collaboration.session.ended"
    COLLABORATION_USER_JOINED = "collaboration.user.joined"
    COLLABORATION_USER_LEFT = "collaboration.user.left"
    
    # System Events
    API_REQUEST = "system.api.request"
    API_ERROR = "system.api.error"
    BACKGROUND_JOB_STARTED = "system.job.started"
    BACKGROUND_JOB_COMPLETED = "system.job.completed"
    BACKGROUND_JOB_FAILED = "system.job.failed"


@dataclass
class BaseEventSchema:
    """기본 이벤트 스키마"""
    event_id: str
    event_type: EventType
    event_version: str
    timestamp: datetime
    user_id: Optional[str]
    session_id: Optional[str]
    correlation_id: Optional[str]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """이벤트를 딕셔너리로 변환"""
        return {
            "event_id": self.event_id,
            "event_type": self.event_type.value,
            "event_version": self.event_version,
            "timestamp": self.timestamp.isoformat(),
            "user_id": self.user_id,
            "session_id": self.session_id,
            "correlation_id": self.correlation_id,
            "metadata": self.metadata
        }
    
    def validate(self) -> List[str]:
        """스키마 유효성 검증"""
        errors = []
        if not self.event_id:
            errors.append("event_id is required")
        if not self.event_type:
            errors.append("event_type is required")
        if not self.timestamp:
            errors.append("timestamp is required")
        return errors


@dataclass
class UserEventSchema(BaseEventSchema):
    """사용자 이벤트 스키마 v1.0.0"""
    user_data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        self.event_version = "v1.0.0"
        
    def validate(self) -> List[str]:
        errors = super().validate()
        if self.event_type.value.startswith("user.") and not self.user_id:
            errors.append("user_id is required for user events")
        return errors


@dataclass 
class ProjectEventSchema(BaseEventSchema):
    """프로젝트 이벤트 스키마 v1.0.0"""
    project_id: str
    project_data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        self.event_version = "v1.0.0"
        
    def validate(self) -> List[str]:
        errors = super().validate()
        if not self.project_id:
            errors.append("project_id is required for project events")
        return errors


@dataclass
class FeedbackEventSchema(BaseEventSchema):
    """피드백 이벤트 스키마 v1.0.0"""
    feedback_id: str
    project_id: str
    feedback_data: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self):
        self.event_version = "v1.0.0"
        
    def validate(self) -> List[str]:
        errors = super().validate()
        if not self.feedback_id:
            errors.append("feedback_id is required for feedback events")
        if not self.project_id:
            errors.append("project_id is required for feedback events")
        return errors


@dataclass
class CollaborationEventSchema(BaseEventSchema):
    """협업 이벤트 스키마 v1.0.0"""
    session_data: Dict[str, Any] = field(default_factory=dict)
    participants: List[str] = field(default_factory=list)
    
    def __post_init__(self):
        self.event_version = "v1.0.0"


class SchemaRegistry:
    """스키마 레지스트리 - 중앙 스키마 관리"""
    
    def __init__(self):
        self.schemas: Dict[str, Dict[str, Any]] = {}
        self.schema_versions: Dict[str, List[SchemaVersion]] = {}
        
    def register_schema(self, event_type: EventType, schema_class: type, version: SchemaVersion):
        """스키마 등록"""
        key = f"{event_type.value}:{version}"
        self.schemas[key] = {
            "event_type": event_type,
            "schema_class": schema_class,
            "version": version,
            "registered_at": datetime.now()
        }
        
        # 버전 히스토리 관리
        if event_type.value not in self.schema_versions:
            self.schema_versions[event_type.value] = []
        self.schema_versions[event_type.value].append(version)
        
    def get_schema(self, event_type: EventType, version: Optional[SchemaVersion] = None):
        """스키마 조회"""
        if version:
            key = f"{event_type.value}:{version}"
            return self.schemas.get(key)
        else:
            # 최신 버전 반환
            versions = self.schema_versions.get(event_type.value, [])
            if versions:
                latest_version = max(versions, key=lambda v: (v.major, v.minor, v.patch))
                key = f"{event_type.value}:{latest_version}"
                return self.schemas.get(key)
        return None
    
    def validate_compatibility(self, event_type: EventType, from_version: SchemaVersion, to_version: SchemaVersion) -> bool:
        """스키마 호환성 검증"""
        return to_version.is_compatible_with(from_version)
    
    def export_schemas(self, output_dir: Path):
        """스키마를 JSON으로 내보내기"""
        output_dir.mkdir(parents=True, exist_ok=True)
        
        for event_type_value, versions in self.schema_versions.items():
            schema_file = output_dir / f"{event_type_value.replace('.', '_')}_schemas.json"
            schemas_data = []
            
            for version in versions:
                key = f"{event_type_value}:{version}"
                schema_info = self.schemas.get(key)
                if schema_info:
                    schemas_data.append({
                        "event_type": event_type_value,
                        "version": str(version),
                        "schema_class": schema_info["schema_class"].__name__,
                        "registered_at": schema_info["registered_at"].isoformat()
                    })
            
            with open(schema_file, 'w') as f:
                json.dump(schemas_data, f, indent=2)


# 글로벌 레지스트리 인스턴스
registry = SchemaRegistry()

# 초기 스키마 등록
def initialize_schemas():
    """초기 스키마 등록"""
    # User Events
    for event_type in [EventType.USER_REGISTERED, EventType.USER_LOGIN, EventType.USER_LOGOUT, EventType.USER_PROFILE_UPDATED]:
        registry.register_schema(event_type, UserEventSchema, SchemaVersion(1, 0, 0))
    
    # Project Events  
    for event_type in [EventType.PROJECT_CREATED, EventType.PROJECT_UPDATED, EventType.PROJECT_MEMBER_ADDED, 
                      EventType.PROJECT_MEMBER_REMOVED, EventType.PROJECT_PHASE_CHANGED, EventType.PROJECT_FILE_UPLOADED]:
        registry.register_schema(event_type, ProjectEventSchema, SchemaVersion(1, 0, 0))
    
    # Feedback Events
    for event_type in [EventType.FEEDBACK_CREATED, EventType.FEEDBACK_COMMENT_ADDED, 
                      EventType.FEEDBACK_MESSAGE_SENT, EventType.FEEDBACK_STATUS_CHANGED]:
        registry.register_schema(event_type, FeedbackEventSchema, SchemaVersion(1, 0, 0))
    
    # Collaboration Events
    for event_type in [EventType.COLLABORATION_SESSION_STARTED, EventType.COLLABORATION_SESSION_ENDED,
                      EventType.COLLABORATION_USER_JOINED, EventType.COLLABORATION_USER_LEFT]:
        registry.register_schema(event_type, CollaborationEventSchema, SchemaVersion(1, 0, 0))


# 초기화
initialize_schemas()