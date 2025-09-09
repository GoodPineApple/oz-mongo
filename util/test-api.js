// API 테스트 스크립트
require('dotenv').config();
const logger = require('./logger');

const BASE_URL = 'http://localhost:3000/api';

// 간단한 HTTP 클라이언트 (axios 없이)
const http = require('http');
const https = require('https');
const { URL } = require('url');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

async function testAPI() {
  try {
    logger.info('🧪 Starting API tests...');

    // 1. API 루트 테스트
    logger.info('Testing API root endpoint...');
    const rootResponse = await makeRequest(`${BASE_URL}/`);
    if (rootResponse.status === 200) {
      logger.success('✅ API root endpoint working');
    } else {
      logger.error(`❌ API root failed: ${rootResponse.status}`);
    }

    // 2. 디자인 템플릿 조회 테스트
    logger.info('Testing design templates endpoint...');
    const templatesResponse = await makeRequest(`${BASE_URL}/templates`);
    if (templatesResponse.status === 200) {
      logger.success(`✅ Design templates endpoint working (${templatesResponse.data?.length || 0} templates)`);
    } else {
      logger.error(`❌ Design templates failed: ${templatesResponse.status}`);
    }

    // 3. 메모 조회 테스트
    logger.info('Testing memos endpoint...');
    const memosResponse = await makeRequest(`${BASE_URL}/memos`);
    if (memosResponse.status === 200) {
      logger.success(`✅ Memos endpoint working (${memosResponse.data?.length || 0} memos)`);
    } else {
      logger.error(`❌ Memos failed: ${memosResponse.status}`);
    }

    // 4. 사용자 조회 테스트
    logger.info('Testing users endpoint...');
    const usersResponse = await makeRequest(`${BASE_URL}/users`);
    if (usersResponse.status === 200) {
      logger.success(`✅ Users endpoint working (${usersResponse.data?.users?.length || 0} users)`);
    } else {
      logger.error(`❌ Users failed: ${usersResponse.status}`);
    }

    // 5. 인증 엔드포인트 테스트
    logger.info('Testing auth endpoints...');
    
    // 회원가입 테스트
    const registerResponse = await makeRequest(`${BASE_URL}/auth/register`, {
      method: 'POST',
      data: {
        username: 'testuser_' + Date.now(),
        email: `test_${Date.now()}@example.com`,
        password: 'password123'
      }
    });
    
    if (registerResponse.status === 201) {
      logger.success('✅ Registration endpoint working');
      logger.info('📧 Check console for verification email details');
    } else {
      logger.error(`❌ Registration failed: ${registerResponse.status}`);
    }
    
    // 로그인 테스트 (이메일 미인증 상태)
    const loginResponse = await makeRequest(`${BASE_URL}/auth/login`, {
      method: 'POST',
      data: {
        username: 'testuser',
        password: 'password123'
      }
    });
    
    if (loginResponse.status === 403) {
      logger.success('✅ Email verification check working');
    } else if (loginResponse.status === 401) {
      logger.info('ℹ️ Login endpoint working (user not found)');
    } else {
      logger.error(`❌ Login test unexpected: ${loginResponse.status}`);
    }

    logger.success('🎉 API tests completed!');

  } catch (error) {
    logger.error(`❌ API test failed: ${error.message}`);
    logger.info('💡 Make sure the server is running: npm start');
  }
}

// 스크립트가 직접 실행될 때만 테스트 실행
if (require.main === module) {
  testAPI();
}

module.exports = { testAPI };
