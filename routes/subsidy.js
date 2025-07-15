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

// 오늘 날짜 보조금 데이터 조회 엔드포인트
router.get('/today', async (req, res) => {
  let connection;
  
  try {
    console.log('=== Today Subsidy Data API Called ===');
    
    // 오늘 날짜 생성 (YYYY-MM-DD 형식)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    console.log('조회 날짜:', todayStr);
    
    // 데이터베이스 연결
    const dbConfig = getDbConfig();
    connection = await mysql.createConnection(dbConfig);
    
    // 오늘 날짜 보조금 데이터 조회
    const [subsidyData] = await connection.execute(`
      SELECT 
        base_year,
        stat_date,
        sido,
        region_name,
        vehicle_type,
        apply_method,
        notice_priority,
        notice_corporate,
        notice_taxi,
        notice_general,
        applied_priority,
        applied_corporate,
        applied_taxi,
        applied_general,
        remain_applied_priority,
        remain_applied_corporate,
        remain_applied_taxi,
        remain_applied_general,
        remain_released_priority,
        remain_released_corporate,
        remain_released_taxi,
        remain_released_general,
        note
      FROM ev_subsidy_status 
      WHERE stat_date = ?
      ORDER BY sido, region_name, apply_method
    `, [todayStr]);
    
    console.log(`조회 결과: ${subsidyData.length}개 데이터`);
    
    // 데이터 통계 계산
    const statistics = {
      totalRecords: subsidyData.length,
      totalNoticeCount: subsidyData.reduce((sum, item) => 
        sum + (item.notice_priority + item.notice_corporate + item.notice_taxi + item.notice_general), 0),
      totalAppliedCount: subsidyData.reduce((sum, item) => 
        sum + (item.applied_priority + item.applied_corporate + item.applied_taxi + item.applied_general), 0),
      totalRemainAppliedCount: subsidyData.reduce((sum, item) => 
        sum + (item.remain_applied_priority + item.remain_applied_corporate + item.remain_applied_taxi + item.remain_applied_general), 0),
      totalRemainReleasedCount: subsidyData.reduce((sum, item) => 
        sum + (item.remain_released_priority + item.remain_released_corporate + item.remain_released_taxi + item.remain_released_general), 0),
      sidoCount: [...new Set(subsidyData.map(item => item.sido))].length,
      regionCount: [...new Set(subsidyData.map(item => item.region_name))].length
    };
    
    res.json({
      message: 'Today subsidy data retrieved successfully',
      date: todayStr,
      statistics: statistics,
      data: subsidyData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Today Subsidy Data API Error:', error);
    res.status(500).json({
      message: 'Failed to retrieve today subsidy data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
});

// 특정 날짜 보조금 데이터 조회 엔드포인트
router.get('/date/:date', async (req, res) => {
  let connection;
  
  try {
    const { date } = req.params;
    
    // 날짜 형식 검증 (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        message: 'Invalid date format. Use YYYY-MM-DD',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('=== Date Subsidy Data API Called ===');
    console.log('조회 날짜:', date);
    
    // 데이터베이스 연결
    const dbConfig = getDbConfig();
    connection = await mysql.createConnection(dbConfig);
    
    // 특정 날짜 보조금 데이터 조회
    const [subsidyData] = await connection.execute(`
      SELECT 
        base_year,
        stat_date,
        sido,
        region_name,
        vehicle_type,
        apply_method,
        notice_priority,
        notice_corporate,
        notice_taxi,
        notice_general,
        applied_priority,
        applied_corporate,
        applied_taxi,
        applied_general,
        remain_applied_priority,
        remain_applied_corporate,
        remain_applied_taxi,
        remain_applied_general,
        remain_released_priority,
        remain_released_corporate,
        remain_released_taxi,
        remain_released_general,
        note
      FROM ev_subsidy_status 
      WHERE stat_date = ?
      ORDER BY sido, region_name, apply_method
    `, [date]);
    
    console.log(`조회 결과: ${subsidyData.length}개 데이터`);
    
    // 데이터 통계 계산
    const statistics = {
      totalRecords: subsidyData.length,
      totalNoticeCount: subsidyData.reduce((sum, item) => 
        sum + (item.notice_priority + item.notice_corporate + item.notice_taxi + item.notice_general), 0),
      totalAppliedCount: subsidyData.reduce((sum, item) => 
        sum + (item.applied_priority + item.applied_corporate + item.applied_taxi + item.applied_general), 0),
      totalRemainAppliedCount: subsidyData.reduce((sum, item) => 
        sum + (item.remain_applied_priority + item.remain_applied_corporate + item.remain_applied_taxi + item.remain_applied_general), 0),
      totalRemainReleasedCount: subsidyData.reduce((sum, item) => 
        sum + (item.remain_released_priority + item.remain_released_corporate + item.remain_released_taxi + item.remain_released_general), 0),
      sidoCount: [...new Set(subsidyData.map(item => item.sido))].length,
      regionCount: [...new Set(subsidyData.map(item => item.region_name))].length
    };
    
    res.json({
      message: 'Subsidy data retrieved successfully',
      date: date,
      statistics: statistics,
      data: subsidyData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Date Subsidy Data API Error:', error);
    res.status(500).json({
      message: 'Failed to retrieve subsidy data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
});

// 시도별 보조금 데이터 조회 엔드포인트
router.get('/sido/:sido', async (req, res) => {
  let connection;
  
  try {
    const { sido } = req.params;
    
    console.log('=== Sido Subsidy Data API Called ===');
    console.log('조회 시도:', sido);
    
    // 데이터베이스 연결
    const dbConfig = getDbConfig();
    connection = await mysql.createConnection(dbConfig);
    
    // 시도별 최신 보조금 데이터 조회
    const [subsidyData] = await connection.execute(`
      SELECT 
        base_year,
        stat_date,
        sido,
        region_name,
        vehicle_type,
        apply_method,
        notice_priority,
        notice_corporate,
        notice_taxi,
        notice_general,
        applied_priority,
        applied_corporate,
        applied_taxi,
        applied_general,
        remain_applied_priority,
        remain_applied_corporate,
        remain_applied_taxi,
        remain_applied_general,
        remain_released_priority,
        remain_released_corporate,
        remain_released_taxi,
        remain_released_general,
        note
      FROM ev_subsidy_status 
      WHERE sido = ? 
      ORDER BY stat_date DESC, region_name, apply_method
    `, [sido]);
    
    console.log(`조회 결과: ${subsidyData.length}개 데이터`);
    
    // 데이터 통계 계산
    const statistics = {
      totalRecords: subsidyData.length,
      totalNoticeCount: subsidyData.reduce((sum, item) => 
        sum + (item.notice_priority + item.notice_corporate + item.notice_taxi + item.notice_general), 0),
      totalAppliedCount: subsidyData.reduce((sum, item) => 
        sum + (item.applied_priority + item.applied_corporate + item.applied_taxi + item.applied_general), 0),
      totalRemainAppliedCount: subsidyData.reduce((sum, item) => 
        sum + (item.remain_applied_priority + item.remain_applied_corporate + item.remain_applied_taxi + item.remain_applied_general), 0),
      totalRemainReleasedCount: subsidyData.reduce((sum, item) => 
        sum + (item.remain_released_priority + item.remain_released_corporate + item.remain_released_taxi + item.remain_released_general), 0),
      regionCount: [...new Set(subsidyData.map(item => item.region_name))].length,
      dateRange: subsidyData.length > 0 ? {
        latest: subsidyData[0].stat_date,
        earliest: subsidyData[subsidyData.length - 1].stat_date
      } : null
    };
    
    res.json({
      message: 'Sido subsidy data retrieved successfully',
      sido: sido,
      statistics: statistics,
      data: subsidyData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Sido Subsidy Data API Error:', error);
    res.status(500).json({
      message: 'Failed to retrieve sido subsidy data',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
});

// 보조금 서비스 상태 확인 엔드포인트
router.get('/status', (req, res) => {
  res.json({
    service: 'Subsidy Data Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /today': 'Get today subsidy data',
      'GET /date/:date': 'Get subsidy data by date (YYYY-MM-DD)',
      'GET /sido/:sido': 'Get subsidy data by sido',
      'GET /status': 'Get service status'
    }
  });
});

module.exports = router; 