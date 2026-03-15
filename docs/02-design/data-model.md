# 마음챙김 데이터 모델

## 테이블 설계

---

### meditation_records

명상 완료 기록. `createdBy`가 자동으로 유저 ID를 담아 RLS(self) 적용.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | auto | bkend 자동 생성 |
| sessionId | String | required | 명상 세션 ID |
| sessionTitle | String | required | 세션 제목 |
| date | String | required | YYYY-MM-DD |
| duration | Number | required | 명상 시간(분) |
| emotion | String | required | great/good/neutral/tired/anxious |
| createdBy | String | auto | 작성 유저 ID (RLS) |
| createdAt | Date | auto | 생성 시각 |

RBAC: admin=전체, user/self=본인만, guest=없음

---

### diary_entries

마음일기. 하루 여러 건 가능.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | auto | |
| date | String | required | YYYY-MM-DD |
| emotion | String | required | EmotionType |
| note | String | required | 일기 내용 |
| createdBy | String | auto | RLS |
| createdAt | Date | auto | |

RBAC: admin=전체, user/self=본인만, guest=없음

---

### user_profiles

유저 통계/포인트/뱃지. 유저당 1건.

| 필드 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | String | auto | |
| isPremium | Boolean | default:false | 프리미엄 여부 |
| premiumPlan | String | | monthly/annual/null |
| maumPoints | Number | default:0 | 마음P |
| streakDays | Number | default:0 | 연속 명상 일수 |
| totalMinutes | Number | default:0 | 총 명상 시간 |
| totalSessions | Number | default:0 | 총 명상 횟수 |
| badges | Array | default:[] | 획득 뱃지 목록 |
| lastCompletedDate | String | | 마지막 완료 날짜 |
| createdBy | String | auto | RLS |
| updatedAt | Date | auto | |

RBAC: admin=전체, user/self=본인만, guest=없음

---

## 관계 다이어그램

```
BkendUser (auth)
    │
    ├── meditation_records (1:N)
    ├── diary_entries (1:N)
    └── user_profiles (1:1)
```

## 인덱스 권장

- meditation_records: `(createdBy, date)` 복합 인덱스
- diary_entries: `(createdBy, date)` 복합 인덱스
- user_profiles: `createdBy` 단일 인덱스 (unique)
