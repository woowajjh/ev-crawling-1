const express = require('express');
const router = express.Router();

// 스케줄러 인스턴스는 server.js에서 주입받을 예정
let schedulerInstance = null;

// 스케줄러 인스턴스 설정
function setSchedulerInstance(scheduler) {
    schedulerInstance = scheduler;
}

// 스케줄러 상태 조회
router.get('/status', (req, res) => {
    try {
        if (!schedulerInstance) {
            return res.status(503).json({
                success: false,
                message: '스케줄러가 초기화되지 않았습니다.'
            });
        }
        
        const status = schedulerInstance.getStatus();
        
        res.json({
            success: true,
            message: '스케줄러 상태 조회 성공',
            data: status
        });
    } catch (error) {
        console.error('스케줄러 상태 조회 오류:', error);
        res.status(500).json({
            success: false,
            message: '스케줄러 상태 조회 실패',
            error: error.message
        });
    }
});

// 수동 엑셀 크롤링 실행
router.post('/run/excel', async (req, res) => {
    try {
        if (!schedulerInstance) {
            return res.status(503).json({
                success: false,
                message: '스케줄러가 초기화되지 않았습니다.'
            });
        }
        
        await schedulerInstance.runExcelCrawlingNow();
        
        res.json({
            success: true,
            message: '엑셀 크롤링이 수동으로 실행되었습니다.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('수동 엑셀 크롤링 실행 오류:', error);
        res.status(500).json({
            success: false,
            message: '수동 엑셀 크롤링 실행 실패',
            error: error.message
        });
    }
});

// 수동 차량 모델 크롤링 실행
router.post('/run/car-models', async (req, res) => {
    try {
        if (!schedulerInstance) {
            return res.status(503).json({
                success: false,
                message: '스케줄러가 초기화되지 않았습니다.'
            });
        }
        
        await schedulerInstance.runCarModelCrawlingNow();
        
        res.json({
            success: true,
            message: '차량 모델 크롤링이 수동으로 실행되었습니다.',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('수동 차량 모델 크롤링 실행 오류:', error);
        res.status(500).json({
            success: false,
            message: '수동 차량 모델 크롤링 실행 실패',
            error: error.message
        });
    }
});

// 특정 작업 중지
router.post('/stop/:jobName', (req, res) => {
    try {
        const { jobName } = req.params;
        
        if (!schedulerInstance) {
            return res.status(503).json({
                success: false,
                message: '스케줄러가 초기화되지 않았습니다.'
            });
        }
        
        const success = schedulerInstance.stopJob(jobName);
        
        if (success) {
            res.json({
                success: true,
                message: `${jobName} 작업이 중지되었습니다.`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `${jobName} 작업을 찾을 수 없습니다.`
            });
        }
    } catch (error) {
        console.error('작업 중지 오류:', error);
        res.status(500).json({
            success: false,
            message: '작업 중지 실패',
            error: error.message
        });
    }
});

// 특정 작업 시작
router.post('/start/:jobName', (req, res) => {
    try {
        const { jobName } = req.params;
        
        if (!schedulerInstance) {
            return res.status(503).json({
                success: false,
                message: '스케줄러가 초기화되지 않았습니다.'
            });
        }
        
        const success = schedulerInstance.startJob(jobName);
        
        if (success) {
            res.json({
                success: true,
                message: `${jobName} 작업이 시작되었습니다.`
            });
        } else {
            res.status(404).json({
                success: false,
                message: `${jobName} 작업을 찾을 수 없습니다.`
            });
        }
    } catch (error) {
        console.error('작업 시작 오류:', error);
        res.status(500).json({
            success: false,
            message: '작업 시작 실패',
            error: error.message
        });
    }
});

// 모든 작업 중지
router.post('/stop-all', (req, res) => {
    try {
        if (!schedulerInstance) {
            return res.status(503).json({
                success: false,
                message: '스케줄러가 초기화되지 않았습니다.'
            });
        }
        
        schedulerInstance.stopAll();
        
        res.json({
            success: true,
            message: '모든 스케줄 작업이 중지되었습니다.'
        });
    } catch (error) {
        console.error('모든 작업 중지 오류:', error);
        res.status(500).json({
            success: false,
            message: '모든 작업 중지 실패',
            error: error.message
        });
    }
});

// 모든 작업 시작
router.post('/start-all', (req, res) => {
    try {
        if (!schedulerInstance) {
            return res.status(503).json({
                success: false,
                message: '스케줄러가 초기화되지 않았습니다.'
            });
        }
        
        schedulerInstance.startAll();
        
        res.json({
            success: true,
            message: '모든 스케줄 작업이 시작되었습니다.'
        });
    } catch (error) {
        console.error('모든 작업 시작 오류:', error);
        res.status(500).json({
            success: false,
            message: '모든 작업 시작 실패',
            error: error.message
        });
    }
});

// 스케줄러 서비스 정보
router.get('/', (req, res) => {
    res.json({
        service: 'Crawling Scheduler Service',
        status: schedulerInstance ? 'running' : 'not initialized',
        timestamp: new Date().toISOString(),
        endpoints: {
            'GET /': 'Get service information',
            'GET /status': 'Get scheduler status',
            'POST /run/excel': 'Run excel crawling manually',
            'POST /run/car-models': 'Run car models crawling manually',
            'POST /stop/:jobName': 'Stop specific job',
            'POST /start/:jobName': 'Start specific job',
            'POST /stop-all': 'Stop all jobs',
            'POST /start-all': 'Start all jobs'
        }
    });
});

module.exports = { router, setSchedulerInstance }; 