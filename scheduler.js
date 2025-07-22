const cron = require('node-cron');
const axios = require('axios');
const config = require('./config');

class CrawlingScheduler {
    constructor() {
        this.isRunning = false;
        this.lastExecution = null;
        this.nextExecution = null;
        this.jobs = new Map();
        
        // 서버 URL 설정
        this.baseURL = `http://localhost:${config.port || 3000}`;
    }
    
    // 스케줄러 초기화
    initialize() {
        console.log('🕘 크롤링 스케줄러 초기화 중...');
        
        // 매일 오전 9시에 엑셀 크롤링 실행
        this.scheduleExcelCrawling();
        
        // 옵션: 매일 오전 9시 30분에 차량 모델 크롤링 실행 (주석 처리)
        // this.scheduleCarModelCrawling();
        
        console.log('✅ 크롤링 스케줄러 초기화 완료');
        this.printScheduleInfo();
    }
    
    // 엑셀 크롤링 스케줄 설정 (매일 오전 9시)
    scheduleExcelCrawling() {
        const cronExpression = '0 9 * * *'; // 매일 오전 9시
        
        const job = cron.schedule(cronExpression, async () => {
            console.log('🚀 예약된 엑셀 크롤링 실행 시작:', new Date().toISOString());
            await this.executeExcelCrawling();
        }, {
            scheduled: false, // 수동으로 시작
            timezone: 'Asia/Seoul' // 한국 시간대
        });
        
        this.jobs.set('excelCrawling', {
            job,
            cronExpression,
            description: '엑셀 크롤링 (매일 오전 9시)',
            lastRun: null,
            nextRun: null
        });
        
        job.start();
        console.log('📅 엑셀 크롤링 스케줄 등록 완료: 매일 오전 9시');
    }
    
    // 차량 모델 크롤링 스케줄 설정 (선택사항 - 현재 비활성화)
    scheduleCarModelCrawling() {
        const cronExpression = '30 9 * * *'; // 매일 오전 9시 30분
        
        const job = cron.schedule(cronExpression, async () => {
            console.log('🚗 예약된 차량 모델 크롤링 실행 시작:', new Date().toISOString());
            await this.executeCarModelCrawling();
        }, {
            scheduled: false,
            timezone: 'Asia/Seoul'
        });
        
        this.jobs.set('carModelCrawling', {
            job,
            cronExpression,
            description: '차량 모델 크롤링 (매일 오전 9시 30분)',
            lastRun: null,
            nextRun: null
        });
        
        job.start();
        console.log('📅 차량 모델 크롤링 스케줄 등록 완료: 매일 오전 9시 30분');
    }
    
    // 엑셀 크롤링 실행
    async executeExcelCrawling() {
        try {
            this.isRunning = true;
            this.lastExecution = new Date();
            
            console.log('📊 엑셀 크롤링 API 호출 중...');
            
            // 내부 API 호출 (HTTP 요청)
            const response = await axios.get(`${this.baseURL}/api/crawl`, {
                timeout: 300000 // 5분 타임아웃
            });
            
            if (response.data.success) {
                console.log('✅ 예약된 엑셀 크롤링 성공:', response.data.message);
                console.log('📁 파일명:', response.data.fileName);
                console.log('📦 파일 크기:', this.formatFileSize(response.data.fileSize));
                console.log('📈 DB 결과:', response.data.dbResult);
            } else {
                console.error('❌ 예약된 엑셀 크롤링 실패:', response.data.message);
            }
            
            // 작업 기록 업데이트
            const jobInfo = this.jobs.get('excelCrawling');
            if (jobInfo) {
                jobInfo.lastRun = this.lastExecution;
            }
            
        } catch (error) {
            console.error('💥 예약된 엑셀 크롤링 실행 중 오류:', error.message);
            
            // 상세 오류 로그
            if (error.response) {
                console.error('API 응답 오류:', error.response.status, error.response.data);
            }
        } finally {
            this.isRunning = false;
        }
    }
    
    // 차량 모델 크롤링 실행 (선택사항)
    async executeCarModelCrawling() {
        try {
            this.isRunning = true;
            
            console.log('🚗 차량 모델 크롤링 API 호출 중...');
            
            // 내부 API 호출
            const response = await axios.post(`${this.baseURL}/api/car-models/crawl/all-regions`, {
                year: new Date().getFullYear(),
                carType: '11' // 전기차
            }, {
                timeout: 1800000 // 30분 타임아웃
            });
            
            if (response.data.success) {
                console.log('✅ 예약된 차량 모델 크롤링 성공');
                console.log('📈 크롤링 결과:', response.data.data);
            } else {
                console.error('❌ 예약된 차량 모델 크롤링 실패:', response.data.message);
            }
            
            // 작업 기록 업데이트
            const jobInfo = this.jobs.get('carModelCrawling');
            if (jobInfo) {
                jobInfo.lastRun = new Date();
            }
            
        } catch (error) {
            console.error('💥 예약된 차량 모델 크롤링 실행 중 오류:', error.message);
        } finally {
            this.isRunning = false;
        }
    }
    
    // 수동 엑셀 크롤링 실행
    async runExcelCrawlingNow() {
        if (this.isRunning) {
            throw new Error('다른 크롤링 작업이 실행 중입니다.');
        }
        
        console.log('🔧 수동 엑셀 크롤링 실행 중...');
        await this.executeExcelCrawling();
    }
    
    // 수동 차량 모델 크롤링 실행
    async runCarModelCrawlingNow() {
        if (this.isRunning) {
            throw new Error('다른 크롤링 작업이 실행 중입니다.');
        }
        
        console.log('🔧 수동 차량 모델 크롤링 실행 중...');
        await this.executeCarModelCrawling();
    }
    
    // 스케줄 정보 출력
    printScheduleInfo() {
        console.log('\n📅 등록된 스케줄:');
        console.log('─'.repeat(60));
        
        this.jobs.forEach((jobInfo, name) => {
            console.log(`📌 ${jobInfo.description}`);
            console.log(`   크론 표현식: ${jobInfo.cronExpression}`);
            console.log(`   마지막 실행: ${jobInfo.lastRun ? jobInfo.lastRun.toLocaleString('ko-KR', {timeZone: 'Asia/Seoul'}) : '없음'}`);
            console.log(`   상태: ${jobInfo.job.getStatus()}`);
            console.log('');
        });
    }
    
    // 스케줄러 상태 조회
    getStatus() {
        const status = {
            isRunning: this.isRunning,
            lastExecution: this.lastExecution,
            jobs: {}
        };
        
        this.jobs.forEach((jobInfo, name) => {
            status.jobs[name] = {
                description: jobInfo.description,
                cronExpression: jobInfo.cronExpression,
                lastRun: jobInfo.lastRun,
                status: jobInfo.job.getStatus(),
                isRunning: jobInfo.job.running
            };
        });
        
        return status;
    }
    
    // 특정 작업 중지
    stopJob(jobName) {
        const jobInfo = this.jobs.get(jobName);
        if (jobInfo) {
            jobInfo.job.stop();
            console.log(`⏹️  ${jobName} 작업이 중지되었습니다.`);
            return true;
        }
        return false;
    }
    
    // 특정 작업 시작
    startJob(jobName) {
        const jobInfo = this.jobs.get(jobName);
        if (jobInfo) {
            jobInfo.job.start();
            console.log(`▶️  ${jobName} 작업이 시작되었습니다.`);
            return true;
        }
        return false;
    }
    
    // 모든 작업 중지
    stopAll() {
        this.jobs.forEach((jobInfo, name) => {
            jobInfo.job.stop();
        });
        console.log('⏹️  모든 스케줄 작업이 중지되었습니다.');
    }
    
    // 모든 작업 시작
    startAll() {
        this.jobs.forEach((jobInfo, name) => {
            jobInfo.job.start();
        });
        console.log('▶️  모든 스케줄 작업이 시작되었습니다.');
    }
    
    // 파일 크기 포맷팅
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 스케줄러 종료
    destroy() {
        this.stopAll();
        this.jobs.clear();
        console.log('🛑 크롤링 스케줄러가 종료되었습니다.');
    }
}

module.exports = CrawlingScheduler; 