"""
전역 pytest 설정 및 fixtures
"""
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import factory
from faker import Faker

fake = Faker('ko_KR')
User = get_user_model()


# ==================== Fixtures ====================

@pytest.fixture
def api_client():
    """API 클라이언트 fixture"""
    return APIClient()


@pytest.fixture
def user(db):
    """일반 사용자 fixture"""
    return User.objects.create_user(
        email='test@example.com',
        password='testpass123',
        name='테스트 사용자'
    )


@pytest.fixture
def admin_user(db):
    """관리자 사용자 fixture"""
    return User.objects.create_superuser(
        email='admin@example.com',
        password='adminpass123',
        name='관리자'
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """인증된 API 클라이언트 fixture"""
    refresh = RefreshToken.for_user(user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = user
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user):
    """관리자 권한 API 클라이언트 fixture"""
    refresh = RefreshToken.for_user(admin_user)
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    api_client.user = admin_user
    return api_client


# ==================== Factories ====================

class UserFactory(factory.django.DjangoModelFactory):
    """사용자 팩토리"""
    class Meta:
        model = User
    
    email = factory.Faker('email')
    name = factory.Faker('name', locale='ko_KR')
    password = factory.PostGenerationMethodCall('set_password', 'defaultpass123')
    is_active = True
    
    @factory.post_generation
    def groups(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            for group in extracted:
                self.groups.add(group)


class ProjectFactory(factory.django.DjangoModelFactory):
    """프로젝트 팩토리"""
    class Meta:
        model = 'projects.Project'
    
    title = factory.Faker('sentence', nb_words=4)
    description = factory.Faker('text', max_nb_chars=200)
    status = factory.Iterator(['planning', 'active', 'completed'])
    owner = factory.SubFactory(UserFactory)
    start_date = factory.Faker('date_this_year')
    end_date = factory.Faker('future_date', end_date='+180d')


class FeedbackFactory(factory.django.DjangoModelFactory):
    """피드백 팩토리"""
    class Meta:
        model = 'feedbacks.Feedback'
    
    project = factory.SubFactory(ProjectFactory)
    author = factory.SubFactory(UserFactory)
    content = factory.Faker('text', max_nb_chars=500)
    type = factory.Iterator(['positive', 'improvement', 'issue'])


# ==================== Test Helpers ====================

class TestDataBuilder:
    """테스트 데이터 빌더"""
    
    @staticmethod
    def create_project_with_members(owner, member_count=3):
        """멤버가 있는 프로젝트 생성"""
        project = ProjectFactory(owner=owner)
        members = UserFactory.create_batch(member_count)
        project.members.add(*members)
        return project, members
    
    @staticmethod
    def create_project_with_feedbacks(owner, feedback_count=5):
        """피드백이 있는 프로젝트 생성"""
        project = ProjectFactory(owner=owner)
        feedbacks = FeedbackFactory.create_batch(
            feedback_count,
            project=project
        )
        return project, feedbacks


# ==================== Pytest Plugins ====================

@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """모든 테스트에서 DB 접근 가능하도록 설정"""
    pass


@pytest.fixture
def mock_email_backend(settings):
    """이메일 백엔드를 테스트용으로 변경"""
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'


@pytest.fixture
def mock_celery_task(mocker):
    """Celery 태스크 모킹"""
    return mocker.patch('celery.task')


# ==================== Markers ====================

def pytest_configure(config):
    """pytest 설정"""
    config.addinivalue_line(
        "markers", "unit: 단위 테스트"
    )
    config.addinivalue_line(
        "markers", "integration: 통합 테스트"
    )
    config.addinivalue_line(
        "markers", "slow: 느린 테스트"
    )
    config.addinivalue_line(
        "markers", "security: 보안 테스트"
    )