const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 환경 변수 로드
dotenv.config();

// 스케줄러 초기화
const CrawlingScheduler = require('./scheduler');
const scheduler = new CrawlingScheduler();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 (개인정보처리방침 등)
app.use(express.static('public'));

// 정적 파일 제공 (다운로드된 파일들)
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

// 다운로드 디렉토리 생성
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

// 라우터 설정
const crawlRouter = require('./routes/crawl');
const subsidyRouter = require('./routes/subsidy');
const carModelsRouter = require('./routes/car-models');
const { router: schedulerRouter, setSchedulerInstance } = require('./routes/scheduler');

// 스케줄러 라우터에 인스턴스 주입
setSchedulerInstance(scheduler);

app.use('/api/crawl', crawlRouter);
app.use('/api/subsidy', subsidyRouter);
app.use('/api/car-models', carModelsRouter);
app.use('/api/scheduler', schedulerRouter);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({
    message: 'EV Subsidy Data Crawling Service',
    version: '1.0.0',
    endpoints: {
      crawl: '/api/crawl',
      subsidy: '/api/subsidy',
      carModels: '/api/car-models',
      scheduler: '/api/scheduler',
      health: '/api/health'
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
const server = app.listen(PORT, () => {
  console.log(`🚀 EV Crawling Service running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔧 Crawl endpoint: http://localhost:${PORT}/api/crawl`);
  console.log(`💰 Subsidy data endpoint: http://localhost:${PORT}/api/subsidy`);
  console.log(`🚗 Car models endpoint: http://localhost:${PORT}/api/car-models`);
  console.log(`⏰ Scheduler endpoint: http://localhost:${PORT}/api/scheduler`);
  
  // 스케줄러 초기화
  scheduler.initialize();
});

// Graceful shutdown
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  console.log(`\n${signal} 신호를 받았습니다. 안전하게 종료합니다...`);
  
  // 스케줄러 종료
  if (scheduler) {
    scheduler.destroy();
  }
  
  // 서버 종료
  server.close(() => {
    console.log('✅ HTTP 서버가 종료되었습니다.');
    process.exit(0);
  });
  
  // 강제 종료 (10초 후)
  setTimeout(() => {
    console.error('❌ 강제 종료됩니다.');
    process.exit(1);
  }, 10000);
}

module.exports = app; 