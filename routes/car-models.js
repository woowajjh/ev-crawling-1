const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const config = require('../config');
const CarModelCrawler = require('../crawl-car-models');

// 데이터베이스 연결 함수
async function getConnection() {
    return await mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_NAME
    });
}

// 차종별 보조금 크롤링 API
router.post('/crawl/car-types', async (req, res) => {
    const { year = 2025, carType = '11' } = req.body;
    
    try {
        const crawler = new CarModelCrawler();
        await crawler.initialize();
        
        const result = await crawler.crawlCarTypeSubsidies(year, carType);
        
        await crawler.close();
        
        res.json({
            success: true,
            message: '차종별 보조금 크롤링 완료',
            data: result
        });
    } catch (error) {
        console.error('차종별 보조금 크롤링 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '차종별 보조금 크롤링 실패',
            error: error.message
        });
    }
});

// 모델별 지방비 크롤링 API
router.post('/crawl/model-local', async (req, res) => {
    const { year = 2025, localCd = '1100', carType = '11' } = req.body;
    
    try {
        const crawler = new CarModelCrawler();
        await crawler.initialize();
        
        const result = await crawler.crawlModelLocalSubsidies(year, localCd, carType);
        
        await crawler.close();
        
        res.json({
            success: true,
            message: '모델별 지방비 크롤링 완료',
            data: result
        });
    } catch (error) {
        console.error('모델별 지방비 크롤링 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '모델별 지방비 크롤링 실패',
            error: error.message
        });
    }
});

// 전체 지역 크롤링 API
router.post('/crawl/all-regions', async (req, res) => {
    const { year = 2025, carType = '11' } = req.body;
    
    try {
        const crawler = new CarModelCrawler();
        await crawler.initialize();
        
        const results = await crawler.crawlAllRegions(year, carType);
        
        await crawler.close();
        
        res.json({
            success: true,
            message: '전체 지역 크롤링 완료',
            data: results
        });
    } catch (error) {
        console.error('전체 지역 크롤링 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '전체 지역 크롤링 실패',
            error: error.message
        });
    }
});

// 차종별 보조금 조회 API
router.get('/car-types', async (req, res) => {
    const { year = 2025, carType, manufacturer, limit = 50, offset = 0 } = req.query;
    
    try {
        const connection = await getConnection();
        
        let query = `
            SELECT 
                id, year, car_type_code, car_type_name, manufacturer, model_name,
                battery_capacity, driving_range, national_subsidy, local_subsidy,
                total_subsidy, car_price, final_price, notes, created_at, updated_at
            FROM car_type_subsidies 
            WHERE year = ?
        `;
        
        const params = [year];
        
        if (carType) {
            query += ' AND car_type_code = ?';
            params.push(carType);
        }
        
        if (manufacturer) {
            query += ' AND manufacturer LIKE ?';
            params.push(`%${manufacturer}%`);
        }
        
        query += ' ORDER BY manufacturer, model_name LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await connection.execute(query, params);
        
        // 통계 정보 추가
        let statsQuery = `
            SELECT 
                COUNT(*) as total_count,
                AVG(national_subsidy) as avg_national_subsidy,
                AVG(local_subsidy) as avg_local_subsidy,
                AVG(total_subsidy) as avg_total_subsidy,
                MAX(total_subsidy) as max_total_subsidy,
                MIN(total_subsidy) as min_total_subsidy
            FROM car_type_subsidies 
            WHERE year = ?
        `;
        
        let statsParams = [year];
        
        if (carType) {
            statsQuery += ' AND car_type_code = ?';
            statsParams.push(carType);
        }
        
        const [stats] = await connection.execute(statsQuery, statsParams);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows,
            statistics: stats[0],
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: stats[0].total_count
            }
        });
    } catch (error) {
        console.error('차종별 보조금 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '차종별 보조금 조회 실패',
            error: error.message
        });
    }
});

// 모델별 지방비 조회 API
router.get('/model-local', async (req, res) => {
    const { year = 2025, localCd, carType, manufacturer, limit = 50, offset = 0 } = req.query;
    
    try {
        const connection = await getConnection();
        
        let query = `
            SELECT 
                id, year, local_cd, local_name, car_type_code, car_type_name,
                manufacturer, model_name, battery_capacity, driving_range,
                national_subsidy, local_subsidy, total_subsidy, car_price,
                final_price, notes, created_at, updated_at
            FROM model_local_subsidies 
            WHERE year = ?
        `;
        
        const params = [year];
        
        if (localCd) {
            query += ' AND local_cd = ?';
            params.push(localCd);
        }
        
        if (carType) {
            query += ' AND car_type_code = ?';
            params.push(carType);
        }
        
        if (manufacturer) {
            query += ' AND manufacturer LIKE ?';
            params.push(`%${manufacturer}%`);
        }
        
        query += ' ORDER BY local_name, manufacturer, model_name LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await connection.execute(query, params);
        
        // 통계 정보 추가
        let statsQuery = `
            SELECT 
                COUNT(*) as total_count,
                AVG(national_subsidy) as avg_national_subsidy,
                AVG(local_subsidy) as avg_local_subsidy,
                AVG(total_subsidy) as avg_total_subsidy,
                MAX(total_subsidy) as max_total_subsidy,
                MIN(total_subsidy) as min_total_subsidy
            FROM model_local_subsidies 
            WHERE year = ?
        `;
        
        let statsParams = [year];
        
        if (localCd) {
            statsQuery += ' AND local_cd = ?';
            statsParams.push(localCd);
        }
        
        if (carType) {
            statsQuery += ' AND car_type_code = ?';
            statsParams.push(carType);
        }
        
        const [stats] = await connection.execute(statsQuery, statsParams);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows,
            statistics: stats[0],
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: stats[0].total_count
            }
        });
    } catch (error) {
        console.error('모델별 지방비 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '모델별 지방비 조회 실패',
            error: error.message
        });
    }
});

// 지역 코드 조회 API
router.get('/local-codes', async (req, res) => {
    try {
        const connection = await getConnection();
        
        const [rows] = await connection.execute(`
            SELECT local_cd, local_name, region_type, parent_local_cd, is_active
            FROM local_codes 
            WHERE is_active = 1
            ORDER BY local_cd
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('지역 코드 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '지역 코드 조회 실패',
            error: error.message
        });
    }
});

// 차종 코드 조회 API
router.get('/car-types-codes', async (req, res) => {
    try {
        const connection = await getConnection();
        
        const [rows] = await connection.execute(`
            SELECT car_type_code, car_type_name, description, is_active
            FROM car_type_codes 
            WHERE is_active = 1
            ORDER BY car_type_code
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows
        });
    } catch (error) {
        console.error('차종 코드 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '차종 코드 조회 실패',
            error: error.message
        });
    }
});

// 크롤링 로그 조회 API
router.get('/crawling-logs', async (req, res) => {
    const { crawlType, year, status, limit = 50, offset = 0 } = req.query;
    
    try {
        const connection = await getConnection();
        
        let query = `
            SELECT 
                id, crawl_type, year, local_cd, car_type_code, status,
                record_count, error_message, crawl_duration, created_at
            FROM crawling_logs 
            WHERE 1=1
        `;
        
        const params = [];
        
        if (crawlType) {
            query += ' AND crawl_type = ?';
            params.push(crawlType);
        }
        
        if (year) {
            query += ' AND year = ?';
            params.push(year);
        }
        
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const [rows] = await connection.execute(query, params);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('크롤링 로그 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '크롤링 로그 조회 실패',
            error: error.message
        });
    }
});

// 보조금 비교 API
router.get('/compare', async (req, res) => {
    const { year = 2025, manufacturer, modelName } = req.query;
    
    if (!manufacturer || !modelName) {
        return res.status(400).json({
            success: false,
            message: '제조사와 모델명을 모두 입력해주세요'
        });
    }
    
    try {
        const connection = await getConnection();
        
        // 차종별 보조금 조회
        const [carTypeData] = await connection.execute(`
            SELECT 
                car_type_code, car_type_name, manufacturer, model_name,
                national_subsidy, local_subsidy, total_subsidy, car_price, final_price
            FROM car_type_subsidies 
            WHERE year = ? AND manufacturer = ? AND model_name = ?
        `, [year, manufacturer, modelName]);
        
        // 모델별 지방비 조회
        const [modelLocalData] = await connection.execute(`
            SELECT 
                local_cd, local_name, manufacturer, model_name,
                national_subsidy, local_subsidy, total_subsidy, car_price, final_price
            FROM model_local_subsidies 
            WHERE year = ? AND manufacturer = ? AND model_name = ?
            ORDER BY local_subsidy DESC
        `, [year, manufacturer, modelName]);
        
        await connection.end();
        
        res.json({
            success: true,
            data: {
                carTypeSubsidy: carTypeData[0] || null,
                localSubsidies: modelLocalData,
                summary: {
                    totalRegions: modelLocalData.length,
                    maxLocalSubsidy: Math.max(...modelLocalData.map(item => item.local_subsidy || 0)),
                    minLocalSubsidy: Math.min(...modelLocalData.map(item => item.local_subsidy || 0)),
                    avgLocalSubsidy: modelLocalData.reduce((sum, item) => sum + (item.local_subsidy || 0), 0) / modelLocalData.length
                }
            }
        });
    } catch (error) {
        console.error('보조금 비교 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '보조금 비교 조회 실패',
            error: error.message
        });
    }
});

module.exports = router; 