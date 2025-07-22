# EV 차종별/모델별 보조금 API 문서

## 기본 정보
- Base URL: `http://localhost:3000/api`
- 모든 응답은 JSON 형태
- 날짜 형식: ISO 8601 (예: 2025-01-01T00:00:00.000Z)

## 1. 크롤링 API

### 1.1 차종별 보조금 크롤링
```
POST /api/car-models/crawl/car-types
```

**요청 파라미터:**
```json
{
  "year": 2025,
  "carType": "11"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "차종별 보조금 크롤링 완료",
  "data": {
    "status": "success",
    "recordCount": 45,
    "errorMessage": null
  }
}
```

### 1.2 모델별 지방비 크롤링
```
POST /api/car-models/crawl/model-local
```

**요청 파라미터:**
```json
{
  "year": 2025,
  "localCd": "1100",
  "carType": "11"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "모델별 지방비 크롤링 완료",
  "data": {
    "status": "success",
    "recordCount": 42,
    "errorMessage": null
  }
}
```

### 1.3 전체 지역 크롤링
```
POST /api/car-models/crawl/all-regions
```

**요청 파라미터:**
```json
{
  "year": 2025,
  "carType": "11"
}
```

**응답 예시:**
```json
{
  "success": true,
  "message": "전체 지역 크롤링 완료",
  "data": [
    {
      "region": "서울특별시",
      "status": "success",
      "recordCount": 42,
      "errorMessage": null
    },
    {
      "region": "부산광역시",
      "status": "success",
      "recordCount": 38,
      "errorMessage": null
    }
  ]
}
```

## 2. 데이터 조회 API

### 2.1 차종별 보조금 조회
```
GET /api/car-models/car-types?year=2025&carType=11&manufacturer=현대&limit=20&offset=0
```

**쿼리 파라미터:**
- `year`: 연도 (기본값: 2025)
- `carType`: 차종 코드 (11: 승용차, 12: 승합차, 13: 화물차, 14: 이륜차)
- `manufacturer`: 제조사 이름 (부분 검색)
- `limit`: 페이지 크기 (기본값: 50)
- `offset`: 페이지 오프셋 (기본값: 0)

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2025,
      "car_type_code": "11",
      "car_type_name": "승용차",
      "manufacturer": "현대",
      "model_name": "아이오닉 6",
      "battery_capacity": 77.4,
      "driving_range": 524,
      "national_subsidy": 6300000,
      "local_subsidy": 2000000,
      "total_subsidy": 8300000,
      "car_price": 52900000,
      "final_price": 44600000,
      "notes": "",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "statistics": {
    "total_count": 125,
    "avg_national_subsidy": 6150000,
    "avg_local_subsidy": 1800000,
    "avg_total_subsidy": 7950000,
    "max_total_subsidy": 8300000,
    "min_total_subsidy": 7500000
  },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 125
  }
}
```

### 2.2 모델별 지방비 조회
```
GET /api/car-models/model-local?year=2025&localCd=1100&carType=11&manufacturer=현대&limit=20&offset=0
```

**쿼리 파라미터:**
- `year`: 연도 (기본값: 2025)
- `localCd`: 지역 코드 (1100: 서울, 2600: 부산 등)
- `carType`: 차종 코드
- `manufacturer`: 제조사 이름 (부분 검색)
- `limit`: 페이지 크기 (기본값: 50)
- `offset`: 페이지 오프셋 (기본값: 0)

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "year": 2025,
      "local_cd": "1100",
      "local_name": "서울특별시",
      "car_type_code": "11",
      "car_type_name": "승용차",
      "manufacturer": "현대",
      "model_name": "아이오닉 6",
      "battery_capacity": 77.4,
      "driving_range": 524,
      "national_subsidy": 6300000,
      "local_subsidy": 2000000,
      "total_subsidy": 8300000,
      "car_price": 52900000,
      "final_price": 44600000,
      "notes": "",
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "statistics": {
    "total_count": 89,
    "avg_national_subsidy": 6150000,
    "avg_local_subsidy": 2000000,
    "avg_total_subsidy": 8150000,
    "max_total_subsidy": 8300000,
    "min_total_subsidy": 7500000
  },
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 89
  }
}
```

### 2.3 보조금 비교 조회
```
GET /api/car-models/compare?year=2025&manufacturer=현대&modelName=아이오닉 6
```

**쿼리 파라미터:**
- `year`: 연도 (기본값: 2025)
- `manufacturer`: 제조사 이름 (필수)
- `modelName`: 모델명 (필수)

**응답 예시:**
```json
{
  "success": true,
  "data": {
    "carTypeSubsidy": {
      "car_type_code": "11",
      "car_type_name": "승용차",
      "manufacturer": "현대",
      "model_name": "아이오닉 6",
      "national_subsidy": 6300000,
      "local_subsidy": 2000000,
      "total_subsidy": 8300000,
      "car_price": 52900000,
      "final_price": 44600000
    },
    "localSubsidies": [
      {
        "local_cd": "1100",
        "local_name": "서울특별시",
        "manufacturer": "현대",
        "model_name": "아이오닉 6",
        "national_subsidy": 6300000,
        "local_subsidy": 2000000,
        "total_subsidy": 8300000,
        "car_price": 52900000,
        "final_price": 44600000
      }
    ],
    "summary": {
      "totalRegions": 18,
      "maxLocalSubsidy": 2500000,
      "minLocalSubsidy": 1000000,
      "avgLocalSubsidy": 1800000
    }
  }
}
```

## 3. 참조 데이터 API

### 3.1 지역 코드 조회
```
GET /api/car-models/local-codes
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "local_cd": "1100",
      "local_name": "서울특별시",
      "region_type": "city",
      "parent_local_cd": null,
      "is_active": true
    },
    {
      "local_cd": "2600",
      "local_name": "부산광역시",
      "region_type": "city", 
      "parent_local_cd": null,
      "is_active": true
    }
  ]
}
```

### 3.2 차종 코드 조회
```
GET /api/car-models/car-types-codes
```

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "car_type_code": "11",
      "car_type_name": "승용차",
      "description": "전기 승용차",
      "is_active": true
    },
    {
      "car_type_code": "12",
      "car_type_name": "승합차",
      "description": "전기 승합차",
      "is_active": true
    }
  ]
}
```

### 3.3 크롤링 로그 조회
```
GET /api/car-models/crawling-logs?crawlType=car_type_subsidy&year=2025&status=success&limit=10&offset=0
```

**쿼리 파라미터:**
- `crawlType`: 크롤링 타입 (car_type_subsidy, model_local_subsidy)
- `year`: 연도
- `status`: 상태 (success, failed, partial)
- `limit`: 페이지 크기 (기본값: 50)
- `offset`: 페이지 오프셋 (기본값: 0)

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "crawl_type": "car_type_subsidy",
      "year": 2025,
      "local_cd": null,
      "car_type_code": "11",
      "status": "success",
      "record_count": 45,
      "error_message": null,
      "crawl_duration": 120,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0
  }
}
```

## 4. 오류 응답

모든 API는 오류 발생시 다음과 같은 형태의 응답을 반환합니다:

```json
{
  "success": false,
  "message": "오류 메시지",
  "error": "상세 오류 정보"
}
```

## 5. 상태 코드

- `200`: 성공
- `400`: 잘못된 요청 (필수 파라미터 누락 등)
- `500`: 서버 오류

## 6. 사용 예시

### 6.1 차종별 보조금 크롤링 후 조회
```bash
# 1. 차종별 보조금 크롤링
curl -X POST http://localhost:3000/api/car-models/crawl/car-types \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "carType": "11"}'

# 2. 크롤링된 데이터 조회
curl "http://localhost:3000/api/car-models/car-types?year=2025&carType=11&limit=10"
```

### 6.2 특정 모델의 지역별 보조금 비교
```bash
# 현대 아이오닉 6의 지역별 보조금 비교
curl "http://localhost:3000/api/car-models/compare?year=2025&manufacturer=현대&modelName=아이오닉%206"
```

### 6.3 서울 지역의 모델별 지방비 크롤링
```bash
# 서울 지역 모델별 지방비 크롤링
curl -X POST http://localhost:3000/api/car-models/crawl/model-local \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "localCd": "1100", "carType": "11"}'
``` 