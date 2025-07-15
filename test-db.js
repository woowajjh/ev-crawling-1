#!/usr/bin/env node

// 독립 실행 가능한 DB 테스트 스크립트
const config = require('./config');
const mysql = require('mysql2/promise');

// 데이터베이스 연결 테스트
async function testDatabaseConnection() {
  let connection;
  
  try {
    console.log('🔧 === 데이터베이스 연결 테스트 시작 ===');
    
    // 환경 정보 확인
    console.log('🌍 Environment:', config.nodeEnv);
    console.log('📊 NODE_ENV:', process.env.NODE_ENV);
    
    // 데이터베이스 설정 확인
    console.log('🗄️  DB Host:', config.database.host);
    console.log('🔌 DB Port:', config.database.port);
    console.log('📂 DB Database:', config.database.database);
    console.log('👤 DB User:', config.database.user);
    
    // 데이터베이스 연결 시도
    console.log('\n🔗 === 데이터베이스 연결 시도 ===');
    const startTime = Date.now();
    
    connection = await mysql.createConnection(config.database);
    
    const connectionTime = Date.now() - startTime;
    console.log(`✅ 데이터베이스 연결 성공! (${connectionTime}ms)`);
    
    // 기본 쿼리 테스트
    console.log('\n🧪 === 기본 쿼리 테스트 ===');
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('✅ 기본 쿼리 성공:', rows[0]);
    
    // 테이블 존재 확인
    console.log('\n📋 === 테이블 존재 확인 ===');
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'ev_subsidy_status'
    `, [config.database.database]);
    
    let count = null;
    let recent = [];
    
    if (tables.length > 0) {
      console.log('✅ ev_subsidy_status 테이블 존재');
      
      // 테이블 데이터 개수 확인
      const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM ev_subsidy_status');
      count = countResult;
      console.log('📊 총 데이터 개수:', count[0].count);
      
      // 최근 데이터 확인
      const [recentResult] = await connection.execute(`
        SELECT sido, region_name, stat_date 
        FROM ev_subsidy_status 
        ORDER BY stat_date DESC 
        LIMIT 5
      `);
      recent = recentResult;
      
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
      `, [config.database.database]);
      
      console.log('📋 데이터베이스의 모든 테이블:');
      allTables.forEach((table, index) => {
        console.log(`  ${index + 1}. ${table.TABLE_NAME}`);
      });
    }
    
    // 연결 정보 확인
    console.log('\n🔗 === 연결 정보 확인 ===');
    const [connectionInfo] = await connection.execute('SELECT CONNECTION_ID(), USER(), DATABASE()');
    console.log('🆔 Connection ID:', connectionInfo[0]['CONNECTION_ID()']);
    console.log('👤 User:', connectionInfo[0]['USER()']);
    console.log('📂 Database:', connectionInfo[0]['DATABASE()']);
    
    // 서버 정보 확인
    console.log('\n🖥️  === 서버 정보 확인 ===');
    const [serverInfo] = await connection.execute('SELECT VERSION() as version, NOW() as current_time');
    console.log('🔢 MySQL Version:', serverInfo[0].version);
    console.log('🕐 Server Time:', serverInfo[0].current_time);
    
    return {
      success: true,
      environment: config.nodeEnv,
      connectionTime: connectionTime,
      database: config.database.database,
      tableExists: tables.length > 0,
      dataCount: tables.length > 0 && count ? count[0].count : 0,
      recentData: recent,
      connectionInfo: connectionInfo[0],
      serverInfo: serverInfo[0]
    };
    
  } catch (error) {
    console.error('❌ 데이터베이스 연결 실패:', error.message);
    console.error('🔢 Error Code:', error.code);
    console.error('🔢 Error Number:', error.errno);
    
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      errorNumber: error.errno
    };
    
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 데이터베이스 연결 종료');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  testDatabaseConnection()
    .then(result => {
      console.log('\n🎉 === 테스트 결과 ===');
      if (result.success) {
        console.log('✅ 데이터베이스 연결 성공!');
        console.log(`환경: ${result.environment}`);
        console.log(`연결 시간: ${result.connectionTime}ms`);
        console.log(`데이터베이스: ${result.database}`);
        console.log(`테이블 존재: ${result.tableExists ? '✅' : '❌'}`);
        console.log(`데이터 개수: ${result.dataCount}개`);
        console.log(`MySQL 버전: ${result.serverInfo?.version || 'N/A'}`);
        process.exit(0);
      } else {
        console.log('❌ 데이터베이스 연결 실패!');
        console.log(`에러: ${result.error}`);
        console.log(`에러 코드: ${result.errorCode}`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 테스트 실행 실패:', error.message);
      process.exit(1);
    });
}

module.exports = { testDatabaseConnection }; 