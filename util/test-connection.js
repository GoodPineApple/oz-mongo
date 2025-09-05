// MongoDB 연결 테스트 스크립트
require('dotenv').config();
const database = require('./database');
const logger = require('./logger');

async function testConnection() {
  try {
    logger.connection('Testing MongoDB connection...');
    
    await database.connect();
    
    if (database.isConnected()) {
      logger.success('Connection test successful!');
      logger.info(`Connection state: ${database.getConnection().readyState}`, '📊');
      logger.info(`Database name: ${database.getConnection().name}`, '🏷️');
    } else {
      logger.error('Connection test failed - not connected');
    }
    
  } catch (error) {
    logger.error(`Connection test failed: ${error.message}`);
  } finally {
    await database.close();
    process.exit(0);
  }
}

testConnection();
