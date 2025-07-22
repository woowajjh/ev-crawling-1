const { chromium } = require('playwright');
const mysql = require('mysql2/promise');
const config = require('./config');

// 지역 코드 상수 관리
const REGION_CODES = {
    '서울': '서울특별시',
    '부산': '부산광역시',
    '대구': '대구광역시',
    '인천': '인천광역시',
    '광주': '광주광역시',
    '대전': '대전광역시',
    '울산': '울산광역시',
    '세종': '세종특별자치시',
    '경기': '경기도',
    '강원': '강원도',
    '충북': '충청북도',
    '충남': '충청남도',
    '전북': '전라북도',
    '전남': '전라남도',
    '경북': '경상북도',
    '경남': '경상남도',
    '제주': '제주특별자치도'
};

// 차량 타입 코드 상수 관리
const CAR_TYPES = {
    '일반승용': 'regular',
    '경소형': 'compact',
    '초소형': 'mini',
    '승합': 'van',
    '화물': 'truck',
    '이륜': 'motorcycle'
};

// 차종 코드 상수 관리
const VEHICLE_TYPES = {
    'electric': '전기차',
    'hydrogen': '수소차'
};

class CarModelCrawler {
    constructor() {
        this.browser = null;
        this.page = null;
        this.db = null;
    }

    async initialize() {
        // 브라우저 초기화
        this.browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        this.page = await this.browser.newPage();
        
        // 데이터베이스 연결
        this.db = await mysql.createConnection({
            host: config.DB_HOST,
            user: config.DB_USER,
            password: config.DB_PASSWORD,
            database: config.DB_NAME
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
        if (this.db) {
            await this.db.end();
        }
    }

    // 지역별 보조금 크롤링 (첫 번째 이미지 기준)
    async crawlRegionalSubsidies(year = 2025) {
        const startTime = Date.now();
        let recordCount = 0;
        let errorMessage = null;
        let status = 'success';

        try {
            console.log(`지역별 보조금 크롤링 시작 - 년도: ${year}`);
            
            // 메인 보조금 지원 페이지 방문
            await this.page.goto('https://ev.or.kr/nportal/buySupprt/initBuySubsidySupprtAction.do', {
                waitUntil: 'networkidle'
            });
            
            // 페이지 로드 대기
            await this.page.waitForTimeout(3000);
            
            // 지역별 보조금 상세 데이터 POST 요청
            let data = [];
            
            try {
                // 필요한 토큰/세션 정보 추출
                let pnphValue = await this.page.evaluate(() => {
                    // 다양한 방법으로 pnph 값 찾기
                    let pnph = '';
                    
                    // 1. input[name="pnph"] 찾기
                    const pnphInput = document.querySelector('input[name="pnph"]');
                    if (pnphInput) {
                        pnph = pnphInput.value;
                    }
                    
                    // 2. form 내부의 pnph 찾기
                    if (!pnph) {
                        const forms = document.querySelectorAll('form');
                        for (const form of forms) {
                            const input = form.querySelector('input[name="pnph"]');
                            if (input) {
                                pnph = input.value;
                                break;
                            }
                        }
                    }
                    
                    // 3. 숨겨진 input 찾기
                    if (!pnph) {
                        const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
                        for (const input of hiddenInputs) {
                            if (input.name === 'pnph') {
                                pnph = input.value;
                                break;
                            }
                        }
                    }
                    
                    console.log('pnph 검색 결과:', pnph ? '찾음' : '없음');
                    return pnph;
                });
                
                console.log('pnph 토큰:', pnphValue ? '확인됨' : '없음');
                
                // 디버깅: 페이지에서 모든 input 찾기
                if (!pnphValue) {
                    const allInputs = await this.page.evaluate(() => {
                        const inputs = document.querySelectorAll('input');
                        const result = [];
                        inputs.forEach(input => {
                            result.push({
                                name: input.name,
                                type: input.type,
                                value: input.value ? input.value.substring(0, 20) + '...' : '',
                                id: input.id
                            });
                        });
                        return result;
                    });
                    
                    console.log('페이지의 모든 input 태그:');
                    allInputs.forEach(input => {
                        console.log(`  - name: ${input.name}, type: ${input.type}, value: ${input.value}, id: ${input.id}`);
                    });
                    
                    // 임시로 하드코딩된 pnph 값 사용 (사용자가 제공한 값)
                    const hardcodedPnph = '69B3+TAlmK5/taFst3HPCoBAWt7AQqkspJFoBRWru3l3+TuUqRCtm1481SGsBJWcqqBAVSks92F05TH89rCcux4+uT481yFoNlGoplFON0FPC06uGu5rRaFspRFoh0HsN1Gh';
                    console.log('하드코딩된 pnph 값 사용');
                    pnphValue = hardcodedPnph;
                }
                
                if (pnphValue) {
                    // POST 요청 파라미터 설정
                    const formData = new URLSearchParams({
                        car_type: '11',
                        carType: 'car',
                        evCarTypeDtl: '11',
                        year1: '2025',
                        fullUrl: '/buySupprt/initSubsidyPaymentCheckAction.do',
                        stsUrl: 'initSubsidyPaymentCheckAction.do',
                        pnph: pnphValue
                    });
                    
                    console.log('POST 요청 전송 중...');
                    
                    // POST 요청 보내기 (AJAX 방식)
                    const response = await this.page.evaluate(async (formData) => {
                        const response = await fetch('https://ev.or.kr/nportal/buySupprt/psPopupLocalCarPirce.do', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Referer': 'https://ev.or.kr/nportal/buySupprt/initBuySubsidySupprtAction.do'
                            },
                            body: formData
                        });
                        
                        const html = await response.text();
                        return {
                            status: response.status,
                            html: html
                        };
                    }, formData.toString());
                    
                    console.log('POST 응답 상태:', response.status);
                    
                    // 디버깅: 응답 HTML을 파일로 저장
                    const fs = require('fs');
                    fs.writeFileSync('debug-response.html', response.html);
                    console.log('응답 HTML이 debug-response.html에 저장되었습니다.');
                    
                    // 응답 HTML에서 테이블 파싱 (local_code 추출 포함)
                    data = await this.page.evaluate((html) => {
                        const results = [];
                        
                        // 임시 div 생성해서 응답 HTML 파싱
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html;
                        
                        // 테이블 찾기
                        const tables = tempDiv.querySelectorAll('table');
                        
                        for (const table of tables) {
                            const rows = table.querySelectorAll('tbody tr, tr');
                            
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 5) {
                                    const cellData = Array.from(cells).map(cell => cell.textContent.trim());
                                    
                                    // 실제 데이터 행만 처리 (시도명이 있는 행)
                                    if (cellData[0] && cellData[0] !== '' && 
                                        !cellData[0].includes('시도') && 
                                        !cellData[0].includes('지역구분') && 
                                        !cellData[0].includes('모델별') &&
                                        cellData[1] && cellData[1] !== '' &&
                                        cellData[3] && cellData[3] !== '' &&
                                        cellData[4] && cellData[4] !== '') {
                                        
                                        // 조회 버튼에서 local_code 추출
                                        let localCode = null;
                                        const btnCell = cells[2]; // 조회 버튼이 있는 셀
                                        if (btnCell) {
                                            const btnLinks = btnCell.querySelectorAll('a');
                                            for (const link of btnLinks) {
                                                const onclick = link.getAttribute('onclick');
                                                if (onclick && onclick.includes('psPopupLocalCarModelPrice')) {
                                                    // onclick="psPopupLocalCarModelPrice('2025','4117','안양시');return false;"
                                                    const match = onclick.match(/psPopupLocalCarModelPrice\('(\d+)','(\d+)','([^']+)'/);
                                                    if (match) {
                                                        localCode = match[2]; // 두 번째 파라미터가 local_cd
                                                        break;
                                                    }
                                                }
                                            }
                                        }
                                        
                                        // 디버깅: 추출된 local_code 확인
                                        console.log(`지역: ${cellData[1]} -> local_code: ${localCode}`);
                                        
                                        results.push({
                                            sido: cellData[0],           // 시도
                                            region_name: cellData[1],    // 지역구분
                                            local_code: localCode,       // 실제 지역 코드
                                            regular_subsidy: cellData[3], // 보조금/승용(만원)
                                            mini_subsidy: cellData[4]     // 보조금/초소형(만원)
                                        });
                                    }
                                }
                            });
                            
                            if (results.length > 0) break;
                        }
                        
                        return results;
                    }, response.html);
                    
                    console.log('POST 요청 후 추출된 데이터:', data.length);
                }
                
            } catch (e) {
                console.log('POST 요청 실패:', e.message);
            }
            
            // 조회 버튼 클릭이 실패했거나 데이터가 없으면 기본 테이블 파싱
            if (data.length === 0) {
                console.log('기본 테이블 파싱 시도');
                
                data = await this.page.evaluate(() => {
                    const results = [];
                    
                    // 2025년도 전기자동차 지자체 차종별 보조금 테이블 찾기
                    const tables = document.querySelectorAll('table.table01');
                    
                    for (const table of tables) {
                        // 테이블 캡션 확인
                        const caption = table.querySelector('caption');
                        if (caption && caption.textContent.includes('2025년 지자체 구매보조금')) {
                            const rows = table.querySelectorAll('tbody tr');
                            
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 3) {
                                    const cellData = Array.from(cells).map(cell => cell.textContent.trim());
                                    
                                    // 실제 데이터 행만 처리 (시도명이 있는 행)
                                    if (cellData[0] && cellData[0] !== '' && 
                                        !cellData[0].includes('시도') && 
                                        !cellData[0].includes('전기') && 
                                        !cellData[0].includes('수소')) {
                                        
                                        results.push({
                                            sido: cellData[0],           // 시도
                                            electric_subsidy: cellData[1], // 전기자동차
                                            hydrogen_subsidy: cellData[2]  // 수소자동차
                                        });
                                    }
                                }
                            });
                            break;
                        }
                    }
                    
                    return results;
                });
            }
            
            console.log(`웹페이지에서 추출된 지역별 데이터 수: ${data.length}`);
            
            // 데이터 가공 및 저장
            const processedData = [];
            
            for (const item of data) {
                if (item.sido) {
                    const sido = item.sido.replace(/특별시|광역시|특별자치시|도|특별자치도/g, '');
                    
                    // 조회 버튼 클릭 후 데이터 (5개 컬럼 테이블)
                    if (item.region_name && (item.regular_subsidy || item.mini_subsidy)) {
                        // HTML에서 추출한 실제 local_code 사용 (fallback으로 시도 매핑)
                        const localCode = item.local_code || this.getLocalCdFromRegion(item.sido);
                        
                        // 일반승용 전기차 보조금
                        if (item.regular_subsidy && item.regular_subsidy !== '-') {
                            processedData.push({
                                sido: sido,
                                region_name: item.region_name,
                                local_code: localCode,
                                vehicle_type: '전기차',
                                car_type: '일반승용',
                                subsidy_amount: this.parseNumber(item.regular_subsidy) * 10000 // 만원 → 원
                            });
                        }
                        
                        // 초소형 전기차 보조금
                        if (item.mini_subsidy && item.mini_subsidy !== '-') {
                            processedData.push({
                                sido: sido,
                                region_name: item.region_name,
                                local_code: localCode,
                                vehicle_type: '전기차',
                                car_type: '초소형',
                                subsidy_amount: this.parseNumber(item.mini_subsidy) * 10000 // 만원 → 원
                            });
                        }
                    }
                    // 기본 테이블 데이터 (3개 컬럼 테이블)
                    else {
                        // HTML에서 추출한 실제 local_code 사용 (fallback으로 시도 매핑)
                        const localCode = item.local_code || this.getLocalCdFromRegion(item.sido);
                        
                        // 전기차 보조금 (일반승용으로 처리)
                        if (item.electric_subsidy && item.electric_subsidy !== '-') {
                            processedData.push({
                                sido: sido,
                                region_name: item.sido,
                                local_code: localCode,
                                vehicle_type: '전기차',
                                car_type: '일반승용',
                                subsidy_amount: this.parseNumber(item.electric_subsidy) * 10000 // 만원 → 원
                            });
                        }
                        
                        // 수소차 보조금 (일반승용으로 처리)
                        if (item.hydrogen_subsidy && item.hydrogen_subsidy !== '-') {
                            processedData.push({
                                sido: sido,
                                region_name: item.sido,
                                local_code: localCode,
                                vehicle_type: '수소차',
                                car_type: '일반승용',
                                subsidy_amount: this.parseNumber(item.hydrogen_subsidy) * 10000 // 만원 → 원
                            });
                        }
                    }
                }
            }
            
            if (processedData.length === 0) {
                status = 'partial';
                errorMessage = '파싱된 데이터가 없음';
                
                // 디버깅용 스크린샷 저장
                await this.page.screenshot({ path: 'debug-regional-screenshot.png' });
                console.log('디버깅을 위한 스크린샷 저장: debug-regional-screenshot.png');
                
                // 페이지 HTML 저장
                const pageHtml = await this.page.content();
                require('fs').writeFileSync('debug-regional-page.html', pageHtml);
                console.log('디버깅을 위한 HTML 저장: debug-regional-page.html');
            } else {
                recordCount = await this.saveRegionalSubsidies(processedData, year);
            }

            console.log(`지역별 보조금 크롤링 완료 - 저장된 레코드 수: ${recordCount}`);
            
        } catch (error) {
            console.error('지역별 보조금 크롤링 중 오류:', error);
            status = 'failed';
            errorMessage = error.message;
        } finally {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            await this.logCrawling('regional_subsidy', year, null, status, recordCount, errorMessage, duration);
        }

        return { status, recordCount, errorMessage };
    }

    // 차량 모델별 보조금 크롤링 (psPopupLocalCarModelPrice.do 사용)
    async crawlCarModelSubsidies(year = 2025, targetRegion = '서울특별시') {
        const startTime = Date.now();
        let recordCount = 0;
        let errorMessage = null;
        let status = 'success';

        try {
            console.log(`차량 모델별 보조금 크롤링 시작 - 년도: ${year}, 지역: ${targetRegion}`);
            
            // 메인 페이지 방문 (pnph 토큰 얻기 위해) - 재시도 로직 포함
            let retryCount = 0;
            const maxRetries = 3;
            
            while (retryCount < maxRetries) {
                try {
                    await this.page.goto('https://ev.or.kr/nportal/buySupprt/initBuySubsidySupprtAction.do', {
                        waitUntil: 'networkidle',
                        timeout: 30000 // 30초 타임아웃
                    });
                    break; // 성공하면 루프 종료
                } catch (error) {
                    retryCount++;
                    console.log(`페이지 로드 실패 (${retryCount}/${maxRetries}): ${error.message}`);
                    
                    if (retryCount >= maxRetries) {
                        throw error; // 최대 재시도 초과시 에러 던지기
                    }
                    
                    // 재시도 전 대기
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            // 페이지 로드 대기
            await this.page.waitForTimeout(3000);
            
            // 차량 모델별 보조금 상세 데이터 POST 요청
            let data = [];
            
            try {
                // 필요한 토큰/세션 정보 추출
                let pnphValue = await this.page.evaluate(() => {
                    // 다양한 방법으로 pnph 값 찾기
                    let pnph = '';
                    
                    // 1. input[name="pnph"] 찾기
                    const pnphInput = document.querySelector('input[name="pnph"]');
                    if (pnphInput) {
                        pnph = pnphInput.value;
                    }
                    
                    // 2. form 내부의 pnph 찾기
                    if (!pnph) {
                        const forms = document.querySelectorAll('form');
                        for (const form of forms) {
                            const input = form.querySelector('input[name="pnph"]');
                            if (input) {
                                pnph = input.value;
                                break;
                            }
                        }
                    }
                    
                    // 3. 숨겨진 input 찾기
                    if (!pnph) {
                        const hiddenInputs = document.querySelectorAll('input[type="hidden"]');
                        for (const input of hiddenInputs) {
                            if (input.name === 'pnph') {
                                pnph = input.value;
                                break;
                            }
                        }
                    }
                    
                    console.log('pnph 검색 결과:', pnph ? '찾음' : '없음');
                    return pnph;
                });
                
                console.log('pnph 토큰:', pnphValue ? '확인됨' : '없음');
                
                // 디버깅: 페이지에서 모든 input 찾기
                if (!pnphValue) {
                    const allInputs = await this.page.evaluate(() => {
                        const inputs = document.querySelectorAll('input');
                        const result = [];
                        inputs.forEach(input => {
                            result.push({
                                name: input.name,
                                type: input.type,
                                value: input.value ? input.value.substring(0, 20) + '...' : '',
                                id: input.id
                            });
                        });
                        return result;
                    });
                    
                    console.log('페이지의 모든 input 태그:');
                    allInputs.forEach(input => {
                        console.log(`  - name: ${input.name}, type: ${input.type}, value: ${input.value}, id: ${input.id}`);
                    });
                    
                    // 페이지 새로고침 후 다시 토큰 찾기
                    console.log('페이지 새로고침 후 토큰 재검색...');
                    await this.page.reload({ waitUntil: 'networkidle' });
                    await this.page.waitForTimeout(2000);
                    
                    pnphValue = await this.page.evaluate(() => {
                        const inputs = document.querySelectorAll('input[name="pnph"]');
                        return inputs.length > 0 ? inputs[0].value : null;
                    });
                    
                    // 여전히 없으면 하드코딩된 값 사용
                    if (!pnphValue) {
                        const hardcodedPnph = '19rjjOps96agZQZsN6Wv64l/K1k/atcgJ+ZIN8bldvoLCsjj6Mov9CYgV5agZSZsp+WvaOpuC9rkGuccJ+asN';
                        console.log('하드코딩된 pnph 값 사용');
                        pnphValue = hardcodedPnph;
                    } else {
                        console.log('페이지에서 pnph 토큰 찾음');
                    }
                }
                
                if (pnphValue) {
                    // 지역 코드 매핑
                    const localCd = this.getLocalCdFromRegion(targetRegion);
                    
                    // POST 요청 파라미터 설정
                    const formData = new URLSearchParams({
                        year: year.toString(),
                        local_cd: localCd,
                        local_nm: targetRegion,
                        car_type: '11',
                        pnph: pnphValue
                    });
                    
                    console.log('POST 요청 전송 중... (psPopupLocalCarModelPrice.do)');
                    
                    // POST 요청 보내기 (AJAX 방식)
                    const response = await this.page.evaluate(async (formData) => {
                        const response = await fetch('https://ev.or.kr/nportal/buySupprt/psPopupLocalCarModelPrice.do', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Referer': 'https://ev.or.kr/nportal/buySupprt/initBuySubsidySupprtAction.do'
                            },
                            body: formData
                        });
                        
                        const html = await response.text();
                        return {
                            status: response.status,
                            html: html
                        };
                    }, formData.toString());
                    
                    console.log('POST 응답 상태:', response.status);
                    
                    // 디버깅용 HTML 저장 (강제)
                    require('fs').writeFileSync(`debug-car-model-response.html`, response.html);
                    console.log('POST 응답 HTML 저장: debug-car-model-response.html');
                    
                    // 응답 HTML에서 테이블 파싱
                    data = await this.page.evaluate((html) => {
                        const results = [];
                        
                        // 임시 div 생성해서 응답 HTML 파싱
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = html;
                        
                        // 테이블 찾기
                        const tables = tempDiv.querySelectorAll('table');
                        
                        for (const table of tables) {
                            const rows = table.querySelectorAll('tbody tr, tr');
                            
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 6) {
                                    const cellData = Array.from(cells).map(cell => cell.textContent.trim());
                                    
                                    // 실제 데이터 행만 처리 (6개 컬럼 확인)
                                    if (cellData.length >= 6 &&
                                        cellData[0] && cellData[0] !== '' && 
                                        cellData[1] && cellData[1] !== '' &&
                                        cellData[2] && cellData[2] !== '' &&
                                        !cellData[0].includes('구분') && 
                                        !cellData[1].includes('제조사') && 
                                        !cellData[2].includes('모델명')) {
                                        
                                        // 올바른 컬럼 매핑
                                        const carType = cellData[0];         // 일반승용
                                        const manufacturer = cellData[1];    // 현대자동차
                                        const modelName = cellData[2];       // GV60 스탠다드 2WD 19인치
                                        const nationalSubsidy = cellData[3] || '0';  // 287
                                        const localSubsidy = cellData[4] || '0';     // 28.8
                                        const totalSubsidy = cellData[5] || '0';     // 315.8
                                        
                                        results.push({
                                            manufacturer: manufacturer,
                                            model_name: modelName,
                                            national_subsidy: nationalSubsidy,
                                            local_subsidy: localSubsidy,
                                            total_subsidy: totalSubsidy
                                        });
                                    }
                                }
                            });
                            
                            if (results.length > 0) break;
                        }
                        
                        return results;
                    }, response.html);
                    
                    console.log('POST 요청 후 추출된 데이터:', data.length);
                }
                
            } catch (e) {
                console.log('POST 요청 실패:', e.message);
            }
            
            // POST 요청 실패 시 기본 테이블 파싱
            if (data.length === 0) {
                console.log('기본 테이블 파싱 시도');
                
                data = await this.page.evaluate(() => {
                    const results = [];
                    
                    // 국고 보조금 테이블 찾기
                    const tables = document.querySelectorAll('table.table01');
                    
                    for (const table of tables) {
                        const caption = table.querySelector('caption');
                        
                        // 국고 보조금 테이블인지 확인
                        if (caption && caption.textContent.includes('국고 보조금')) {
                            const rows = table.querySelectorAll('tbody tr');
                            
                            rows.forEach(row => {
                                const cells = row.querySelectorAll('td');
                                if (cells.length >= 4) {
                                    const cellData = Array.from(cells).map(cell => cell.textContent.trim());
                                    
                                    // 실제 데이터 행만 처리 (제조사와 모델명이 있는 행)
                                    if (cellData.length >= 4 && 
                                        cellData[2] && cellData[2] !== '' && 
                                        cellData[3] && cellData[3] !== '' &&
                                        !cellData[0].includes('구분') && 
                                        !cellData[1].includes('제조')) {
                                        
                                        // rowspan으로 인해 일부 셀이 비어있을 수 있음
                                        let carType = cellData[0] || '';
                                        let manufacturer = cellData[1] || '';
                                        let modelName = cellData[2] || '';
                                        let nationalSubsidy = cellData[3] || '';
                                        
                                        // 빈 셀은 이전 행의 값을 사용 (rowspan 처리)
                                        if (!carType) carType = '승용';
                                        if (!manufacturer) manufacturer = '현대자동차';
                                        
                                        if (modelName && nationalSubsidy) {
                                            results.push({
                                                manufacturer: manufacturer,
                                                model_name: modelName,
                                                national_subsidy: nationalSubsidy,
                                                local_subsidy: '0',
                                                total_subsidy: nationalSubsidy
                                            });
                                        }
                                    }
                                }
                            });
                            break;
                        }
                    }
                    
                    return results;
                });
            }
            
            console.log(`웹페이지에서 추출된 모델별 데이터 수: ${data.length}`);
            
            // 데이터 가공 (DB에서 실제 지역 코드 가져오기)
            const sido = this.getSidoFromRegion(targetRegion);
            const localCode = await this.getLocalCodeFromDB(targetRegion);
            
            const processedData = data.map(item => {
                if (item.manufacturer && item.model_name) {
                    return {
                        sido: sido,
                        region_name: targetRegion,
                        local_code: localCode,
                        vehicle_type: '전기차',
                        manufacturer: item.manufacturer,
                        model_name: item.model_name,
                        national_subsidy: this.parseNumber(item.national_subsidy) * 10000, // 만원 → 원
                        local_subsidy: this.parseNumber(item.local_subsidy) * 10000,       // 만원 → 원
                        total_subsidy: this.parseNumber(item.total_subsidy) * 10000        // 만원 → 원
                    };
                }
                return null;
            }).filter(item => item !== null);
            
            if (processedData.length === 0) {
                status = 'partial';
                errorMessage = '파싱된 데이터가 없음';
                
                // 디버깅용 스크린샷 저장
                await this.page.screenshot({ path: `debug-model-${targetRegion}-screenshot.png` });
                console.log(`디버깅을 위한 스크린샷 저장: debug-model-${targetRegion}-screenshot.png`);
                
                // 페이지 HTML 저장
                const pageHtml = await this.page.content();
                require('fs').writeFileSync(`debug-model-${targetRegion}-page.html`, pageHtml);
                console.log(`디버깅을 위한 HTML 저장: debug-model-${targetRegion}-page.html`);
            } else {
                recordCount = await this.saveCarModelSubsidies(processedData, year);
            }

            console.log(`차량 모델별 보조금 크롤링 완료 - 저장된 레코드 수: ${recordCount}`);
            
        } catch (error) {
            console.error('차량 모델별 보조금 크롤링 중 오류:', error);
            status = 'failed';
            errorMessage = error.message;
        } finally {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            await this.logCrawling('car_model_subsidy', year, targetRegion, status, recordCount, errorMessage, duration);
        }

        return { status, recordCount, errorMessage };
    }

    // 데이터베이스에서 모든 지역 가져오기
    async getAllRegionsFromDB() {
        try {
            const [regions] = await this.db.execute(`
                SELECT DISTINCT sido, region_name, local_code, 
                       CASE 
                           WHEN sido = '서울' AND region_name = '서울' THEN '서울특별시'
                           WHEN sido = '부산' AND region_name = '부산' THEN '부산광역시'
                           WHEN sido = '대구' AND region_name = '대구' THEN '대구광역시'
                           WHEN sido = '인천' AND region_name = '인천' THEN '인천광역시'
                           WHEN sido = '광주' AND region_name = '광주' THEN '광주광역시'
                           WHEN sido = '대전' AND region_name = '대전' THEN '대전광역시'
                           WHEN sido = '울산' AND region_name = '울산' THEN '울산광역시'
                           WHEN sido = '세종' AND region_name = '세종' THEN '세종특별자치시'
                           WHEN sido = '제주' AND region_name = '제주' THEN '제주특별자치도'
                           ELSE region_name
                       END as region_full_name
                FROM regional_subsidies 
                WHERE sido != '공단'
                ORDER BY local_code
            `);
            
            return regions;
        } catch (error) {
            console.error('지역 조회 중 오류:', error);
            return [];
        }
    }

    // 배열을 청크로 나누는 유틸리티 함수
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }

    // 전체 지역 차량 모델 크롤링 (순차 처리)
    async crawlAllRegionsCarModels(year = 2025) {
        const regions = await this.getAllRegionsFromDB();
        const results = [];
        
        console.log(`총 ${regions.length}개 지역에 대해 차량 모델별 보조금을 크롤링합니다.`);
        console.log(`안정성을 위해 순차 처리로 진행합니다.`);
        
        for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            console.log(`\n[${i + 1}/${regions.length}] 지역별 모델 크롤링 시작: ${region.region_full_name} (${region.local_code})`);
            
            try {
                const result = await this.crawlCarModelSubsidies(year, region.region_full_name);
                results.push({
                    region: region.region_full_name,
                    local_code: region.local_code,
                    sido: region.sido,
                    ...result
                });
                
                console.log(`✅ ${region.region_full_name} 완료: ${result.recordCount}개 레코드`);
            } catch (error) {
                console.error(`❌ ${region.region_full_name} 크롤링 실패:`, error.message);
                results.push({
                    region: region.region_full_name,
                    local_code: region.local_code,
                    sido: region.sido,
                    status: 'failed',
                    recordCount: 0,
                    errorMessage: error.message
                });
            }
            
            // 대기 시간 없이 바로 다음 지역 처리
        }
        
        return results;
    }

    // 유틸리티 메서드: 지역명으로부터 시도 추출
    getSidoFromRegion(regionName) {
        for (const [sido, region] of Object.entries(REGION_CODES)) {
            if (region === regionName) {
                return sido;
            }
        }
        return regionName.replace(/특별시|광역시|특별자치시|도|특별자치도/g, '');
    }

    // 데이터베이스에서 실제 지역 코드 가져오기
    async getLocalCodeFromDB(regionName) {
        try {
            const [rows] = await this.db.execute(`
                SELECT DISTINCT local_code 
                FROM regional_subsidies 
                WHERE region_name = ?
                LIMIT 1
            `, [regionName]);
            
            if (rows.length > 0) {
                console.log(`${regionName}의 DB 지역 코드: ${rows[0].local_code}`);
                return rows[0].local_code;
            }
            
            // DB에서 찾을 수 없으면 기존 매핑 함수 사용
            console.log(`${regionName}의 DB 지역 코드를 찾을 수 없어 기본 매핑 사용`);
            return this.getLocalCdFromRegion(regionName);
        } catch (error) {
            console.error(`지역 코드 조회 중 오류 (${regionName}):`, error.message);
            return this.getLocalCdFromRegion(regionName);
        }
    }

    // 유틸리티 메서드: 지역명으로부터 지역코드 추출
    getLocalCdFromRegion(regionName) {
        // 시도별 매핑 (크롤링된 데이터의 실제 시도명 기준)
        const sidoMapping = {
            '서울': '1100',
            '부산': '2600', 
            '대구': '2700',
            '인천': '2800',
            '광주': '2900',
            '대전': '3000',
            '울산': '3100',
            '세종': '3611',
            '경기': '4100',
            '강원': '4200',
            '충북': '4300',
            '충남': '4400',
            '전북': '4500',
            '전남': '4600',
            '경북': '4700',
            '경남': '4800',
            '제주': '5000'
        };
        
        // 먼저 regionName이 시도명인지 확인
        if (sidoMapping[regionName]) {
            return sidoMapping[regionName];
        }
        
        // 전체 지역명으로 매핑
        const regionMapping = {
            '서울특별시': '1100',
            '부산광역시': '2600',
            '대구광역시': '2700',
            '인천광역시': '2800',
            '광주광역시': '2900',
            '대전광역시': '3000',
            '울산광역시': '3100',
            '세종특별자치시': '3611',
            '경기도': '4100',
            '강원도': '4200',
            '충청북도': '4300',
            '충청남도': '4400',
            '전라북도': '4500',
            '전라남도': '4600',
            '경상북도': '4700',
            '경상남도': '4800',
            '제주특별자치도': '5000'
        };
        
        return regionMapping[regionName] || '1100'; // 기본값: 서울
    }

    // 숫자 파싱 유틸리티
    parseNumber(str) {
        if (!str || str === '-' || str === '') return 0;
        const cleaned = str.replace(/[,\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    }

    // 지역별 보조금 데이터 저장
    async saveRegionalSubsidies(data, year) {
        let savedCount = 0;
        
        for (const item of data) {
            try {
                await this.db.execute(`
                    INSERT INTO regional_subsidies (
                        year, sido, region_name, local_code, vehicle_type, car_type, subsidy_amount
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        local_code = VALUES(local_code),
                        subsidy_amount = VALUES(subsidy_amount),
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    year, item.sido, item.region_name, item.local_code,
                    item.vehicle_type, item.car_type, item.subsidy_amount
                ]);
                
                savedCount++;
            } catch (error) {
                console.error('지역별 보조금 데이터 저장 중 오류:', error);
            }
        }
        
        return savedCount;
    }

    // 차량 모델별 보조금 데이터 저장
    async saveCarModelSubsidies(data, year) {
        let savedCount = 0;
        
        for (const item of data) {
            try {
                await this.db.execute(`
                    INSERT INTO car_model_subsidies (
                        year, sido, region_name, local_code, vehicle_type, manufacturer, model_name,
                        national_subsidy, local_subsidy, total_subsidy
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE
                        local_code = VALUES(local_code),
                        national_subsidy = VALUES(national_subsidy),
                        local_subsidy = VALUES(local_subsidy),
                        total_subsidy = VALUES(total_subsidy),
                        updated_at = CURRENT_TIMESTAMP
                `, [
                    year, item.sido, item.region_name, item.local_code,
                    item.vehicle_type, item.manufacturer, item.model_name, 
                    item.national_subsidy, item.local_subsidy, item.total_subsidy
                ]);
                
                savedCount++;
            } catch (error) {
                console.error('차량 모델별 보조금 데이터 저장 중 오류:', error);
            }
        }
        
        return savedCount;
    }

    // 크롤링 로그 저장
    async logCrawling(crawlType, year, targetRegion, status, recordCount, errorMessage, duration) {
        try {
            await this.db.execute(`
                INSERT INTO crawling_logs (
                    crawl_type, year, target_region, status, record_count, error_message, crawl_duration
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [crawlType, year, targetRegion, status, recordCount, errorMessage, duration]);
        } catch (error) {
            console.error('크롤링 로그 저장 중 오류:', error);
        }
    }
}

// 실행 부분
async function main() {
    const crawler = new CarModelCrawler();
    
    try {
        await crawler.initialize();
        
        // 지역별 보조금 크롤링
        console.log('=== 지역별 보조금 크롤링 시작 ===');
        await crawler.crawlRegionalSubsidies(2025);
        
        // 전체 지역 차량 모델별 보조금 크롤링
        console.log('\n=== 전체 지역 차량 모델별 보조금 크롤링 시작 ===');
        const results = await crawler.crawlAllRegionsCarModels(2025);
        
        // 결과 요약
        console.log('\n=== 크롤링 결과 요약 ===');
        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;
        const totalRecords = results.reduce((sum, r) => sum + (r.recordCount || 0), 0);
        
        console.log(`✅ 성공: ${successCount}개 지역`);
        console.log(`❌ 실패: ${failedCount}개 지역`);
        console.log(`📊 총 저장된 레코드: ${totalRecords}개`);
        
        if (failedCount > 0) {
            console.log('\n실패한 지역:');
            results.filter(r => r.status === 'failed').forEach(r => {
                console.log(`- ${r.region}: ${r.errorMessage}`);
            });
        }
        
    } catch (error) {
        console.error('크롤링 실행 중 오류:', error);
    } finally {
        await crawler.close();
    }
}

// 직접 실행된 경우에만 main 함수 호출
if (require.main === module) {
    main();
}

module.exports = CarModelCrawler; 