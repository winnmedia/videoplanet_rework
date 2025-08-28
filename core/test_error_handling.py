"""
에러 핸들링 시스템 단위 테스트
TDD 방식으로 안전성 검증
"""

import json
from django.test import TestCase
from django.http import JsonResponse
from unittest.mock import patch, MagicMock

from .exceptions import (
    VLANETException, ValidationException, AuthenticationException,
    PermissionException, NotFoundException, BusinessLogicException,
    ErrorCodes, ErrorMessages
)
from .responses import APIResponse, CompatibilityResponse, safe_error_response


class VLANETExceptionTest(TestCase):
    """VLANET 예외 클래스 테스트"""
    
    def test_default_exception(self):
        """기본 예외 생성 테스트"""
        exc = VLANETException()
        self.assertEqual(exc.status_code, 500)
        self.assertEqual(exc.error_code, "UNKNOWN_ERROR")
        self.assertIn("서비스 처리", exc.message)
    
    def test_custom_exception(self):
        """사용자 정의 예외 생성 테스트"""
        exc = VLANETException(
            message="테스트 에러",
            status_code=400,
            error_code="TEST_ERROR",
            details={"test": "data"}
        )
        self.assertEqual(exc.message, "테스트 에러")
        self.assertEqual(exc.status_code, 400)
        self.assertEqual(exc.error_code, "TEST_ERROR")
        self.assertEqual(exc.details["test"], "data")
    
    def test_validation_exception(self):
        """검증 예외 테스트"""
        exc = ValidationException("잘못된 입력")
        self.assertEqual(exc.status_code, 400)
        self.assertEqual(exc.error_code, "VALIDATION_ERROR")
        self.assertEqual(exc.message, "잘못된 입력")
    
    def test_authentication_exception(self):
        """인증 예외 테스트"""
        exc = AuthenticationException()
        self.assertEqual(exc.status_code, 401)
        self.assertEqual(exc.error_code, "AUTHENTICATION_ERROR")
    
    def test_not_found_exception(self):
        """404 예외 테스트"""
        exc = NotFoundException()
        self.assertEqual(exc.status_code, 404)
        self.assertEqual(exc.error_code, "NOT_FOUND_ERROR")


class APIResponseTest(TestCase):
    """API 응답 클래스 테스트"""
    
    def test_success_response(self):
        """성공 응답 테스트"""
        response = APIResponse.success(
            data={"user_id": 1}, 
            message="성공", 
            status_code=200
        )
        
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 200)
        
        content = json.loads(response.content)
        self.assertTrue(content["success"])
        self.assertEqual(content["message"], "성공")
        self.assertEqual(content["data"]["user_id"], 1)
    
    def test_error_response(self):
        """에러 응답 테스트"""
        with patch('core.responses.logger') as mock_logger:
            response = APIResponse.error(
                message="테스트 에러",
                status_code=400,
                error_code="TEST_ERROR"
            )
            
            self.assertEqual(response.status_code, 400)
            content = json.loads(response.content)
            self.assertFalse(content["success"])
            self.assertEqual(content["message"], "테스트 에러")
            self.assertEqual(content["error_code"], "TEST_ERROR")
            
            # 로깅이 호출되었는지 확인
            mock_logger.warning.assert_called_once()
    
    def test_from_exception_response(self):
        """예외로부터 응답 생성 테스트"""
        exc = ValidationException("잘못된 데이터", details={"field": "email"})
        
        with patch('core.responses.logger'):
            response = APIResponse.from_exception(exc)
            
            self.assertEqual(response.status_code, 400)
            content = json.loads(response.content)
            self.assertFalse(content["success"])
            self.assertEqual(content["error_code"], "VALIDATION_ERROR")
    
    @patch('django.conf.settings.DEBUG', True)
    def test_debug_mode_details(self):
        """디버그 모드에서 세부 정보 포함 테스트"""
        with patch('core.responses.logger'):
            response = APIResponse.error(
                message="테스트",
                details={"debug": "info"}
            )
            
            content = json.loads(response.content)
            self.assertIn("details", content)
            self.assertEqual(content["details"]["debug"], "info")
    
    @patch('django.conf.settings.DEBUG', False)
    def test_production_mode_no_details(self):
        """프로덕션 모드에서 세부 정보 제외 테스트"""
        with patch('core.responses.logger'):
            response = APIResponse.error(
                message="테스트",
                details={"debug": "info"}
            )
            
            content = json.loads(response.content)
            self.assertNotIn("details", content)


class CompatibilityResponseTest(TestCase):
    """기존 코드 호환성 응답 테스트"""
    
    def test_user_not_found(self):
        """사용자 찾을 수 없음 응답 테스트"""
        response = CompatibilityResponse.user_not_found()
        self.assertEqual(response.status_code, 500)
        
        content = json.loads(response.content)
        self.assertEqual(content["message"], ErrorMessages.USER_NOT_FOUND)
    
    def test_user_already_exists(self):
        """이미 존재하는 사용자 응답 테스트"""
        response = CompatibilityResponse.user_already_exists()
        self.assertEqual(response.status_code, 500)
        
        content = json.loads(response.content)
        self.assertEqual(content["message"], ErrorMessages.USER_ALREADY_EXISTS)
    
    def test_social_email_required(self):
        """소셜 로그인 이메일 필수 응답 테스트"""
        response = CompatibilityResponse.social_email_required("kakao")
        content = json.loads(response.content)
        self.assertEqual(content["message"], ErrorMessages.KAKAO_EMAIL_REQUIRED)
        
        response = CompatibilityResponse.social_email_required("naver")
        content = json.loads(response.content)
        self.assertEqual(content["message"], ErrorMessages.NAVER_EMAIL_REQUIRED)
    
    def test_success_with_data(self):
        """데이터와 함께 성공 응답 테스트"""
        test_data = {
            "message": "success",
            "user": "test@example.com",
            "vridge_session": "test_token"
        }
        
        response = CompatibilityResponse.success_with_data(test_data, 201)
        self.assertEqual(response.status_code, 201)
        
        content = json.loads(response.content)
        self.assertEqual(content["message"], "success")
        self.assertEqual(content["user"], "test@example.com")


class SafeErrorResponseTest(TestCase):
    """안전한 에러 응답 함수 테스트"""
    
    def test_vlanet_exception_handling(self):
        """VLANET 예외 처리 테스트"""
        exc = ValidationException("테스트 에러")
        
        with patch('core.responses.logger'):
            response = safe_error_response(exc)
            
            self.assertEqual(response.status_code, 400)
            content = json.loads(response.content)
            self.assertEqual(content["error_code"], "VALIDATION_ERROR")
    
    def test_unknown_exception_handling(self):
        """알 수 없는 예외 처리 테스트"""
        exc = ValueError("일반 Python 에러")
        
        with patch('core.responses.logger') as mock_logger:
            response = safe_error_response(exc)
            
            self.assertEqual(response.status_code, 500)
            content = json.loads(response.content)
            self.assertEqual(content["message"], ErrorMessages.UNKNOWN_ERROR)
            
            # 로깅이 호출되었는지 확인
            mock_logger.error.assert_called_once()
    
    def test_custom_message(self):
        """사용자 정의 메시지 테스트"""
        exc = RuntimeError("런타임 에러")
        
        with patch('core.responses.logger'):
            response = safe_error_response(exc, "사용자 정의 메시지")
            
            content = json.loads(response.content)
            self.assertEqual(content["message"], "사용자 정의 메시지")
    
    def test_no_exception_with_custom_message(self):
        """예외 없이 사용자 메시지만 있는 경우 테스트"""
        response = safe_error_response(custom_message="테스트 메시지")
        
        content = json.loads(response.content)
        self.assertEqual(content["message"], "테스트 메시지")
        self.assertEqual(response.status_code, 500)


class ErrorCodesAndMessagesTest(TestCase):
    """에러 코드와 메시지 상수 테스트"""
    
    def test_error_codes_exist(self):
        """에러 코드들이 존재하는지 테스트"""
        self.assertTrue(hasattr(ErrorCodes, 'USER_NOT_FOUND'))
        self.assertTrue(hasattr(ErrorCodes, 'INVALID_CREDENTIALS'))
        self.assertTrue(hasattr(ErrorCodes, 'USER_ALREADY_EXISTS'))
        self.assertTrue(hasattr(ErrorCodes, 'SOCIAL_EMAIL_REQUIRED'))
    
    def test_error_messages_exist(self):
        """에러 메시지들이 존재하는지 테스트"""
        self.assertTrue(hasattr(ErrorMessages, 'USER_NOT_FOUND'))
        self.assertTrue(hasattr(ErrorMessages, 'USER_ALREADY_EXISTS'))
        self.assertTrue(hasattr(ErrorMessages, 'UNKNOWN_ERROR'))
        self.assertTrue(hasattr(ErrorMessages, 'SUCCESS'))
    
    def test_korean_messages(self):
        """한글 메시지가 올바른지 테스트"""
        self.assertIn("존재하지 않는", ErrorMessages.USER_NOT_FOUND)
        self.assertIn("이미 가입", ErrorMessages.USER_ALREADY_EXISTS)
        self.assertIn("success", ErrorMessages.SUCCESS)