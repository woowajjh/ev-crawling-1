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
        const limitParam = parseInt(limit) || 50;
        const offsetParam = parseInt(offset) || 0;
        params.push(limitParam, offsetParam);
        
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
                limit: limitParam,
                offset: offsetParam,
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
        const limitParam = parseInt(limit) || 50;
        const offsetParam = parseInt(offset) || 0;
        params.push(limitParam, offsetParam);
        
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
                limit: limitParam,
                offset: offsetParam,
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
        const limitParam = parseInt(limit) || 50;
        const offsetParam = parseInt(offset) || 0;
        params.push(limitParam, offsetParam);
        
        const [rows] = await connection.execute(query, params);
        
        await connection.end();
        
        res.json({
            success: true,
            data: rows,
            pagination: {
                limit: limitParam,
                offset: offsetParam
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

// 차량 모델별 보조금 조회 API (새로운 car_model_subsidies 테이블)
router.get('/subsidies', async (req, res) => {
    const { 
        year = 2025, 
        manufacturer, 
        modelName, 
        sido, 
        regionName,
        vehicleType = '전기차',
        sortBy = 'total_subsidy',
        sortOrder = 'DESC',
        limit = 50, 
        offset = 0 
    } = req.query;
    
    try {
        const connection = await getConnection();
        
        // 파라미터 안전 처리
        const yearParam = parseInt(year) || 2025;
        const vehicleTypeParam = String(vehicleType || '전기차');
        
        console.log('API 파라미터:', { year: yearParam, vehicleType: vehicleTypeParam });
        
        let query = `
            SELECT 
                id, year, sido, region_name, local_code, vehicle_type, 
                manufacturer, model_name, national_subsidy, local_subsidy, 
                total_subsidy, created_at, updated_at
            FROM car_model_subsidies 
            WHERE year = ? AND vehicle_type = ?
        `;
        
        const params = [yearParam, vehicleTypeParam];
        
        // 필터 조건 추가
        if (manufacturer) {
            query += ' AND manufacturer = ?';
            params.push(manufacturer);
        }
        
        if (modelName) {
            query += ' AND model_name LIKE ?';
            params.push(`%${modelName}%`);
        }
        
        if (sido) {
            query += ' AND sido = ?';
            params.push(sido);
        }
        
        if (regionName) {
            query += ' AND region_name LIKE ?';
            params.push(`%${regionName}%`);
        }
        
        // 정렬
        const validSortColumns = ['total_subsidy', 'national_subsidy', 'local_subsidy', 'manufacturer', 'model_name', 'region_name'];
        const validSortOrder = ['ASC', 'DESC'];
        
        if (validSortColumns.includes(sortBy) && validSortOrder.includes(sortOrder.toUpperCase())) {
            query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
        } else {
            query += ' ORDER BY total_subsidy DESC';
        }
        
        query += ' LIMIT ? OFFSET ?';
        const limitParam = parseInt(limit) || 50;
        const offsetParam = parseInt(offset) || 0;
        params.push(limitParam, offsetParam);
        
        console.log('최종 쿼리:', query);
        console.log('최종 파라미터:', params);
        console.log('파라미터 타입:', params.map(p => typeof p));
        
        // execute 대신 query 사용해보기
        const [rows] = await connection.query(query, params);
        
        // 통계 정보 계산
        let statsQuery = `
            SELECT 
                COUNT(*) as total_count,
                AVG(national_subsidy) as avg_national_subsidy,
                AVG(local_subsidy) as avg_local_subsidy,
                AVG(total_subsidy) as avg_total_subsidy,
                MAX(total_subsidy) as max_total_subsidy,
                MIN(total_subsidy) as min_total_subsidy,
                COUNT(DISTINCT manufacturer) as manufacturer_count,
                COUNT(DISTINCT model_name) as model_count,
                COUNT(DISTINCT region_name) as region_count
            FROM car_model_subsidies 
            WHERE year = ? AND vehicle_type = ?
        `;
        
        let statsParams = [yearParam, vehicleTypeParam];
        
        if (manufacturer) {
            statsQuery += ' AND manufacturer = ?';
            statsParams.push(manufacturer);
        }
        
        if (modelName) {
            statsQuery += ' AND model_name LIKE ?';
            statsParams.push(`%${modelName}%`);
        }
        
        if (sido) {
            statsQuery += ' AND sido = ?';
            statsParams.push(sido);
        }
        
        if (regionName) {
            statsQuery += ' AND region_name LIKE ?';
            statsParams.push(`%${regionName}%`);
        }
        
        const [stats] = await connection.query(statsQuery, statsParams);
        
        await connection.end();
        
        res.json({
            success: true,
            message: '차량 모델별 보조금 조회 성공',
            data: rows,
            statistics: stats[0],
            pagination: {
                limit: limitParam,
                offset: offsetParam,
                total: stats[0].total_count
            },
            filters: {
                year,
                vehicleType,
                manufacturer,
                modelName,
                sido,
                regionName,
                sortBy,
                sortOrder
            }
        });
    } catch (error) {
        console.error('차량 모델별 보조금 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '차량 모델별 보조금 조회 실패',
            error: error.message
        });
    }
});

// 특정 모델의 지역별 보조금 비교 API
router.get('/subsidies/by-model', async (req, res) => {
    const { year = 2025, manufacturer, modelName, vehicleType = '전기차' } = req.query;
    
    if (!manufacturer || !modelName) {
        return res.status(400).json({
            success: false,
            message: '제조사와 모델명을 모두 입력해주세요'
        });
    }
    
    try {
        const connection = await getConnection();
        
        // 파라미터 안전 처리
        const yearParam = parseInt(year) || 2025;
        const vehicleTypeParam = String(vehicleType || '전기차');
        const manufacturerParam = String(manufacturer);
        const modelNameParam = String(modelName);
        
        // 특정 모델의 지역별 보조금 조회
        const [modelData] = await connection.query(`
            SELECT 
                sido, region_name, local_code, vehicle_type,
                manufacturer, model_name, national_subsidy, 
                local_subsidy, total_subsidy, created_at
            FROM car_model_subsidies 
            WHERE year = ? AND vehicle_type = ? AND manufacturer = ? AND model_name = ?
            ORDER BY total_subsidy DESC
        `, [yearParam, vehicleTypeParam, manufacturerParam, modelNameParam]);
        
        if (modelData.length === 0) {
            return res.status(404).json({
                success: false,
                message: '해당 모델의 보조금 데이터를 찾을 수 없습니다.'
            });
        }
        
        // 통계 계산
        const subsidies = modelData.map(item => item.total_subsidy);
        const nationalSubsidies = modelData.map(item => item.national_subsidy);
        const localSubsidies = modelData.map(item => item.local_subsidy);
        
        await connection.end();
        
        res.json({
            success: true,
            message: '모델별 지역 보조금 조회 성공',
                            data: {
                    modelInfo: {
                        manufacturer: manufacturerParam,
                        modelName: modelNameParam,
                        vehicleType: vehicleTypeParam,
                        year: yearParam
                    },
                regionalSubsidies: modelData,
                summary: {
                    totalRegions: modelData.length,
                    maxTotalSubsidy: Math.max(...subsidies),
                    minTotalSubsidy: Math.min(...subsidies),
                    avgTotalSubsidy: Math.round(subsidies.reduce((sum, val) => sum + val, 0) / subsidies.length),
                    maxLocalSubsidy: Math.max(...localSubsidies),
                    minLocalSubsidy: Math.min(...localSubsidies),
                    avgLocalSubsidy: Math.round(localSubsidies.reduce((sum, val) => sum + val, 0) / localSubsidies.length),
                    avgNationalSubsidy: Math.round(nationalSubsidies.reduce((sum, val) => sum + val, 0) / nationalSubsidies.length)
                },
                bestRegions: {
                    highest: modelData.slice(0, 5), // 상위 5개 지역
                    lowest: modelData.slice(-5).reverse() // 하위 5개 지역
                }
            }
        });
    } catch (error) {
        console.error('모델별 지역 보조금 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '모델별 지역 보조금 조회 실패',
            error: error.message
        });
    }
});

// 제조사별 모델 목록 조회 API
router.get('/subsidies/manufacturers', async (req, res) => {
    const { year = 2025, vehicleType = '전기차' } = req.query;
    
    try {
        const connection = await getConnection();
        
        // 파라미터 안전 처리
        const yearParam = parseInt(year) || 2025;
        const vehicleTypeParam = String(vehicleType || '전기차');
        
        const [manufacturers] = await connection.query(`
            SELECT 
                manufacturer,
                COUNT(DISTINCT model_name) as model_count,
                COUNT(DISTINCT region_name) as region_count,
                AVG(total_subsidy) as avg_total_subsidy,
                MAX(total_subsidy) as max_total_subsidy,
                MIN(total_subsidy) as min_total_subsidy
            FROM car_model_subsidies 
            WHERE year = ? AND vehicle_type = ?
            GROUP BY manufacturer
            ORDER BY manufacturer
        `, [yearParam, vehicleTypeParam]);
        
        await connection.end();
        
        res.json({
            success: true,
            message: '제조사별 보조금 정보 조회 성공',
            data: manufacturers.map(item => ({
                manufacturer: item.manufacturer,
                modelCount: item.model_count,
                regionCount: item.region_count,
                avgTotalSubsidy: Math.round(item.avg_total_subsidy || 0),
                maxTotalSubsidy: item.max_total_subsidy || 0,
                minTotalSubsidy: item.min_total_subsidy || 0
            }))
        });
    } catch (error) {
        console.error('제조사별 보조금 정보 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '제조사별 보조금 정보 조회 실패',
            error: error.message
        });
    }
});

// 지역별 보조금 순위 API
router.get('/subsidies/regions', async (req, res) => {
    const { year = 2025, vehicleType = '전기차', limit = 20 } = req.query;
    
    try {
        const connection = await getConnection();
        
        // 파라미터 검증 및 변환
        const yearParam = parseInt(year) || 2025;
        const vehicleTypeParam = vehicleType || '전기차';
        const limitParam = parseInt(limit) || 20;
        
        // limitParam이 유효한 숫자인지 확인
        if (limitParam <= 0 || limitParam > 1000) {
            return res.status(400).json({
                success: false,
                message: 'limit 값은 1~1000 사이의 숫자여야 합니다.'
            });
        }
        
        console.log('지역별 보조금 순위 API 파라미터:', {
            year: yearParam,
            vehicleType: vehicleTypeParam,
            limit: limitParam
        });
        
        const [regions] = await connection.query(`
            SELECT 
                sido, region_name, local_code,
                COUNT(DISTINCT manufacturer) as manufacturer_count,
                COUNT(DISTINCT model_name) as model_count,
                AVG(national_subsidy) as avg_national_subsidy,
                AVG(local_subsidy) as avg_local_subsidy,
                AVG(total_subsidy) as avg_total_subsidy,
                MAX(total_subsidy) as max_total_subsidy,
                MIN(total_subsidy) as min_total_subsidy
            FROM car_model_subsidies 
            WHERE year = ? AND vehicle_type = ?
            GROUP BY sido, region_name, local_code
            ORDER BY avg_total_subsidy DESC
            LIMIT ?
        `, [yearParam, vehicleTypeParam, limitParam]);
        
        await connection.end();
        
        res.json({
            success: true,
            message: '지역별 보조금 순위 조회 성공',
            data: regions.map((item, index) => ({
                rank: index + 1,
                sido: item.sido,
                regionName: item.region_name,
                localCode: item.local_code,
                manufacturerCount: item.manufacturer_count,
                modelCount: item.model_count,
                avgNationalSubsidy: Math.round(item.avg_national_subsidy || 0),
                avgLocalSubsidy: Math.round(item.avg_local_subsidy || 0),
                avgTotalSubsidy: Math.round(item.avg_total_subsidy || 0),
                maxTotalSubsidy: item.max_total_subsidy || 0,
                minTotalSubsidy: item.min_total_subsidy || 0
            }))
        });
    } catch (error) {
        console.error('지역별 보조금 순위 조회 API 오류:', error);
        res.status(500).json({
            success: false,
            message: '지역별 보조금 순위 조회 실패',
            error: error.message
        });
    }
});

// 보조금 비교 API (기존)
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

// 간단한 쿼리 테스트 API
router.get('/debug/simple-query', async (req, res) => {
    try {
        const connection = await getConnection();
        
        // 1. 파라미터 없는 간단한 쿼리
        const [simpleResult] = await connection.execute(`
            SELECT COUNT(*) as count FROM car_model_subsidies
        `);
        
        // 2. 하드코딩된 값으로 WHERE 절 테스트
        const [hardcodedResult] = await connection.execute(`
            SELECT COUNT(*) as count FROM car_model_subsidies 
            WHERE year = 2025 AND vehicle_type = '전기차'
        `);
        
        // 3. 파라미터 바인딩 테스트 (숫자)
        const [yearOnlyResult] = await connection.execute(`
            SELECT COUNT(*) as count FROM car_model_subsidies WHERE year = ?
        `, [2025]);
        
        // 4. 파라미터 바인딩 테스트 (문자열)
        const [vehicleOnlyResult] = await connection.execute(`
            SELECT COUNT(*) as count FROM car_model_subsidies WHERE vehicle_type = ?
        `, ['전기차']);
        
        // 5. 두 파라미터 모두 바인딩 테스트
        let bothParamsResult = null;
        try {
            const [result] = await connection.execute(`
                SELECT COUNT(*) as count FROM car_model_subsidies 
                WHERE year = ? AND vehicle_type = ?
            `, [2025, '전기차']);
            bothParamsResult = result;
        } catch (error) {
            bothParamsResult = { error: error.message };
        }
        
        await connection.end();
        
        res.json({
            success: true,
            message: '쿼리 테스트 완료',
            tests: {
                simple: simpleResult[0],
                hardcoded: hardcodedResult[0], 
                yearOnly: yearOnlyResult[0],
                vehicleOnly: vehicleOnlyResult[0],
                bothParams: bothParamsResult
            }
        });
        
    } catch (error) {
        console.error('쿼리 테스트 오류:', error);
        res.status(500).json({
            success: false,
            message: '쿼리 테스트 실패',
            error: error.message
        });
    }
});

// 테이블 상태 확인 API (디버깅용)
router.get('/debug/table-status', async (req, res) => {
    try {
        const connection = await getConnection();
        
        // 1. 테이블 존재 확인
        const [tableExists] = await connection.execute(`
            SHOW TABLES LIKE 'car_model_subsidies'
        `);
        
        console.log('테이블 존재 여부:', tableExists.length > 0);
        
        if (tableExists.length === 0) {
            await connection.end();
            return res.json({
                success: false,
                message: 'car_model_subsidies 테이블이 존재하지 않습니다.'
            });
        }
        
        // 2. 테이블 구조 확인
        const [tableStructure] = await connection.execute(`
            DESCRIBE car_model_subsidies
        `);
        
        // 3. 데이터 개수 확인 (간단한 COUNT 쿼리)
        const [countResult] = await connection.execute(`
            SELECT COUNT(*) as total_count FROM car_model_subsidies
        `);
        
        // 4. 샘플 데이터 1개만 조회
        const [sampleData] = await connection.execute(`
            SELECT * FROM car_model_subsidies LIMIT 1
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            message: '테이블 상태 확인 완료',
            data: {
                tableExists: true,
                totalCount: countResult[0].total_count,
                hasData: countResult[0].total_count > 0,
                sampleData: sampleData[0] || null,
                tableStructure: tableStructure.map(col => ({
                    field: col.Field,
                    type: col.Type
                }))
            }
        });
        
    } catch (error) {
        console.error('테이블 상태 확인 오류:', error);
        res.status(500).json({
            success: false,
            message: '테이블 상태 확인 실패',
            error: error.message,
            code: error.code
        });
    }
});

module.exports = router; 