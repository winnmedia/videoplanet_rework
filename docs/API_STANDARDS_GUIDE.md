# VRidge API 표준화 가이드

## 📋 목차
1. [API 설계 원칙](#1-api-설계-원칙)
2. [URL 구조 및 네이밍](#2-url-구조-및-네이밍)
3. [HTTP 메서드 사용](#3-http-메서드-사용)
4. [요청/응답 형식](#4-요청응답-형식)
5. [에러 처리](#5-에러-처리)
6. [인증 및 권한](#6-인증-및-권한)
7. [버저닝 전략](#7-버저닝-전략)
8. [API 문서화](#8-api-문서화)
9. [구현 예시](#9-구현-예시)

---

## 1. API 설계 원칙

### RESTful 원칙
- **리소스 기반**: URL은 리소스를 나타내며, 동작은 HTTP 메서드로 표현
- **무상태성**: 각 요청은 독립적이며 필요한 모든 정보를 포함
- **캐시 가능**: 응답은 캐시 가능 여부를 명시
- **계층적 구조**: 리소스 간 관계를 URL 구조로 표현
- **표준 HTTP 상태 코드 사용**: 의미에 맞는 상태 코드 반환

### API First 접근
- API 설계를 먼저 하고 구현
- OpenAPI 스펙으로 계약 정의
- Mock 서버로 프론트엔드 개발 지원
- 자동화된 테스트 및 문서 생성

---

## 2. URL 구조 및 네이밍

### URL 구조
```
https://api.vridge.kr/api/{version}/{resource}/{id}/{sub-resource}
```

### 네이밍 규칙
- **소문자 사용**: `/api/v1/projects` (O), `/api/v1/Projects` (X)
- **하이픈 사용**: `/api/v1/feedback-comments` (O), `/api/v1/feedback_comments` (X)
- **복수형 사용**: `/api/v1/users` (O), `/api/v1/user` (X)
- **동사 사용 금지**: `/api/v1/projects` (O), `/api/v1/get-projects` (X)

### URL 예시
```
GET    /api/v1/projects              # 프로젝트 목록
GET    /api/v1/projects/123          # 특정 프로젝트
POST   /api/v1/projects              # 프로젝트 생성
PUT    /api/v1/projects/123          # 프로젝트 전체 수정
PATCH  /api/v1/projects/123          # 프로젝트 부분 수정
DELETE /api/v1/projects/123          # 프로젝트 삭제

GET    /api/v1/projects/123/members  # 프로젝트 멤버 목록
POST   /api/v1/projects/123/members  # 멤버 추가
DELETE /api/v1/projects/123/members/456  # 멤버 제거
```

### 특수 액션 처리
```
POST   /api/v1/projects/123/archive  # 프로젝트 보관
POST   /api/v1/projects/123/restore  # 프로젝트 복원
POST   /api/v1/feedbacks/123/resolve # 피드백 해결
```

---

## 3. HTTP 메서드 사용

### 메서드별 용도
| 메서드 | 용도 | 멱등성 | 안전성 | 캐시 가능 |
|--------|------|--------|--------|-----------|
| GET    | 조회 | O | O | O |
| POST   | 생성 | X | X | X |
| PUT    | 전체 수정 | O | X | X |
| PATCH  | 부분 수정 | X | X | X |
| DELETE | 삭제 | O | X | X |
| HEAD   | 메타데이터 조회 | O | O | O |
| OPTIONS| 옵션 조회 | O | O | O |

### 올바른 사용 예시
```python
# GET: 리소스 조회 (필터링, 정렬, 페이지네이션)
GET /api/v1/projects?status=active&sort=-created_at&page=2&limit=20

# POST: 새 리소스 생성
POST /api/v1/projects
{
    "name": "새 프로젝트",
    "description": "설명"
}

# PUT: 전체 리소스 교체
PUT /api/v1/projects/123
{
    "name": "수정된 프로젝트",
    "description": "수정된 설명",
    "status": "active"
}

# PATCH: 부분 수정 (JSON Patch RFC 6902)
PATCH /api/v1/projects/123
[
    { "op": "replace", "path": "/status", "value": "completed" }
]

# DELETE: 리소스 삭제
DELETE /api/v1/projects/123
```

---

## 4. 요청/응답 형식

### 표준 응답 구조

#### 성공 응답
```json
{
    "success": true,
    "data": {
        "id": "123",
        "name": "프로젝트명",
        "created_at": "2024-01-20T10:00:00Z"
    },
    "meta": {
        "timestamp": "2024-01-20T10:00:00Z",
        "version": "1.0.0"
    }
}
```

#### 목록 응답 (페이지네이션)
```json
{
    "success": true,
    "data": [
        {
            "id": "123",
            "name": "프로젝트 1"
        }
    ],
    "pagination": {
        "page": 1,
        "limit": 20,
        "total_pages": 5,
        "total_items": 100,
        "has_next": true,
        "has_prev": false
    },
    "links": {
        "self": "/api/v1/projects?page=1&limit=20",
        "next": "/api/v1/projects?page=2&limit=20",
        "prev": null,
        "first": "/api/v1/projects?page=1&limit=20",
        "last": "/api/v1/projects?page=5&limit=20"
    }
}
```

#### 에러 응답
```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "입력값이 올바르지 않습니다.",
        "details": [
            {
                "field": "name",
                "message": "이름은 필수 입력 항목입니다."
            }
        ],
        "trace_id": "abc123def456"
    },
    "meta": {
        "timestamp": "2024-01-20T10:00:00Z"
    }
}
```

### 필드 네이밍
- **camelCase 사용**: `createdAt` (O), `created_at` (X)
- **ISO 8601 날짜 형식**: `2024-01-20T10:00:00Z`
- **불린값**: `true/false` (O), `"true"/"false"` (X)
- **null 허용**: 값이 없으면 `null`, 빈 문자열 사용 금지

### 필터링 및 정렬
```
# 필터링
GET /api/v1/projects?status=active&createdAfter=2024-01-01

# 정렬 (- 접두사는 내림차순)
GET /api/v1/projects?sort=-createdAt,name

# 필드 선택
GET /api/v1/projects?fields=id,name,status

# 관계 포함
GET /api/v1/projects?include=members,feedbacks
```

---

## 5. 에러 처리

### HTTP 상태 코드

#### 2xx 성공
- `200 OK`: 요청 성공
- `201 Created`: 리소스 생성 성공
- `202 Accepted`: 요청 접수 (비동기 처리)
- `204 No Content`: 성공했지만 응답 본문 없음

#### 4xx 클라이언트 에러
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 필요
- `403 Forbidden`: 권한 없음
- `404 Not Found`: 리소스 없음
- `409 Conflict`: 충돌 (중복 등)
- `422 Unprocessable Entity`: 유효성 검사 실패
- `429 Too Many Requests`: 요청 제한 초과

#### 5xx 서버 에러
- `500 Internal Server Error`: 서버 에러
- `502 Bad Gateway`: 게이트웨이 에러
- `503 Service Unavailable`: 서비스 이용 불가
- `504 Gateway Timeout`: 게이트웨이 타임아웃

### 에러 코드 체계
```python
# src/infrastructure/web/api/errors.py
from enum import Enum

class ErrorCode(Enum):
    # 인증/인가 (AUTH_*)
    AUTH_INVALID_CREDENTIALS = "AUTH_001"
    AUTH_TOKEN_EXPIRED = "AUTH_002"
    AUTH_INSUFFICIENT_PERMISSIONS = "AUTH_003"
    
    # 유효성 검사 (VAL_*)
    VAL_REQUIRED_FIELD = "VAL_001"
    VAL_INVALID_FORMAT = "VAL_002"
    VAL_OUT_OF_RANGE = "VAL_003"
    
    # 비즈니스 로직 (BIZ_*)
    BIZ_PROJECT_LIMIT_EXCEEDED = "BIZ_001"
    BIZ_MEMBER_ALREADY_EXISTS = "BIZ_002"
    BIZ_INVALID_STATE_TRANSITION = "BIZ_003"
    
    # 시스템 (SYS_*)
    SYS_DATABASE_ERROR = "SYS_001"
    SYS_EXTERNAL_SERVICE_ERROR = "SYS_002"
    SYS_RATE_LIMIT_EXCEEDED = "SYS_003"
```

### 에러 응답 예시
```json
{
    "success": false,
    "error": {
        "code": "VAL_002",
        "message": "이메일 형식이 올바르지 않습니다.",
        "field": "email",
        "value": "invalid-email",
        "suggestion": "올바른 이메일 형식: user@example.com"
    }
}
```

---

## 6. 인증 및 권한

### JWT 토큰 기반 인증
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 토큰 구조
```json
{
    "header": {
        "alg": "HS256",
        "typ": "JWT"
    },
    "payload": {
        "sub": "user-123",
        "email": "user@example.com",
        "role": "editor",
        "permissions": ["read", "write"],
        "iat": 1642339200,
        "exp": 1642425600
    }
}
```

### 인증 플로우
```python
# 1. 로그인
POST /api/v1/auth/login
{
    "email": "user@example.com",
    "password": "password123"
}

# 응답
{
    "success": true,
    "data": {
        "accessToken": "eyJhbGciOiJIUzI1NiIs...",
        "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
        "expiresIn": 3600,
        "tokenType": "Bearer"
    }
}

# 2. 토큰 갱신
POST /api/v1/auth/refresh
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}

# 3. 로그아웃
POST /api/v1/auth/logout
{
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 권한 체크
```python
# src/infrastructure/web/api/permissions.py
from rest_framework import permissions

class IsProjectOwner(permissions.BasePermission):
    """프로젝트 소유자 권한"""
    
    def has_object_permission(self, request, view, obj):
        return obj.owner == request.user

class IsProjectMember(permissions.BasePermission):
    """프로젝트 멤버 권한"""
    
    def has_object_permission(self, request, view, obj):
        return obj.members.filter(user=request.user).exists()

class HasProjectPermission(permissions.BasePermission):
    """프로젝트 권한 체크"""
    
    def has_object_permission(self, request, view, obj):
        member = obj.members.filter(user=request.user).first()
        if not member:
            return False
        
        permission_map = {
            'GET': 'read',
            'POST': 'write',
            'PUT': 'write',
            'PATCH': 'write',
            'DELETE': 'delete'
        }
        
        required_permission = permission_map.get(request.method)
        return required_permission in member.permissions
```

---

## 7. 버저닝 전략

### URL 버저닝 (권장)
```
/api/v1/projects
/api/v2/projects
```

### 버전 관리 원칙
1. **하위 호환성 유지**: 최소 6개월간 이전 버전 지원
2. **Deprecation 공지**: 3개월 전 사전 공지
3. **버전별 문서**: 각 버전별 별도 문서 제공
4. **Sunset 헤더**: 종료 예정일 명시

```http
Sunset: Sat, 31 Dec 2024 23:59:59 GMT
Deprecation: true
Link: </api/v2/projects>; rel="successor-version"
```

### 버전 간 마이그레이션
```python
# src/infrastructure/web/api/versioning.py
from rest_framework.versioning import URLPathVersioning

class APIVersioning(URLPathVersioning):
    default_version = 'v1'
    allowed_versions = ['v1', 'v2']
    version_param = 'version'
    
    def determine_version(self, request, *args, **kwargs):
        version = super().determine_version(request, *args, **kwargs)
        
        # v1은 2024년 12월 31일에 종료
        if version == 'v1':
            request.META['HTTP_SUNSET'] = 'Sat, 31 Dec 2024 23:59:59 GMT'
            request.META['HTTP_DEPRECATION'] = 'true'
        
        return version
```

---

## 8. API 문서화

### OpenAPI 3.0 스펙
```yaml
openapi: 3.0.3
info:
  title: VRidge API
  description: Video Production Project Management API
  version: 1.0.0
  contact:
    email: api@vridge.kr
  license:
    name: MIT
    
servers:
  - url: https://api.vridge.kr/api/v1
    description: Production server
  - url: https://staging-api.vridge.kr/api/v1
    description: Staging server
    
paths:
  /projects:
    get:
      summary: List projects
      operationId: listProjects
      tags:
        - Projects
      parameters:
        - name: status
          in: query
          schema:
            type: string
            enum: [draft, active, completed]
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ProjectList'
        '401':
          $ref: '#/components/responses/Unauthorized'
```

### DRF Spectacular 설정
```python
# config/settings/base.py
SPECTACULAR_SETTINGS = {
    'TITLE': 'VRidge API',
    'DESCRIPTION': 'Video Production Project Management API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SCHEMA_PATH_PREFIX': '/api/v[0-9]',
    'COMPONENT_SPLIT_REQUEST': True,
    'ENUM_NAME_OVERRIDES': {
        'ProjectStatus': 'projects.models.ProjectStatus',
    },
}

# src/infrastructure/web/api/views.py
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class ProjectViewSet(viewsets.ModelViewSet):
    @extend_schema(
        summary="Create a new project",
        description="Creates a new project with the provided details",
        request=ProjectCreateSerializer,
        responses={
            201: ProjectSerializer,
            400: ErrorSerializer,
            401: ErrorSerializer,
        },
        examples=[
            OpenApiExample(
                'Valid example',
                value={
                    'name': 'New Project',
                    'description': 'Project description',
                    'clientName': 'Client Corp'
                }
            )
        ]
    )
    def create(self, request):
        pass
```

---

## 9. 구현 예시

### ViewSet 구현
```python
# src/infrastructure/web/api/v1/projects/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from src.application.projects.services import ProjectService

@extend_schema(tags=['Projects'])
class ProjectViewSet(viewsets.ModelViewSet):
    """
    프로젝트 관리 API
    """
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'createdAt']
    search_fields = ['name', 'description']
    ordering_fields = ['createdAt', 'updatedAt']
    ordering = ['-createdAt']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.project_service = ProjectService()
    
    def get_queryset(self):
        """사용자가 접근 가능한 프로젝트만 반환"""
        return self.project_service.get_user_projects(
            user_id=self.request.user.id
        )
    
    @extend_schema(
        summary="List all projects",
        description="Returns a paginated list of projects the user has access to",
        parameters=[
            OpenApiParameter(
                name='status',
                type=str,
                enum=['draft', 'active', 'completed'],
                description='Filter by project status'
            ),
        ]
    )
    def list(self, request):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    @extend_schema(
        summary="Create a new project",
        request=ProjectCreateSerializer,
        responses={
            201: ProjectSerializer,
            400: ErrorSerializer
        }
    )
    def create(self, request):
        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            project = self.project_service.create_project(
                user_id=request.user.id,
                **serializer.validated_data
            )
            
            return Response(
                {
                    'success': True,
                    'data': ProjectSerializer(project).data
                },
                status=status.HTTP_201_CREATED
            )
        except ValueError as e:
            return Response(
                {
                    'success': False,
                    'error': {
                        'code': 'VALIDATION_ERROR',
                        'message': str(e)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @extend_schema(
        summary="Add a member to the project",
        request=AddMemberSerializer,
        responses={
            200: ProjectSerializer,
            404: ErrorSerializer
        }
    )
    @action(detail=True, methods=['post'], url_path='members')
    def add_member(self, request, pk=None):
        project = self.get_object()
        serializer = AddMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.project_service.add_member(
                project_id=project.id,
                **serializer.validated_data
            )
            
            project.refresh_from_db()
            return Response({
                'success': True,
                'data': ProjectSerializer(project).data
            })
        except ValueError as e:
            return Response(
                {
                    'success': False,
                    'error': {
                        'code': 'BIZ_ERROR',
                        'message': str(e)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
```

### Serializer 구현
```python
# src/infrastructure/web/api/v1/projects/serializers.py
from rest_framework import serializers
from src.domain.projects.entities import Project

class ProjectSerializer(serializers.ModelSerializer):
    """프로젝트 시리얼라이저"""
    
    id = serializers.CharField(read_only=True)
    name = serializers.CharField(max_length=255)
    description = serializers.CharField()
    clientName = serializers.CharField(source='client_name')
    status = serializers.ChoiceField(choices=['draft', 'active', 'completed'])
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    memberCount = serializers.IntegerField(source='members.count', read_only=True)
    completionRate = serializers.FloatField(read_only=True)
    
    class Meta:
        model = Project
        fields = [
            'id', 'name', 'description', 'clientName', 'status',
            'createdAt', 'updatedAt', 'memberCount', 'completionRate'
        ]
    
    def validate_name(self, value):
        """프로젝트 이름 검증"""
        if len(value) < 3:
            raise serializers.ValidationError(
                "프로젝트 이름은 최소 3자 이상이어야 합니다."
            )
        return value

class ProjectCreateSerializer(serializers.Serializer):
    """프로젝트 생성 시리얼라이저"""
    
    name = serializers.CharField(max_length=255)
    description = serializers.CharField()
    clientName = serializers.CharField(source='client_name')
    phases = serializers.ListField(
        child=serializers.DictField(),
        min_length=1
    )
    deadline = serializers.DateTimeField(required=False)
    
    def validate_phases(self, value):
        """단계 검증"""
        required_fields = ['name']
        for phase in value:
            for field in required_fields:
                if field not in phase:
                    raise serializers.ValidationError(
                        f"각 단계는 {field} 필드를 포함해야 합니다."
                    )
        return value

class AddMemberSerializer(serializers.Serializer):
    """멤버 추가 시리얼라이저"""
    
    email = serializers.EmailField()
    role = serializers.ChoiceField(
        choices=['viewer', 'editor', 'manager'],
        default='viewer'
    )
```

### 미들웨어 구현
```python
# src/infrastructure/web/api/middleware.py
import time
import json
import logging
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse

logger = logging.getLogger(__name__)

class APILoggingMiddleware(MiddlewareMixin):
    """API 요청/응답 로깅 미들웨어"""
    
    def process_request(self, request):
        request.start_time = time.time()
        
        # 요청 로깅
        logger.info(
            f"API Request: {request.method} {request.path}",
            extra={
                'method': request.method,
                'path': request.path,
                'user': getattr(request.user, 'id', 'anonymous'),
                'ip': self.get_client_ip(request),
                'user_agent': request.META.get('HTTP_USER_AGENT', '')
            }
        )
        
        return None
    
    def process_response(self, request, response):
        # 응답 시간 계산
        if hasattr(request, 'start_time'):
            duration = time.time() - request.start_time
            response['X-Response-Time'] = f"{duration:.3f}s"
            
            # 응답 로깅
            logger.info(
                f"API Response: {response.status_code}",
                extra={
                    'status_code': response.status_code,
                    'duration': duration,
                    'path': request.path
                }
            )
        
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class RateLimitMiddleware(MiddlewareMixin):
    """API Rate Limiting 미들웨어"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.cache = {}  # 실제로는 Redis 사용
    
    def process_request(self, request):
        if not request.path.startswith('/api/'):
            return None
        
        # 인증된 사용자 체크
        if request.user.is_authenticated:
            key = f"rate_limit:{request.user.id}"
            limit = 1000  # 인증된 사용자: 시간당 1000 요청
        else:
            key = f"rate_limit:{self.get_client_ip(request)}"
            limit = 100  # 미인증 사용자: 시간당 100 요청
        
        # Rate limit 체크 (간단한 구현)
        current_count = self.cache.get(key, 0)
        if current_count >= limit:
            return JsonResponse(
                {
                    'success': False,
                    'error': {
                        'code': 'RATE_LIMIT_EXCEEDED',
                        'message': 'Too many requests. Please try again later.'
                    }
                },
                status=429
            )
        
        self.cache[key] = current_count + 1
        return None
```

### 테스트 구현
```python
# tests/integration/api/test_projects.py
import pytest
from rest_framework import status
from rest_framework.test import APIClient
from src.domain.projects.entities import Project

@pytest.mark.django_db
class TestProjectAPI:
    """프로젝트 API 통합 테스트"""
    
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_create_project(self):
        """프로젝트 생성 테스트"""
        # Given
        data = {
            'name': '테스트 프로젝트',
            'description': '프로젝트 설명',
            'clientName': '테스트 클라이언트',
            'phases': [
                {'name': '기획'},
                {'name': '제작'}
            ]
        }
        
        # When
        response = self.client.post('/api/v1/projects/', data, format='json')
        
        # Then
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['success'] is True
        assert response.data['data']['name'] == '테스트 프로젝트'
    
    def test_list_projects(self):
        """프로젝트 목록 조회 테스트"""
        # Given
        Project.objects.create(
            name='프로젝트 1',
            owner=self.user
        )
        Project.objects.create(
            name='프로젝트 2',
            owner=self.user
        )
        
        # When
        response = self.client.get('/api/v1/projects/')
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert len(response.data['data']) == 2
    
    def test_add_member_to_project(self):
        """프로젝트 멤버 추가 테스트"""
        # Given
        project = Project.objects.create(
            name='테스트 프로젝트',
            owner=self.user
        )
        new_user = User.objects.create_user(
            email='member@example.com'
        )
        
        # When
        response = self.client.post(
            f'/api/v1/projects/{project.id}/members/',
            {'email': 'member@example.com', 'role': 'editor'},
            format='json'
        )
        
        # Then
        assert response.status_code == status.HTTP_200_OK
        assert response.data['success'] is True
        assert response.data['data']['memberCount'] == 2
    
    def test_unauthorized_access(self):
        """인증되지 않은 접근 테스트"""
        # Given
        self.client.force_authenticate(user=None)
        
        # When
        response = self.client.get('/api/v1/projects/')
        
        # Then
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_rate_limiting(self):
        """Rate Limiting 테스트"""
        # Given
        self.client.force_authenticate(user=None)
        
        # When - 100번 이상 요청
        for i in range(101):
            response = self.client.get('/api/v1/projects/')
        
        # Then
        assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
        assert response.data['error']['code'] == 'RATE_LIMIT_EXCEEDED'
```

---

## 마무리

이 API 표준화 가이드를 따르면:

1. **일관성**: 모든 API가 동일한 패턴 따름
2. **예측 가능성**: 개발자가 API 동작 예측 가능
3. **유지보수성**: 표준화된 구조로 유지보수 용이
4. **확장성**: 새 버전 추가 및 기능 확장 용이
5. **문서화**: 자동화된 문서 생성 가능

모든 개발자는 이 가이드를 준수하여 API를 개발해야 합니다.