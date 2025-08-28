from django.core.management.base import BaseCommand
from users.models import User


class Command(BaseCommand):
    help = 'Create CEO user account'
    
    def handle(self, *args, **options):
        email = "ceo@winnmedia.co.kr"
        password = "dnlsdos123$"
        nickname = "CEO WinnMedia"
        
        # TODO(human) - CEO 사용자 생성 로직 구현
        # 1. 이미 존재하는 사용자인지 확인
        # 2. 존재하지 않으면 새 사용자 생성 (username=email, nickname=nickname)
        # 3. 비밀번호 설정 (set_password 메서드 사용)
        # 4. 사용자 저장
        # 5. 성공 메시지 출력
        
        pass