const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 제공 (다운로드된 파일들)
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// 다운로드 디렉토리 생성
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// 라우터 설정
const crawlRouter = require('./routes/crawl');
const dbRouter = require('./routes/db');

app.use('/api/crawl', crawlRouter);
app.use('/api/db', dbRouter);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'EV Subsidy Data Crawling Service',
    version: '1.0.0',
    endpoints: {
      crawl: '/api/crawl',
      'db-test': '/api/db/test',
      'health': '/api/health'
    },
    timestamp: new Date().toISOString()
  });
});

// 헬스 체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 에러 핸들러
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 핸들러
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'Endpoint not found',
    timestamp: new Date().toISOString()
  });
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`🚀 EV Crawling Service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Crawl endpoint: http://localhost:${PORT}/api/crawl`);
  console.log(`🗄️  DB test endpoint: http://localhost:${PORT}/api/db/test`);
});

module.exports = app; 