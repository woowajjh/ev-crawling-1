# EV Subsidy Data Crawling Service

전기차 보조금 데이터를 크롤링하여 데이터베이스에 저장하는 Node.js 웹 서비스입니다.

## 🚀 주요 기능

- **웹 크롤링**: 전기차 보조금 사이트에서 엑셀 파일 자동 다운로드
- **데이터 파싱**: 다운로드한 엑셀 파일을 데이터베이스 형식으로 변환
- **데이터베이스 저장**: MySQL 데이터베이스에 UPSERT 방식으로 데이터 저장
- **REST API**: 웹 서비스를 통한 크롤링 및 DB 테스트 기능
- **독립 실행**: 커맨드라인으로 직접 실행 가능한 스크립트

## 📁 프로젝트 구조

```
ev-crawling/
├── server.js              # Express 웹 서버 메인 파일
├── config.js              # 환경 설정 관리
├── crawl.js               # 독립 실행 가능한 크롤링 스크립트
├── test-db.js             # 독립 실행 가능한 DB 테스트 스크립트
├── routes/                # Express 라우터
│   ├── crawl.js           # 크롤링 API 라우터
│   └── db.js              # 데이터베이스 API 라우터
├── downloads/             # 다운로드된 엑셀 파일 저장 폴더
├── package.json           # 프로젝트 설정 및 의존성
└── README.md              # 프로젝트 문서
```

## 🔧 설치 및 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 설정

`config.js` 파일에서 환경 변수를 설정하거나, 환경 변수를 직접 설정할 수 있습니다:

```bash
# 개발 환경
NODE_ENV=development
PORT=3000

# 데이터베이스 설정
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=evcar_subsidy
DB_USER=root
DB_PASSWORD=password
```

### 3. 브라우저 설치

Playwright 브라우저를 설치합니다:

```bash
npx playwright install chromium
```

## 🖥️ 실행 방법

### 1. 웹 서버 실행

```bash
# 개발 모드 (nodemon 사용)
npm run dev

# 프로덕션 모드
npm start
```

서버가 실행되면 다음 URL에서 접근할 수 있습니다:
- 메인 페이지: http://localhost:3000
- 헬스 체크: http://localhost:3000/api/health

### 2. 독립 스크립트 실행

#### 크롤링 실행
```bash
npm run crawl
# 또는
node crawl.js
```

#### DB 테스트 실행
```bash
npm run test
# 또는
node test-db.js
```

## 🔌 API 엔드포인트

### 크롤링 API

#### `POST /api/crawl`
크롤링을 실행합니다.

**응답 예시:**
```json
{
  "success": true,
  "message": "EV Excel file downloaded and saved to database successfully!",
  "fileName": "20241201.xls",
  "filePath": "/path/to/downloads/20241201.xls",
  "fileSize": 204800,
  "downloadDate": "2024-12-01",
  "dbResult": {
    "totalProcessed": 250,
    "inserted": 50,
    "updated": 200
  },
  "timestamp": "2024-12-01T09:00:00.000Z"
}
```

#### `GET /api/crawl/status`
크롤링 서비스 상태를 확인합니다.

### 데이터베이스 API

#### `GET /api/db/test`
데이터베이스 연결을 테스트합니다.

**응답 예시:**
```json
{
  "message": "Database connection test successful",
  "result": {
    "success": true,
    "environment": "Development",
    "connectionTime": 45,
    "database": "evcar_subsidy",
    "tableExists": true,
    "dataCount": 1500,
    "connectionInfo": {
      "CONNECTION_ID()": 12345,
      "USER()": "root@localhost",
      "DATABASE()": "evcar_subsidy"
    }
  },
  "timestamp": "2024-12-01T09:00:00.000Z"
}
```

#### `GET /api/db/config`
데이터베이스 설정 정보를 확인합니다.

#### `GET /api/db/status`
데이터베이스 서비스 상태를 확인합니다.

## 🗄️ 데이터베이스 스키마

```sql
CREATE TABLE ev_subsidy_status (
  id INT AUTO_INCREMENT PRIMARY KEY,
  base_year INT NOT NULL,
  stat_date DATE NOT NULL,
  sido VARCHAR(50) NOT NULL,
  region_name VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  apply_method VARCHAR(50) NOT NULL,
  
  -- 공고대수
  notice_priority INT DEFAULT 0,
  notice_corporate INT DEFAULT 0,
  notice_taxi INT DEFAULT 0,
  notice_general INT DEFAULT 0,
  
  -- 접수대수
  applied_priority INT DEFAULT 0,
  applied_corporate INT DEFAULT 0,
  applied_taxi INT DEFAULT 0,
  applied_general INT DEFAULT 0,
  
  -- 접수잔여대수
  remain_applied_priority INT DEFAULT 0,
  remain_applied_corporate INT DEFAULT 0,
  remain_applied_taxi INT DEFAULT 0,
  remain_applied_general INT DEFAULT 0,
  
  -- 출고잔여대수
  remain_released_priority INT DEFAULT 0,
  remain_released_corporate INT DEFAULT 0,
  remain_released_taxi INT DEFAULT 0,
  remain_released_general INT DEFAULT 0,
  
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_record (base_year, stat_date, sido, region_name, vehicle_type, apply_method)
);
```

## 🔍 사용법

### 1. 웹 API 사용

#### 크롤링 실행
```bash
curl -X POST http://localhost:3000/api/crawl
```

#### DB 테스트
```bash
curl http://localhost:3000/api/db/test
```

### 2. 커맨드라인 사용

#### 크롤링 실행
```bash
node crawl.js
```

#### DB 연결 테스트
```bash
node test-db.js
```

## 🚨 에러 처리

- 브라우저 실행 실패 시 Chrome 브라우저 설치 확인
- 데이터베이스 연결 실패 시 MySQL 서버 및 설정 확인
- 파일 다운로드 실패 시 네트워크 연결 및 사이트 접근성 확인

## 📝 개발 참고사항

- 크롤링 대상 사이트: https://ev.or.kr/nportal/buySupprt/initSubsidyPaymentCheckAction.do
- 다운로드 파일 형식: Excel (.xls)
- 데이터 업데이트 방식: UPSERT (중복 데이터 업데이트)
- 파일 저장 위치: `downloads/` 폴더

## 🔧 의존성

- **express**: 웹 서버 프레임워크
- **playwright**: 웹 자동화 및 크롤링
- **mysql2**: MySQL 데이터베이스 클라이언트
- **xlsx**: Excel 파일 파싱
- **cors**: CORS 지원
- **dotenv**: 환경 변수 관리

## 📈 성능 최적화

- 브라우저 헤드리스 모드 사용
- 데이터베이스 연결 풀링
- UPSERT를 통한 효율적인 데이터 업데이트
- 다운로드 파일 로컬 캐싱

## 🔒 보안 고려사항

- 데이터베이스 연결 정보는 환경 변수로 관리
- API 응답에서 민감한 정보 제외
- 브라우저 보안 옵션 설정 