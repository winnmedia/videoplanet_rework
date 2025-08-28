"""
VLANET 표준 예외 클래스 정의
안전한 에러 핸들링을 위한 기반 구조
"""

from typing import Dict, Any, Optional
from django.utils.translation import gettext_lazy as _


class VLANETException(Exception):
    """VLANET 기본 예외 클래스"""
    
    default_message = _("서비스 처리 중 오류가 발생했습니다.")
    default_status_code = 500
    error_code = "UNKNOWN_ERROR"
    
    def __init__(
        self, 
        message: str = None, 
        status_code: int = None, 
        error_code: str = None,
        details: Dict[str, Any] = None
    ):
        self.message = message or str(self.default_message)
        self.status_code = status_code or self.default_status_code
        self.error_code = error_code or self.error_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(VLANETException):
    """입력값 검증 실패"""
    default_message = _("입력값이 올바르지 않습니다.")
    default_status_code = 400
    error_code = "VALIDATION_ERROR"


class AuthenticationException(VLANETException):
    """인증 실패"""
    default_message = _("인증이 필요합니다.")
    default_status_code = 401
    error_code = "AUTHENTICATION_ERROR"


class PermissionException(VLANETException):
    """권한 부족"""
    default_message = _("접근 권한이 없습니다.")
    default_status_code = 403
    error_code = "PERMISSION_ERROR"


class NotFoundException(VLANETException):
    """리소스를 찾을 수 없음"""
    default_message = _("요청하신 자료를 찾을 수 없습니다.")
    default_status_code = 404
    error_code = "NOT_FOUND_ERROR"


class BusinessLogicException(VLANETException):
    """비즈니스 로직 위반"""
    default_message = _("요청을 처리할 수 없습니다.")
    default_status_code = 422
    error_code = "BUSINESS_LOGIC_ERROR"


class ExternalServiceException(VLANETException):
    """외부 서비스 오류"""
    default_message = _("외부 서비스 연동 중 오류가 발생했습니다.")
    default_status_code = 502
    error_code = "EXTERNAL_SERVICE_ERROR"


class RateLimitException(VLANETException):
    """요청 한도 초과"""
    default_message = _("요청 한도를 초과했습니다.")
    default_status_code = 429
    error_code = "RATE_LIMIT_ERROR"


# 에러 상수 정의
class ErrorCodes:
    """표준 에러 코드 정의"""
    
    # 인증 관련
    USER_NOT_FOUND = "USER_NOT_FOUND"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    LOGIN_METHOD_MISMATCH = "LOGIN_METHOD_MISMATCH"
    EMAIL_VERIFICATION_FAILED = "EMAIL_VERIFICATION_FAILED"
    
    # 사용자 관련
    USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS"
    INVALID_EMAIL_FORMAT = "INVALID_EMAIL_FORMAT"
    PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK"
    
    # 소셜 로그인 관련
    SOCIAL_EMAIL_REQUIRED = "SOCIAL_EMAIL_REQUIRED"
    SOCIAL_TOKEN_INVALID = "SOCIAL_TOKEN_INVALID"
    
    # 프로젝트 관련
    PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND"
    PROJECT_ACCESS_DENIED = "PROJECT_ACCESS_DENIED"
    
    # 시스템 관련
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_API_ERROR = "EXTERNAL_API_ERROR"
    FILE_UPLOAD_ERROR = "FILE_UPLOAD_ERROR"


class ErrorMessages:
    """표준 에러 메시지 정의"""
    
    # 인증 관련 (현재 사용 중인 메시지와 일치)
    USER_NOT_FOUND = "존재하지 않는 사용자입니다."
    USER_ALREADY_EXISTS = "이미 가입되어 있는 사용자입니다."
    LOGIN_METHOD_MISMATCH = "로그인 방식이 잘못되었습니다."
    SOCIAL_LOGIN_ACCOUNT = "소셜 로그인 계정입니다."
    
    # 이메일 관련
    EMAIL_VERIFICATION_FAILED = "인증번호가 틀렸습니다."
    EMAIL_VERIFICATION_MISMATCH = "인증번호가 일치하지 않습니다"
    KAKAO_EMAIL_REQUIRED = "카카오 이메일이 없습니다."
    NAVER_EMAIL_REQUIRED = "네이버 이메일이 없습니다."
    GOOGLE_EMAIL_REQUIRED = "구글 이메일이 없습니다."
    
    # 기본 메시지
    UNKNOWN_ERROR = "알 수 없는 에러입니다 고객센터에 문의해주세요."
    INVALID_REQUEST = "잘못된 요청입니다."
    NO_PERMISSION = "권한이 없습니다."
    SUCCESS = "success"