from django.core.management.base import BaseCommand
from users.models import User
import json


class Command(BaseCommand):
    help = 'Check if user exists in database'
    
    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='User email to check')
    
    def handle(self, *args, **options):
        email = options['email']
        
        try:
            user = User.objects.get(username=email)
            self.stdout.write(
                self.style.SUCCESS(f'사용자 발견: {user.username}')
            )
            self.stdout.write(f'  - ID: {user.id}')
            self.stdout.write(f'  - Nickname: {user.nickname}')
            self.stdout.write(f'  - 가입일: {user.date_joined}')
            self.stdout.write(f'  - 활성화 상태: {user.is_active}')
            self.stdout.write(f'  - 이메일 인증: {getattr(user, "email_verified", "N/A")}')
            
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'사용자 없음: {email}')
            )
            
            # 비슷한 이메일들 찾기
            similar_users = User.objects.filter(username__icontains=email.split('@')[0][:5])
            if similar_users.exists():
                self.stdout.write('유사한 사용자들:')
                for u in similar_users[:5]:
                    self.stdout.write(f'  - {u.username} ({u.nickname})')
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'오류 발생: {e}')
            )