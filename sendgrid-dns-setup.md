# SendGrid DNS 설정 가이드 - vlanet.net 도메인

## 필요한 DNS 레코드들

SendGrid에서 생성될 레코드들 (실제 값은 SendGrid 콘솔에서 확인):

### CNAME 레코드들
```
# DKIM 서명용 (2개)
s1._domainkey.vlanet.net → s1.domainkey.u[USER_ID].wl[WHITELABEL_ID].sendgrid.net
s2._domainkey.vlanet.net → s2.domainkey.u[USER_ID].wl[WHITELABEL_ID].sendgrid.net

# 도메인 검증용
em[NUMBER].vlanet.net → u[USER_ID].wl[WHITELABEL_ID].sendgrid.net

# Return Path / 추적용
url[NUMBER].vlanet.net → sendgrid.net
```

## DNS 설정 위치

### Cloudflare 사용 시:
1. Cloudflare 대시보드 → vlanet.net 도메인 선택
2. DNS 탭 → Add record
3. Type: CNAME, Name: [위 레코드명], Target: [SendGrid 제공 값]

### Route53 사용 시:
1. AWS Console → Route 53 → Hosted zones
2. vlanet.net 선택 → Create record
3. Record type: CNAME, Record name: [위 레코드명], Value: [SendGrid 제공 값]

### GoDaddy 사용 시:
1. GoDaddy 계정 → My Products → DNS
2. vlanet.net 도메인 선택
3. Add → CNAME, Host: [레코드명], Points to: [SendGrid 값]

## 설정 후 확인사항

### 1. DNS 전파 확인 (24-48시간 소요)
```bash
# DKIM 레코드 확인
nslookup s1._domainkey.vlanet.net
nslookup s2._domainkey.vlanet.net

# 도메인 검증 레코드 확인  
nslookup em[NUMBER].vlanet.net
```

### 2. SendGrid 검증
- SendGrid 콘솔에서 "Verify" 버튼 클릭
- 상태가 "Authenticated"로 변경될 때까지 대기

## 주의사항

- DNS 변경 후 전파에는 최대 48시간 소요
- TTL은 3600(1시간) 이하로 설정 권장
- Proxy 설정은 비활성화 (Cloudflare 사용 시 회색 구름 상태)