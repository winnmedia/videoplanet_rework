"""
미들웨어 테스트
전역 예외 처리 미들웨어 동작 검증
"""

from django.test import TestCase, RequestFactory, override_settings
from django.http import JsonResponse
from unittest.mock import patch, MagicMock

from .middleware import SafeExceptionMiddleware, RequestLoggingMiddleware
from .exceptions import ValidationException, VLANETException


class SafeExceptionMiddlewareTest(TestCase):
    """안전한 예외 처리 미들웨어 테스트"""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = SafeExceptionMiddleware(MagicMock())

    @override_settings(VLANET_SAFE_EXCEPTION_HANDLING=False)
    def test_disabled_middleware(self):
        """미들웨어 비활성화 상태 테스트"""
        request = self.factory.post('/users/signup')
        exception = ValueError("테스트 에러")
        
        response = self.middleware.process_exception(request, exception)
        
        # None을 반환하여 Django 기본 처리로 넘김
        self.assertIsNone(response)

    @override_settings(VLANET_SAFE_EXCEPTION_HANDLING=True)
    def test_enabled_middleware_vlanet_exception(self):
        """미들웨어 활성화 - VLANET 예외 처리 테스트"""
        request = self.factory.post('/users/signup')
        exception = ValidationException("입력값 오류")
        
        with patch('core.middleware.logger'):
            response = self.middleware.process_exception(request, exception)
        
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 400)

    @override_settings(VLANET_SAFE_EXCEPTION_HANDLING=True)
    def test_enabled_middleware_unknown_exception(self):
        """미들웨어 활성화 - 일반 예외 처리 테스트"""
        request = self.factory.post('/users/signup')
        exception = ValueError("일반 에러")
        
        with patch('core.middleware.logger'):
            response = self.middleware.process_exception(request, exception)
        
        self.assertIsInstance(response, JsonResponse)
        self.assertEqual(response.status_code, 500)

    def test_api_request_detection(self):
        """API 요청 감지 테스트"""
        # JSON Accept 헤더
        request = self.factory.post('/test/', HTTP_ACCEPT='application/json')
        self.assertTrue(self.middleware._is_api_request(request))
        
        # JSON Content-Type
        request = self.factory.post('/test/', content_type='application/json')
        self.assertTrue(self.middleware._is_api_request(request))
        
        # API 경로
        request = self.factory.get('/users/signup')
        self.assertTrue(self.middleware._is_api_request(request))
        
        request = self.factory.get('/projects/list')
        self.assertTrue(self.middleware._is_api_request(request))
        
        # 일반 요청
        request = self.factory.get('/admin/')
        self.assertFalse(self.middleware._is_api_request(request))

    def test_client_ip_extraction(self):
        """클라이언트 IP 추출 테스트"""
        # X-Forwarded-For 헤더가 있는 경우
        request = self.factory.get('/', HTTP_X_FORWARDED_FOR='192.168.1.1, 10.0.0.1')
        ip = self.middleware._get_client_ip(request)
        self.assertEqual(ip, '192.168.1.1')
        
        # REMOTE_ADDR만 있는 경우
        request = self.factory.get('/')
        request.META['REMOTE_ADDR'] = '127.0.0.1'
        ip = self.middleware._get_client_ip(request)
        self.assertEqual(ip, '127.0.0.1')

    @override_settings(VLANET_SAFE_EXCEPTION_HANDLING=True)
    def test_non_api_request_ignored(self):
        """비-API 요청은 무시되는지 테스트"""
        request = self.factory.get('/admin/')  # HTML 요청
        exception = ValueError("테스트 에러")
        
        response = self.middleware.process_exception(request, exception)
        
        # None을 반환하여 Django 기본 처리로 넘김
        self.assertIsNone(response)


class RequestLoggingMiddlewareTest(TestCase):
    """요청 로깅 미들웨어 테스트"""

    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = RequestLoggingMiddleware(MagicMock())

    @override_settings(VLANET_REQUEST_LOGGING=False)
    def test_disabled_logging(self):
        """로깅 비활성화 상태 테스트"""
        request = self.factory.get('/test/')
        
        # process_request와 process_response 모두 None 반환
        result = self.middleware.process_request(request)
        self.assertIsNone(result)
        
        response = MagicMock()
        response.status_code = 200
        result = self.middleware.process_response(request, response)
        self.assertEqual(result, response)

    @override_settings(VLANET_REQUEST_LOGGING=True, DEBUG=True)
    @patch('core.middleware.logger')
    def test_debug_request_logging(self, mock_logger):
        """디버그 모드 요청 로깅 테스트"""
        request = self.factory.post('/users/signup')
        
        self.middleware.process_request(request)
        
        mock_logger.debug.assert_called_once()
        call_args = mock_logger.debug.call_args
        self.assertIn('Request: POST /users/signup', call_args[0][0])

    @override_settings(VLANET_REQUEST_LOGGING=True, DEBUG=False)
    @patch('core.middleware.logger')
    def test_production_error_logging(self, mock_logger):
        """프로덕션 모드 에러 로깅 테스트"""
        request = self.factory.post('/users/signup')
        response = MagicMock()
        response.status_code = 400
        
        result = self.middleware.process_response(request, response)
        
        mock_logger.warning.assert_called_once()
        call_args = mock_logger.warning.call_args
        self.assertIn('Response: POST /users/signup - 400', call_args[0][0])
        
        self.assertEqual(result, response)

    @override_settings(VLANET_REQUEST_LOGGING=True)
    @patch('core.middleware.logger')
    def test_success_response_not_logged(self, mock_logger):
        """성공 응답은 로깅하지 않는지 테스트"""
        request = self.factory.get('/test/')
        response = MagicMock()
        response.status_code = 200
        
        self.middleware.process_response(request, response)
        
        # 경고 로깅이 호출되지 않음
        mock_logger.warning.assert_not_called()

    def test_ip_extraction_consistency(self):
        """IP 추출 일관성 테스트"""
        request = self.factory.get('/', HTTP_X_FORWARDED_FOR='192.168.1.1')
        ip = self.middleware._get_client_ip(request)
        self.assertEqual(ip, '192.168.1.1')