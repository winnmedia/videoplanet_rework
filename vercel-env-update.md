# Vercel 환경변수 업데이트 가이드

## 🌐 Vercel 대시보드에서 환경변수 수정

### 접속 경로
1. https://vercel.com/dashboard
2. `videoplanet-vlanets-projects` 프로젝트 선택
3. **Settings** 탭 클릭
4. **Environment Variables** 메뉴 선택

### 수정할 환경변수

**FROM_EMAIL**
- 현재 값: `winnmedia82@gmail.com`
- 새로운 값: `service@vlanet.net`
- 환경: Production, Preview, Development (모두 체크)

### 수정 절차
1. 기존 `FROM_EMAIL` 변수 옆의 **Edit** 버튼 클릭
2. Value 필드를 `service@vlanet.net`으로 변경
3. **Save** 버튼 클릭
4. **Redeploy** 프로젝트 (새 배포 트리거 필요)

## ⚠️ 중요 사항

- 환경변수 변경 후 반드시 **새로운 배포가 필요**합니다
- 기존 배포에는 변경사항이 반영되지 않습니다
- Git push 또는 Vercel 대시보드에서 수동 재배포 필요

## 🧪 변경 후 테스트

환경변수 변경 및 재배포 완료 후:

```bash
curl -X POST https://videoplanet-vlanets-projects.vercel.app/api/auth/send-verification \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "signup"}'
```

응답에서 성공 메시지 확인:
```json
{"message":"인증번호가 발송되었습니다.","success":true}
```