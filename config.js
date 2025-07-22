// 환경 설정 관리
require('dotenv').config();

const config = {
  // 서버 설정
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // 데이터베이스 설정
  database: {
    host: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? 'damipapa-db.c7oeiia66dzx.ap-northeast-2.rds.amazonaws.com' : 'localhost'),
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_DATABASE || (process.env.NODE_ENV === 'production' ? 'common-db' : 'evcar_subsidy'),
    user: process.env.DB_USER || (process.env.NODE_ENV === 'production' ? 'admin' : 'root'),
    password: process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? 'u1egRXHFxhXbf9uaL3Om' : 'password'),
    charset: 'utf8mb4',
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },
  
  // 크롤링 설정
  crawling: {
    targetUrl: 'https://ev.or.kr/nportal/buySupprt/initSubsidyPaymentCheckAction.do',
    buttonSelector: '#editForm > div.subWrap > div > div.tableBox.js-scrollmotion_up.scrolldelay2 > div > div.rightBtn > a',
    downloadTimeout: 10000,
    pageTimeout: 30000
  },
  
  // 브라우저 설정
  browser: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-extensions',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--single-process',
      '--no-zygote'
    ]
  },
  
  // 기존 호환성을 위한 DB 설정 (기존 코드와 호환)
  DB_HOST: process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? 'damipapa-db.c7oeiia66dzx.ap-northeast-2.rds.amazonaws.com' : 'localhost'),
  DB_PORT: process.env.DB_PORT || 3306,
  DB_NAME: process.env.DB_DATABASE || (process.env.NODE_ENV === 'production' ? 'common-db' : 'evcar_subsidy'),
  DB_USER: process.env.DB_USER || (process.env.NODE_ENV === 'production' ? 'admin' : 'root'),
  DB_PASSWORD: process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? 'u1egRXHFxhXbf9uaL3Om' : 'password')
};

module.exports = config; 