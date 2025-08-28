"""
VLANET 전역 예외 처리 미들웨어
선택적 활성화 가능한 안전한 예외 처리
"""

import logging
from django.http import JsonResponse
from django.conf import settings
from django.utils.deprecation import MiddlewareMixin
from .exceptions import VLANETException
from .responses import APIResponse, safe_error_response

logger = logging.getLogger(__name__)


class SafeExceptionMiddleware(MiddlewareMixin):
    """
    전역 예외 처리 미들웨어 (선택적 활성화)
    
    설정 방법:
    settings.py에 VLANET_SAFE_EXCEPTION_HANDLING = True 추가 시에만 작동
    """
    
    def process_exception(self, request, exception):
        """예외 발생 시 안전한 응답 반환"""
        
        # 설정으로 비활성화 가능
        if not getattr(settings, 'VLANET_SAFE_EXCEPTION_HANDLING', False):
            return None  # Django 기본 처리로 넘김
        
        # API 요청인지 확인 (JSON 응답 대상)
        if not self._is_api_request(request):
            return None  # HTML 응답은 Django 기본 처리
        
        # VLANET 예외는 적절한 응답으로 변환
        if isinstance(exception, VLANETException):
            response = APIResponse.from_exception(exception)
            logger.info(
                f"VLANET Exception handled: {exception.error_code}",
                extra={
                    'request_path': request.path,
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'remote_addr': self._get_client_ip(request)
                }
            )
            return response
        
        # 기타 예외는 안전한 일반 에러로 처리
        logger.error(
            f"Unhandled exception in middleware: {str(exception)}",
            exc_info=True,
            extra={
                'request_path': request.path,
                'request_method': request.method,
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'remote_addr': self._get_client_ip(request)
            }
        )
        
        return safe_error_response(exception)
    
    def _is_api_request(self, request):
        """API 요청인지 판단"""
        # JSON을 요청하거나 API 경로인 경우
        accept_header = request.META.get('HTTP_ACCEPT', '')
        content_type = request.META.get('CONTENT_TYPE', '')
        path = request.path
        
        return (
            'application/json' in accept_header or
            'application/json' in content_type or
            path.startswith('/api/') or
            path.startswith('/users/') or
            path.startswith('/projects/') or
            path.startswith('/feedbacks/')
        )
    
    def _get_client_ip(self, request):
        """클라이언트 IP 추출"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    요청 로깅 미들웨어 (선택적 활성화)
    
    설정 방법:
    settings.py에 VLANET_REQUEST_LOGGING = True 추가 시에만 작동
    """
    
    def process_request(self, request):
        """요청 시작 시 로깅"""
        
        if not getattr(settings, 'VLANET_REQUEST_LOGGING', False):
            return None
        
        # DEBUG 모드에서만 상세 로깅
        if settings.DEBUG:
            logger.debug(
                f"Request: {request.method} {request.path}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                    'remote_addr': self._get_client_ip(request),
                    'content_type': request.META.get('CONTENT_TYPE', ''),
                }
            )
        
        return None
    
    def process_response(self, request, response):
        """응답 시 로깅"""
        
        if not getattr(settings, 'VLANET_REQUEST_LOGGING', False):
            return response
        
        # 에러 응답만 로깅 (프로덕션에서 노이즈 감소)
        if response.status_code >= 400:
            logger.warning(
                f"Response: {request.method} {request.path} - {response.status_code}",
                extra={
                    'method': request.method,
                    'path': request.path,
                    'status_code': response.status_code,
                    'remote_addr': self._get_client_ip(request),
                }
            )
        
        return response
    
    def _get_client_ip(self, request):
        """클라이언트 IP 추출"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


# 미들웨어 활성화 헬퍼 함수
def get_safe_middleware_classes():
    """
    안전한 미들웨어 클래스들을 반환
    설정에 따라 조건부 활성화
    """
    middleware_classes = []
    
    if getattr(settings, 'VLANET_REQUEST_LOGGING', False):
        middleware_classes.append('core.middleware.RequestLoggingMiddleware')
    
    if getattr(settings, 'VLANET_SAFE_EXCEPTION_HANDLING', False):
        middleware_classes.append('core.middleware.SafeExceptionMiddleware')
    
    return middleware_classes