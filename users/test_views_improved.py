"""
개선된 users views 테스트
기존 동작과의 호환성 검증
"""

import json
from django.test import TestCase, Client
from django.urls import reverse
from unittest.mock import patch, MagicMock
from .models import User


class ImprovedViewsTest(TestCase):
    """개선된 views의 기본 동작 테스트"""

    def setUp(self):
        self.client = Client()
        
    def test_signup_missing_data(self):
        """회원가입 시 필수 데이터 누락 테스트"""
        response = self.client.post(
            '/users/signup',
            json.dumps({"email": "test@example.com"}),  # nickname, password 누락
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error_code'], 'VALIDATION_ERROR')
    
    def test_signup_invalid_json(self):
        """회원가입 시 잘못된 JSON 테스트"""
        response = self.client.post(
            '/users/signup',
            "invalid json",
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error_code'], 'VALIDATION_ERROR')
    
    def test_signin_missing_data(self):
        """로그인 시 필수 데이터 누락 테스트"""
        response = self.client.post(
            '/users/login',
            json.dumps({"email": "test@example.com"}),  # password 누락
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error_code'], 'VALIDATION_ERROR')
    
    def test_signin_invalid_json(self):
        """로그인 시 잘못된 JSON 테스트"""
        response = self.client.post(
            '/users/login',
            "invalid json",
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.content)
        self.assertEqual(data['error_code'], 'VALIDATION_ERROR')
    
    def test_signup_user_already_exists(self):
        """회원가입 시 기존 사용자 존재 테스트"""
        # 사용자 미리 생성
        User.objects.create_user(
            username="existing@example.com",
            password="testpass123"
        )
        
        response = self.client.post(
            '/users/signup',
            json.dumps({
                "email": "existing@example.com",
                "nickname": "test",
                "password": "testpass123"
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 500)  # 기존 동작 유지
        data = json.loads(response.content)
        self.assertEqual(data['message'], '이미 가입되어 있는 사용자입니다.')
    
    def test_signin_user_not_found(self):
        """로그인 시 사용자 찾을 수 없음 테스트"""
        response = self.client.post(
            '/users/login',
            json.dumps({
                "email": "nonexistent@example.com",
                "password": "testpass123"
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 500)  # 기존 동작 유지
        data = json.loads(response.content)
        self.assertEqual(data['message'], '존재하지 않는 사용자입니다.')
    
    @patch('users.views.requests.get')
    def test_kakao_login_no_email(self, mock_get):
        """카카오 로그인 시 이메일 없음 테스트"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": 12345,
            "properties": {"nickname": "test"},
            "kakao_account": {}  # email 없음
        }
        mock_get.return_value = mock_response
        
        response = self.client.post(
            '/users/login/kakao',
            json.dumps({"access_token": "fake_token"}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertEqual(data['message'], '카카오 이메일이 없습니다.')
    
    @patch('users.views.requests.get')
    def test_naver_login_no_email(self, mock_get):
        """네이버 로그인 시 이메일 없음 테스트 (토큰 단계 모킹)"""
        # requests.post와 requests.get을 모두 모킹해야 함
        with patch('users.views.requests.post') as mock_post:
            mock_post.return_value.json.return_value = {
                "access_token": "fake_access_token"
            }
            
            mock_get.return_value.json.return_value = {
                "response": {
                    "id": "12345",
                    "nickname": "test"
                    # email 없음
                }
            }
            
            response = self.client.post(
                '/users/login/naver',
                json.dumps({
                    "code": "fake_code",
                    "state": "fake_state"
                }),
                content_type='application/json'
            )
            
            self.assertEqual(response.status_code, 500)
            data = json.loads(response.content)
            self.assertEqual(data['message'], '네이버 이메일이 없습니다.')
    
    @patch('users.views.requests.get')
    def test_google_login_no_email(self, mock_get):
        """구글 로그인 시 이메일 없음 테스트"""
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "id": "12345",
            "name": "test"
            # email 없음
        }
        mock_get.return_value = mock_response
        
        response = self.client.post(
            '/users/login/google',
            json.dumps({
                "access_token": "fake_token",
                "state": "fake_state",
                "scopes": "email profile"
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 500)
        data = json.loads(response.content)
        self.assertEqual(data['message'], '구글 이메일이 없습니다.')
    
    def test_signup_success_maintains_compatibility(self):
        """회원가입 성공 시 기존 응답 형식 유지 테스트"""
        response = self.client.post(
            '/users/signup',
            json.dumps({
                "email": "new@example.com",
                "nickname": "newuser",
                "password": "testpass123"
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.content)
        
        # 기존 형식 유지 확인
        self.assertEqual(data['message'], 'success')
        self.assertIn('vridge_session', data)
        self.assertEqual(data['user'], 'new@example.com')
        
        # 쿠키 설정 확인
        self.assertIn('vridge_session', response.cookies)