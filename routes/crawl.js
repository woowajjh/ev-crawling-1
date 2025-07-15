const express = require('express');
const { chromium } = require('playwright');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

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
      timezone: '+00:00'
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

// 괄호 안의 숫자들을 파싱하는 함수
function parseParenthesesNumbers(text) {
  if (!text) return [0, 0, 0, 0];
  
  const matches = text.toString().match(/\(([^)]+)\)/g);
  if (!matches) return [0, 0, 0, 0];
  
  const numbers = matches.map(match => {
    const num = match.replace(/[()]/g, '').trim();
    return parseInt(num) || 0;
  });
  
  // 우선순위, 법인·기관, 택시, 일반 순서로 반환
  return [
    numbers[0] || 0, // 우선순위
    numbers[1] || 0, // 법인·기관
    numbers[2] || 0, // 택시
    numbers[3] || 0  // 일반
  ];
}

// 엑셀 파일 파싱 함수
function parseExcelFile(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 첫 번째 시트 사용
    const worksheet = workbook.Sheets[sheetName];
    
    // 엑셀 데이터를 JSON으로 변환
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // 첫 번째 행을 헤더로 사용하지 않고 배열 인덱스 사용
      defval: '' // 빈 셀의 기본값
    });
    
    console.log('Excel parsing completed. Total rows:', jsonData.length);
    return jsonData;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Excel parsing failed: ${error.message}`);
  }
}

// DB에 데이터 저장 함수
async function saveToDatabase(connection, parsedData) {
  try {
    // 현재 날짜 정보
    const today = new Date();
    const currentYear = today.getFullYear();
    const statDate = today.toISOString().split('T')[0]; // YYYY-MM-DD 형식
    
    // 헤더 행 제외 (실제 데이터는 4번째 행부터 시작)
    const dataRows = parsedData.slice(4);
    
    let insertCount = 0;
    let updateCount = 0;
    
    for (const row of dataRows) {
      // 빈 행 건너뛰기
      if (!row || row.length === 0 || !row[0]) {
        continue;
      }
      
      // 엑셀 데이터를 DB 스키마에 맞게 매핑 (빨간 박스 부분만 처리)
      const rowData = {
        base_year: currentYear,
        stat_date: statDate,
        sido: row[0] || '',           // 시도
        region_name: row[1] || '',    // 지역구분
        vehicle_type: row[2] || '전기승용',   // 차종
        apply_method: row[3] || '',   // 접수방법
        
        // 공고대수 (빨간 박스 부분만 - 전체 제외)
        notice_priority: parseInt(row[6]) || 0,    // 우선순위
        notice_corporate: parseInt(row[7]) || 0,   // 법인/기관
        notice_taxi: parseInt(row[8]) || 0,        // 택시
        notice_general: parseInt(row[9]) || 0,     // 일반
        
        // 접수대수 (빨간 박스 부분만 - 전체 제외)
        applied_priority: parseInt(row[12]) || 0,   // 우선순위
        applied_corporate: parseInt(row[13]) || 0,  // 법인/기관
        applied_taxi: parseInt(row[14]) || 0,       // 택시
        applied_general: parseInt(row[15]) || 0,    // 일반
        
        // 접수잔여대수 (Column 16에 전체 값만 존재, 세부 분류는 없음)
        remain_applied_priority: 0,    // 파싱 후 설정
        remain_applied_corporate: 0,   // 파싱 후 설정
        remain_applied_taxi: 0,        // 파싱 후 설정
        remain_applied_general: 0,     // 파싱 후 설정
        
        // 출고잔여대수 (Column 20에서 괄호 안의 숫자들 파싱)
        remain_released_priority: 0,    // 파싱 후 설정
        remain_released_corporate: 0,   // 파싱 후 설정
        remain_released_taxi: 0,        // 파싱 후 설정
        remain_released_general: 0,     // 파싱 후 설정
        
        note: row[21] || null  // 비고 필드 (Column 21)
      };
      
      // 출고대수 파싱 (Column 18) -> remain_applied_xxx 필드에 저장
      const deliveredNumbers = parseParenthesesNumbers(row[18]);
      rowData.remain_applied_priority = deliveredNumbers[0];   // 우선순위
      rowData.remain_applied_corporate = deliveredNumbers[1];  // 법인·기관
      rowData.remain_applied_taxi = deliveredNumbers[2];       // 택시
      rowData.remain_applied_general = deliveredNumbers[3];    // 일반
      
      // 출고잔여대수 파싱 (Column 20)
      const remainReleasedNumbers = parseParenthesesNumbers(row[20]);
      rowData.remain_released_priority = remainReleasedNumbers[0];
      rowData.remain_released_corporate = remainReleasedNumbers[1];
      rowData.remain_released_taxi = remainReleasedNumbers[2];
      rowData.remain_released_general = remainReleasedNumbers[3];
      
      // UPSERT 쿼리 (ON DUPLICATE KEY UPDATE)
      const query = `
        INSERT INTO ev_subsidy_status (
          base_year, stat_date, sido, region_name, vehicle_type, apply_method,
          notice_priority, notice_corporate, notice_taxi, notice_general,
          applied_priority, applied_corporate, applied_taxi, applied_general,
          remain_applied_priority, remain_applied_corporate, remain_applied_taxi, remain_applied_general,
          remain_released_priority, remain_released_corporate, remain_released_taxi, remain_released_general,
          note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          notice_priority = VALUES(notice_priority),
          notice_corporate = VALUES(notice_corporate),
          notice_taxi = VALUES(notice_taxi),
          notice_general = VALUES(notice_general),
          applied_priority = VALUES(applied_priority),
          applied_corporate = VALUES(applied_corporate),
          applied_taxi = VALUES(applied_taxi),
          applied_general = VALUES(applied_general),
          remain_applied_priority = VALUES(remain_applied_priority),
          remain_applied_corporate = VALUES(remain_applied_corporate),
          remain_applied_taxi = VALUES(remain_applied_taxi),
          remain_applied_general = VALUES(remain_applied_general),
          remain_released_priority = VALUES(remain_released_priority),
          remain_released_corporate = VALUES(remain_released_corporate),
          remain_released_taxi = VALUES(remain_released_taxi),
          remain_released_general = VALUES(remain_released_general),
          note = VALUES(note)
      `;
      
      const values = [
        rowData.base_year, rowData.stat_date, rowData.sido, rowData.region_name, 
        rowData.vehicle_type, rowData.apply_method,
        rowData.notice_priority, rowData.notice_corporate, rowData.notice_taxi, rowData.notice_general,
        rowData.applied_priority, rowData.applied_corporate, rowData.applied_taxi, rowData.applied_general,
        rowData.remain_applied_priority, rowData.remain_applied_corporate, 
        rowData.remain_applied_taxi, rowData.remain_applied_general,
        rowData.remain_released_priority, rowData.remain_released_corporate, 
        rowData.remain_released_taxi, rowData.remain_released_general,
        rowData.note
      ];
      
      const [result] = await connection.execute(query, values);
      
      if (result.affectedRows === 1) {
        insertCount++;
      } else if (result.affectedRows === 2) {
        updateCount++;
      }
    }
    
    console.log(`Database save completed. Inserted: ${insertCount}, Updated: ${updateCount}`);
    
    return {
      totalProcessed: dataRows.length,
      inserted: insertCount,
      updated: updateCount
    };
    
  } catch (error) {
    console.error('Database save error:', error);
    throw new Error(`Database save failed: ${error.message}`);
  }
}

// 크롤링 실행 함수
async function executeCrawling() {
  let browser;
  
  try {
    console.log('EV Excel Download started');
    
    // 브라우저 옵션 설정
    const browserOptions = {
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
    };
    
    console.log('Environment:', process.env.NODE_ENV || 'development');
    console.log('Browser options:', browserOptions);
    
    // 브라우저 실행
    browser = await chromium.launch(browserOptions);
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    // 전기차 보조금 사이트 URL
    const targetUrl = 'https://ev.or.kr/nportal/buySupprt/initSubsidyPaymentCheckAction.do';
    const buttonSelector = '#editForm > div.subWrap > div > div.tableBox.js-scrollmotion_up.scrolldelay2 > div > div.rightBtn > a';
    
    console.log(`Navigating to EV site: ${targetUrl}`);
    
    // 웹사이트 접속
    await page.goto(targetUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('EV site loaded successfully');
    
    // 엑셀 다운로드 버튼 찾기
    const downloadButton = page.locator(buttonSelector).first();
    
    if (await downloadButton.count() === 0) {
      throw new Error('Excel download button not found');
    }
    
    console.log('Excel download button found');
    
    // 다운로드 이벤트 대기
    const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
    
    // 엑셀 다운로드 버튼 클릭
    await downloadButton.click();
    
    console.log('Excel download button clicked');
    
    // 오늘 날짜로 파일명 생성 (yyyyMMdd.xls)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateFileName = `${year}${month}${day}.xls`;
    
    // 다운로드 디렉토리 설정
    const downloadDir = path.join(process.cwd(), 'downloads');
    const downloadFilePath = path.join(downloadDir, dateFileName);
    
    // 다운로드 완료 처리
    const download = await downloadPromise;
    
    // 파일 저장 (기존 파일이 있으면 덮어쓰기)
    await download.saveAs(downloadFilePath);
    
    console.log(`Excel file downloaded successfully: ${dateFileName}`);
    
    // 엑셀 파일 파싱
    console.log('Starting Excel file parsing...');
    const parsedData = parseExcelFile(downloadFilePath);
    
    // DB 연결 및 데이터 저장
    let dbResult = null;
    let connection = null;
    
    try {
      console.log('Connecting to database...');
      const dbConfig = getDbConfig();
      connection = await mysql.createConnection(dbConfig);
      
      console.log('Database connected successfully');
      console.log('Saving parsed data to database...');
      
      dbResult = await saveToDatabase(connection, parsedData);
      
      console.log('Database save completed:', dbResult);
      
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    } finally {
      if (connection) {
        await connection.end();
        console.log('Database connection closed');
      }
    }
    
    return {
      success: true,
      message: 'EV Excel file downloaded and saved to database successfully!',
      fileName: dateFileName,
      filePath: downloadFilePath,
      fileSize: fs.statSync(downloadFilePath).size,
      downloadDate: `${year}-${month}-${day}`,
      dbResult: dbResult,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error occurred:', error);
    
    return {
      success: false,
      error: 'Excel download and database save failed',
      message: error.message,
      timestamp: new Date().toISOString()
    };
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed');
    }
  }
}

// 크롤링 실행 엔드포인트
router.get('/', async (req, res) => {
  try {
    console.log('=== EV Crawling API Called ===');
    
    const result = await executeCrawling();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'API execution failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 크롤링 상태 확인 엔드포인트
router.get('/status', (req, res) => {
  res.json({
    service: 'EV Crawling Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /': 'Execute crawling',
      'GET /status': 'Get service status'
    }
  });
});

module.exports = router; 