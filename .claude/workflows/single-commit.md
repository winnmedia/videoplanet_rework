# 단일 커밋 워크플로우 가이드

## 목표
서브디렉토리의 개별 커밋 없이 메인 리포지토리에서 통합 커밋 관리

## 권장 워크플로우

### 1. 변경사항 작업
```bash
# 서브디렉토리에서 작업 (커밋하지 않음)
cd vridge-web
# 파일 수정...

cd ../vridge_back  
# 파일 수정...
```

### 2. 메인 리포지토리에서 통합 커밋
```bash
cd /home/winnmedia/VLANET
git add .
git commit -m "feat: 통합 기능 구현

- 프론트엔드: 새 기능 추가
- 백엔드: API 엔드포인트 구현

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 3. 푸시 및 배포
```bash
git push origin master  # 통합 배포 트리거
```

## 예외 상황
- 긴급 버그 수정: 해당 서브디렉토리에서 직접 커밋 후 메인에서 sync 커밋
- 독립적 기능: 서브디렉토리별 개별 커밋 허용

## 장점
- 깔끔한 커밋 히스토리
- 관련 변경사항 그룹화
- 배포 단위 명확화