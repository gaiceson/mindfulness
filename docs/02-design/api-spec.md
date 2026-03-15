# 마음챙김 API 명세

Base URL: `https://api-client.bkend.ai/v1`
Headers: `x-project-id`, `x-environment`, `Authorization: Bearer {token}`

---

## Auth

| Method | Path | Body | 설명 |
|--------|------|------|------|
| POST | /auth/email/signup | email, password | 회원가입 |
| POST | /auth/email/signin | email, password | 로그인 |
| GET | /auth/me | - | 현재 유저 |
| POST | /auth/refresh | refreshToken | 토큰 갱신 |
| POST | /auth/signout | - | 로그아웃 |

---

## 명상 기록 (meditation_records)

| Method | Path | 설명 |
|--------|------|------|
| GET | /data/meditation_records?sort=date:desc&limit=200 | 기록 목록 |
| POST | /data/meditation_records | 기록 생성 |
| PATCH | /data/meditation_records/:id | 기록 수정 |
| DELETE | /data/meditation_records/:id | 기록 삭제 |

---

## 마음일기 (diary_entries)

| Method | Path | 설명 |
|--------|------|------|
| GET | /data/diary_entries?sort=date:desc&limit=100 | 일기 목록 |
| POST | /data/diary_entries | 일기 생성 |
| PATCH | /data/diary_entries/:id | 일기 수정 |
| DELETE | /data/diary_entries/:id | 일기 삭제 |

---

## 유저 프로필 (user_profiles)

| Method | Path | 설명 |
|--------|------|------|
| GET | /data/user_profiles?limit=1 | 내 프로필 조회 |
| POST | /data/user_profiles | 프로필 생성 (최초 1회) |
| PATCH | /data/user_profiles/:id | 프로필 업데이트 |

---

## 에러 코드

| Status | 의미 | 대응 |
|--------|------|------|
| 401 | 토큰 만료 | /auth/refresh 호출 |
| 403 | 권한 없음 | RBAC 설정 확인 |
| 409 | 중복 데이터 | unique 필드 확인 |
| 429 | 요청 초과 | Retry-After 후 재시도 |
