"""
VLANET 표준 API 응답 포맷터
일관된 API 응답 구조를 제공하는 유틸리티
"""

import logging
from typing import Dict, Any, Optional, Union
from django.http import JsonResponse
from django.conf import settings
from .exceptions import VLANETException, ErrorCodes, ErrorMessages

logger = logging.getLogger(__name__)


class APIResponse:
    """표준 API 응답 클래스"""
    
    @staticmethod
    def success(
        data: Any = None,
        message: str = ErrorMessages.SUCCESS,
        status_code: int = 200,
        meta: Dict[str, Any] = None
    ) -> JsonResponse:
        """성공 응답 생성"""
        response_data = {
            "success": True,
            "message": message,
            "data": data,
        }
        
        if meta:
            response_data["meta"] = meta
            
        return JsonResponse(response_data, status=status_code)
    
    @staticmethod
    def error(
        message: str = ErrorMessages.UNKNOWN_ERROR,
        status_code: int = 500,
        error_code: str = ErrorCodes.DATABASE_ERROR,
        details: Dict[str, Any] = None,
        exception: Exception = None
    ) -> JsonResponse:
        """에러 응답 생성"""
        response_data = {
            "success": False,
            "message": message,
            "error_code": error_code,
        }
        
        # 디버그 모드에서만 상세 정보 포함
        if settings.DEBUG and details:
            response_data["details"] = details
        
        # 예외 로깅
        if exception:
            logger.error(
                f"API Error: {error_code} - {message}",
                exc_info=True,
                extra={
                    "error_code": error_code,
                    "status_code": status_code,
                    "details": details or {}
                }
            )
        else:
            logger.warning(
                f"API Error: {error_code} - {message}",
                extra={
                    "error_code": error_code,
                    "status_code": status_code
                }
            )
        
        return JsonResponse(response_data, status=status_code)
    
    @staticmethod
    def from_exception(exception: VLANETException) -> JsonResponse:
        """VLANET 예외로부터 응답 생성"""
        return APIResponse.error(
            message=exception.message,
            status_code=exception.status_code,
            error_code=exception.error_code,
            details=exception.details,
            exception=exception
        )


class CompatibilityResponse:
    """기존 코드와의 호환성을 위한 응답 헬퍼"""
    
    @staticmethod
    def user_not_found() -> JsonResponse:
        """사용자를 찾을 수 없음 (기존 형식 유지)"""
        return JsonResponse(
            {"message": ErrorMessages.USER_NOT_FOUND}, 
            status=500  # 기존 코드와 일치
        )
    
    @staticmethod
    def user_already_exists() -> JsonResponse:
        """이미 존재하는 사용자 (기존 형식 유지)"""
        return JsonResponse(
            {"message": ErrorMessages.USER_ALREADY_EXISTS}, 
            status=500  # 기존 코드와 일치
        )
    
    @staticmethod
    def login_method_mismatch() -> JsonResponse:
        """로그인 방식 불일치 (기존 형식 유지)"""
        return JsonResponse(
            {"message": ErrorMessages.LOGIN_METHOD_MISMATCH}, 
            status=500  # 기존 코드와 일치
        )
    
    @staticmethod
    def social_email_required(provider: str) -> JsonResponse:
        """소셜 로그인 이메일 필수"""
        message_map = {
            "kakao": ErrorMessages.KAKAO_EMAIL_REQUIRED,
            "naver": ErrorMessages.NAVER_EMAIL_REQUIRED,
            "google": ErrorMessages.GOOGLE_EMAIL_REQUIRED,
        }
        message = message_map.get(provider, ErrorMessages.UNKNOWN_ERROR)
        return JsonResponse({"message": message}, status=500)
    
    @staticmethod
    def email_verification_failed() -> JsonResponse:
        """이메일 인증 실패"""
        return JsonResponse(
            {"message": ErrorMessages.EMAIL_VERIFICATION_FAILED}, 
            status=500
        )
    
    @staticmethod
    def email_verification_mismatch() -> JsonResponse:
        """인증번호 불일치"""
        return JsonResponse(
            {"message": ErrorMessages.EMAIL_VERIFICATION_MISMATCH}, 
            status=404  # 기존 코드와 일치
        )
    
    @staticmethod
    def invalid_request() -> JsonResponse:
        """잘못된 요청"""
        return JsonResponse(
            {"message": ErrorMessages.INVALID_REQUEST}, 
            status=500
        )
    
    @staticmethod
    def no_permission() -> JsonResponse:
        """권한 없음"""
        return JsonResponse(
            {"message": ErrorMessages.NO_PERMISSION}, 
            status=500
        )
    
    @staticmethod
    def unknown_error() -> JsonResponse:
        """알 수 없는 에러"""
        return JsonResponse(
            {"message": ErrorMessages.UNKNOWN_ERROR}, 
            status=500
        )
    
    @staticmethod
    def success_with_data(data: Dict[str, Any], status_code: int = 201) -> JsonResponse:
        """성공 응답 (기존 형식 유지)"""
        return JsonResponse(data, status=status_code)


def safe_error_response(exception: Exception = None, custom_message: str = None) -> JsonResponse:
    """안전한 에러 응답 생성 (기존 try-except 블록 대체용)"""
    if isinstance(exception, VLANETException):
        return APIResponse.from_exception(exception)
    
    # 알 수 없는 예외의 경우
    message = custom_message or ErrorMessages.UNKNOWN_ERROR
    
    # 로깅
    if exception:
        logger.error(f"Unhandled exception: {str(exception)}", exc_info=True)
    
    return JsonResponse({"message": message}, status=500)