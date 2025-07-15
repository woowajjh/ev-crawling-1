const express = require('express');
const mysql = require('mysql2/promise');

const router = express.Router();

// DB 연결 설정
function getDbConfig() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // 운영 환경
    return {
      host: process.env.DB_HOST || 'damipapa-db.c7oeiia66dzx.ap-northeast-2.rds.amazonaws.com',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_DATABASE || 'common-db',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'u1egRXHFxhXbf9uaL3Om',
      charset: 'utf8mb4',
      timezone: '+00:00',
      acquireTimeout: 60000,
      timeout: 60000,
      reconnect: true
    };
  } else {
    // 로컬 환경
    return {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      database: process.env.DB_DATABASE || 'evcar_subsidy',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'password',
      charset: 'utf8mb4',
      timezone: '+00:00'
    };
  }
}

// 데이터베이스 연결 테스트
async function testDatabaseConnection() {
  let connection;
  
  try {
    console.log('=== 데이터베이스 연결 테스트 시작 ===');
    
    // 환경 정보 확인
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('Environment:', isProduction ? 'Production' : 'Development');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // 데이터베이스 설정 가져오기
    const dbConfig = getDbConfig();
    console.log('DB Host:', dbConfig.host);
    console.log('DB Port:', dbConfig.port);
    console.log('DB Database:', dbConfig.database);
    console.log('DB User:', dbConfig.user);
    
    // 데이터베이스 연결 시도
    console.log('\n=== 데이터베이스 연결 시도 ===');
    const startTime = Date.now();
    
    connection = await mysql.createConnection(dbConfig);
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ 데이터베이스 연결 성공! (${connectionTime}ms)`);
    
    // 기본 쿼리 테스트
    console.log('\n=== 기본 쿼리 테스트 ===');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 기본 쿼리 성공:', rows[0]);
    
    // 테이블 존재 확인
    console.log('\n=== 테이블 존재 확인 ===');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ev_subsidy_status'
    `, [dbConfig.database]);
    
    let count = null;
    if (tables.length > 0) {
      console.log('✅ ev_subsidy_status 테이블 존재');
      
      // 테이블 데이터 개수 확인
      const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM ev_subsidy_status');
      count = countResult;
      console.log('📊 총 데이터 개수:', count[0].count);
      
      // 최근 데이터 확인
      const [recent] = await connection.execute(`
        SELECT sido, region_name, stat_date 
        FROM ev_subsidy_status 
        ORDER BY stat_date DESC 
        LIMIT 5
      `);
      
      console.log('📅 최근 데이터 (상위 5개):');
      recent.forEach((row, index) => {
        console.log(`  ${index + 1}. ${row.sido} - ${row.region_name} (${row.stat_date})`);
      });
      
    } else {
      console.log('❌ ev_subsidy_status 테이블이 존재하지 않습니다.');
      
      // 데이터베이스의 모든 테이블 확인
      const [allTables] = await connection.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [dbConfig.database]);
      
      console.log('📋 데이터베이스의 모든 테이블:');
      allTables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
      });
    }
    
    // 연결 정보 확인
    console.log('\n=== 연결 정보 확인 ===');
    const [connectionInfo] = await connection.execute('SELECT CONNECTION_ID(), USER(), DATABASE()');
    console.log('Connection ID:', connectionInfo[0]['CONNECTION_ID()']);
    console.log('User:', connectionInfo[0]['USER()']);
    console.log('Database:', connectionInfo[0]['DATABASE()']);
    
    return {
      success: true,
      environment: isProduction ? 'Production' : 'Development',
      connectionTime: connectionTime,
      database: dbConfig.database,
      tableExists: tables.length > 0,
      dataCount: tables.length > 0 && count ? count[0].count : 0,
      recentData: tables.length > 0 ? recent : [],
      connectionInfo: connectionInfo[0]
    };
    
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    console.error('Error Code:', error.code);
    console.error('Error Number:', error.errno);
    
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      errorNumber: error.errno
    };
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ 데이터베이스 연결 종료');
    }
  }
}

// DB 테스트 엔드포인트
router.get('/test', async (req, res) => {
  try {
    console.log('=== DB Connection Test API Called ===');
    
    const result = await testDatabaseConnection();
    
    if (result.success) {
      res.json({
        message: 'Database connection test successful',
        result: result,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        message: 'Database connection test failed',
        result: result,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      message: 'Database test API failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// DB 설정 정보 확인 엔드포인트
router.get('/config', (req, res) => {
  const dbConfig = getDbConfig();
  
  // 보안을 위해 비밀번호 제외
  const safeConfig = {
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.user,
    charset: dbConfig.charset,
    timezone: dbConfig.timezone,
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.json({
    message: 'Database configuration',
    config: safeConfig,
    timestamp: new Date().toISOString()
  });
});

// DB 상태 확인 엔드포인트
router.get('/status', (req, res) => {
  res.json({
    service: 'Database Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /test': 'Test database connection',
      'GET /config': 'Get database configuration',
      'GET /status': 'Get service status'
    }
  });
});

module.exports = router; 