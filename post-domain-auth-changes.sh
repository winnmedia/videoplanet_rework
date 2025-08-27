#!/bin/bash
# SendGrid 도메인 인증 완료 후 실행할 스크립트

echo "🔐 SendGrid 도메인 인증 완료 후 설정 적용..."

# 1. emailService.ts 파일 수정
echo "📝 emailService.ts 수정 중..."
sed -i "s/winnmedia82@gmail.com/service@vlanet.net/g" /home/winnmedia/VLANET/vridge-web/shared/services/emailService.ts

# 2. .env.local 파일 수정
echo "📝 .env.local 수정 중..."
sed -i "s/FROM_EMAIL=winnmedia82@gmail.com/FROM_EMAIL=service@vlanet.net/g" /home/winnmedia/VLANET/vridge-web/.env.local

# 3. Git 커밋
echo "📦 변경사항 커밋 중..."
cd /home/winnmedia/VLANET
git add .
git commit -m "feat: SendGrid 도메인 인증 완료 후 service@vlanet.net 사용

- 도메인 인증 완료로 service@vlanet.net 발송자 이메일 사용 가능
- 전문적인 브랜드 이메일 주소로 변경
- vlanet.net 도메인 전체 인증으로 확장성 확보

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. 배포
echo "🚀 변경사항 배포 중..."
git push origin master

echo "✅ 설정 적용 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. Vercel 환경변수 업데이트:"
echo "   - FROM_EMAIL=service@vlanet.net"
echo "2. 이메일 발송 테스트 실행"
echo "3. 스팸 폴더 확인"

# 5. 테스트 명령어 안내
echo ""
echo "🧪 테스트 명령어:"
echo "curl -X POST https://videoplanet-vlanets-projects.vercel.app/api/auth/send-verification \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"email\": \"winnmedia82@gmail.com\", \"type\": \"signup\"}'"