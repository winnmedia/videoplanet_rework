"""
사용자 인증 관련 테스트
TDD 원칙에 따라 작성된 테스트 코드
"""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.mark.django_db
class TestUserRegistration:
    """사용자 회원가입 테스트"""
    
    def test_유효한_데이터로_회원가입_성공(self, api_client):
        """
        Given: 유효한 회원가입 데이터
        When: 회원가입 요청
        Then: 201 Created와 함께 사용자 생성
        """
        # Arrange
        url = reverse('user:signup')
        data = {
            'email': 'newuser@example.com',
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'name': '홍길동'
        }
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_201_CREATED
        assert 'user' in response.data
        assert response.data['user']['email'] == data['email']
        assert User.objects.filter(email=data['email']).exists()
    
    def test_중복된_이메일로_회원가입_실패(self, api_client, user):
        """
        Given: 이미 존재하는 이메일
        When: 동일한 이메일로 회원가입 시도
        Then: 400 Bad Request
        """
        # Arrange
        url = reverse('user:signup')
        data = {
            'email': user.email,  # 이미 존재하는 이메일
            'password': 'StrongPass123!',
            'password_confirm': 'StrongPass123!',
            'name': '김철수'
        }
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data
    
    def test_약한_비밀번호로_회원가입_실패(self, api_client):
        """
        Given: 보안 요구사항을 충족하지 않는 비밀번호
        When: 회원가입 시도
        Then: 400 Bad Request와 에러 메시지
        """
        # Arrange
        url = reverse('user:signup')
        weak_passwords = ['123456', 'password', 'abc123', '12345678']
        
        for weak_password in weak_passwords:
            data = {
                'email': f'test_{weak_password}@example.com',
                'password': weak_password,
                'password_confirm': weak_password,
                'name': '테스트'
            }
            
            # Act
            response = api_client.post(url, data, format='json')
            
            # Assert
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert 'password' in response.data


@pytest.mark.django_db
class TestUserLogin:
    """사용자 로그인 테스트"""
    
    def test_올바른_자격증명으로_로그인_성공(self, api_client, user):
        """
        Given: 올바른 이메일과 비밀번호
        When: 로그인 요청
        Then: 200 OK와 JWT 토큰 반환
        """
        # Arrange
        url = reverse('user:login')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data
        assert 'user' in response.data
    
    def test_잘못된_비밀번호로_로그인_실패(self, api_client, user):
        """
        Given: 올바른 이메일과 잘못된 비밀번호
        When: 로그인 시도
        Then: 401 Unauthorized
        """
        # Arrange
        url = reverse('user:login')
        data = {
            'email': user.email,
            'password': 'wrongpassword'
        }
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_비활성_사용자_로그인_실패(self, api_client, db):
        """
        Given: 비활성화된 사용자 계정
        When: 로그인 시도
        Then: 401 Unauthorized
        """
        # Arrange
        inactive_user = User.objects.create_user(
            email='inactive@example.com',
            password='testpass123',
            name='비활성 사용자',
            is_active=False
        )
        url = reverse('user:login')
        data = {
            'email': inactive_user.email,
            'password': 'testpass123'
        }
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefresh:
    """JWT 토큰 갱신 테스트"""
    
    def test_유효한_리프레시_토큰으로_갱신_성공(self, api_client, user):
        """
        Given: 유효한 refresh 토큰
        When: 토큰 갱신 요청
        Then: 새로운 access 토큰 발급
        """
        # Arrange
        refresh = RefreshToken.for_user(user)
        url = reverse('user:token_refresh')
        data = {'refresh': str(refresh)}
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        # 새 토큰이 이전과 다른지 확인
        assert response.data['access'] != str(refresh.access_token)
    
    def test_만료된_리프레시_토큰으로_갱신_실패(self, api_client):
        """
        Given: 만료된 refresh 토큰
        When: 토큰 갱신 시도
        Then: 401 Unauthorized
        """
        # Arrange
        url = reverse('user:token_refresh')
        data = {'refresh': 'expired.token.here'}
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestPasswordReset:
    """비밀번호 재설정 테스트"""
    
    def test_비밀번호_재설정_이메일_발송(self, api_client, user, mock_email_backend):
        """
        Given: 등록된 사용자 이메일
        When: 비밀번호 재설정 요청
        Then: 재설정 이메일 발송
        """
        # Arrange
        from django.core import mail
        url = reverse('user:password_reset')
        data = {'email': user.email}
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 1
        assert user.email in mail.outbox[0].to
    
    def test_미등록_이메일로_재설정_요청(self, api_client):
        """
        Given: 등록되지 않은 이메일
        When: 비밀번호 재설정 요청
        Then: 200 OK (보안상 동일한 응답)
        """
        # Arrange
        url = reverse('user:password_reset')
        data = {'email': 'notfound@example.com'}
        
        # Act
        response = api_client.post(url, data, format='json')
        
        # Assert
        # 보안상 존재하지 않는 이메일도 성공 응답
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestUserProfile:
    """사용자 프로필 테스트"""
    
    def test_인증된_사용자_프로필_조회(self, authenticated_client):
        """
        Given: 인증된 사용자
        When: 프로필 조회 요청
        Then: 사용자 정보 반환
        """
        # Arrange
        url = reverse('user:profile')
        
        # Act
        response = authenticated_client.get(url)
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == authenticated_client.user.email
        assert response.data['name'] == authenticated_client.user.name
    
    def test_미인증_사용자_프로필_조회_실패(self, api_client):
        """
        Given: 인증되지 않은 사용자
        When: 프로필 조회 시도
        Then: 401 Unauthorized
        """
        # Arrange
        url = reverse('user:profile')
        
        # Act
        response = api_client.get(url)
        
        # Assert
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_프로필_업데이트(self, authenticated_client):
        """
        Given: 인증된 사용자와 수정할 데이터
        When: 프로필 업데이트 요청
        Then: 프로필 정보 업데이트
        """
        # Arrange
        url = reverse('user:profile')
        data = {
            'name': '수정된 이름',
            'bio': '새로운 자기소개'
        }
        
        # Act
        response = authenticated_client.patch(url, data, format='json')
        
        # Assert
        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == data['name']
        assert response.data['bio'] == data['bio']
        
        # DB 확인
        authenticated_client.user.refresh_from_db()
        assert authenticated_client.user.name == data['name']