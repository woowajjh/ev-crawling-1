#!/usr/bin/env node

// 독립 실행 가능한 크롤링 스크립트
const config = require('./config');
const { chromium } = require('playwright');
const XLSX = require('xlsx');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 괄호 안의 숫자들을 파싱하는 함수
function parseParenthesesNumbers(text) {
  if (!text) return [0, 0, 0, 0];
  
  const matches = text.toString().match(/\(([^)]+)\)/g);
  if (!matches) return [0, 0, 0, 0];
  
  const numbers = matches.map(match => {
    const num = match.replace(/[()]/g, '').trim();
    return parseInt(num) || 0;
  });
  
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
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: ''
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
    const today = new Date();
    const currentYear = today.getFullYear();
    const statDate = today.toISOString().split('T')[0];
    
    const dataRows = parsedData.slice(4);
    
    let insertCount = 0;
    let updateCount = 0;
    
    for (const row of dataRows) {
      if (!row || row.length === 0 || !row[0]) {
        continue;
      }
      
      const rowData = {
        base_year: currentYear,
        stat_date: statDate,
        sido: row[0] || '',
        region_name: row[1] || '',
        vehicle_type: row[2] || '전기승용',
        apply_method: row[3] || '',
        
        notice_priority: parseInt(row[6]) || 0,
        notice_corporate: parseInt(row[7]) || 0,
        notice_taxi: parseInt(row[8]) || 0,
        notice_general: parseInt(row[9]) || 0,
        
        applied_priority: parseInt(row[12]) || 0,
        applied_corporate: parseInt(row[13]) || 0,
        applied_taxi: parseInt(row[14]) || 0,
        applied_general: parseInt(row[15]) || 0,
        
        remain_applied_priority: 0,
        remain_applied_corporate: 0,
        remain_applied_taxi: 0,
        remain_applied_general: 0,
        
        remain_released_priority: 0,
        remain_released_corporate: 0,
        remain_released_taxi: 0,
        remain_released_general: 0,
        
        note: row[21] || null
      };
      
      const deliveredNumbers = parseParenthesesNumbers(row[18]);
      rowData.remain_applied_priority = deliveredNumbers[0];
      rowData.remain_applied_corporate = deliveredNumbers[1];
      rowData.remain_applied_taxi = deliveredNumbers[2];
      rowData.remain_applied_general = deliveredNumbers[3];
      
      const remainReleasedNumbers = parseParenthesesNumbers(row[20]);
      rowData.remain_released_priority = remainReleasedNumbers[0];
      rowData.remain_released_corporate = remainReleasedNumbers[1];
      rowData.remain_released_taxi = remainReleasedNumbers[2];
      rowData.remain_released_general = remainReleasedNumbers[3];
      
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

// 크롤링 실행
async function executeCrawling() {
  let browser;
  
  try {
    console.log('🚀 EV Excel Download started');
    
    // 다운로드 디렉토리 생성
    const downloadsDir = path.join(process.cwd(), 'downloads');
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true });
    }
    
    // 브라우저 실행
    browser = await chromium.launch(config.browser);
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      viewport: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();
    
    console.log(`🌐 Navigating to: ${config.crawling.targetUrl}`);
    
    await page.goto(config.crawling.targetUrl, { 
      waitUntil: 'networkidle',
      timeout: config.crawling.pageTimeout
    });
    
    console.log('✅ EV site loaded successfully');
    
    const downloadButton = page.locator(config.crawling.buttonSelector).first();
    
    if (await downloadButton.count() === 0) {
      throw new Error('Excel download button not found');
    }
    
    console.log('🔘 Excel download button found');
    
    const downloadPromise = page.waitForEvent('download', { timeout: config.crawling.downloadTimeout });
    await downloadButton.click();
    
    console.log('👆 Excel download button clicked');
    
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const dateFileName = `${year}${month}${day}.xls`;
    
    const downloadFilePath = path.join(downloadsDir, dateFileName);
    
    const download = await downloadPromise;
    await download.saveAs(downloadFilePath);
    
    console.log(`📁 Excel file downloaded: ${dateFileName}`);
    
    // 엑셀 파일 파싱
    console.log('📊 Starting Excel file parsing...');
    const parsedData = parseExcelFile(downloadFilePath);
    
    // DB 연결 및 데이터 저장
    let connection = null;
    
    try {
      console.log('🔌 Connecting to database...');
      connection = await mysql.createConnection(config.database);
      
      console.log('✅ Database connected successfully');
      console.log('💾 Saving parsed data to database...');
      
      const dbResult = await saveToDatabase(connection, parsedData);
      
      console.log('🎉 Database save completed:', dbResult);
      
      return {
        success: true,
        fileName: dateFileName,
        filePath: downloadFilePath,
        fileSize: fs.statSync(downloadFilePath).size,
        downloadDate: `${year}-${month}-${day}`,
        dbResult: dbResult
      };
      
    } catch (dbError) {
      console.error('❌ Database operation failed:', dbError);
      throw new Error(`Database operation failed: ${dbError.message}`);
    } finally {
      if (connection) {
        await connection.end();
        console.log('🔌 Database connection closed');
      }
    }
    
  } catch (error) {
    console.error('💥 Error occurred:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log('🌐 Browser closed');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  executeCrawling()
    .then(result => {
      console.log('\n✅ 크롤링 완료!');
      console.log(`파일: ${result.fileName}`);
      console.log(`크기: ${(result.fileSize / 1024).toFixed(2)}KB`);
      console.log(`DB 결과: 삽입 ${result.dbResult.inserted}개, 업데이트 ${result.dbResult.updated}개`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ 크롤링 실패:', error.message);
      process.exit(1);
    });
}

module.exports = { executeCrawling }; 