// MongoDB 연결 테스트 스크립트
require('dotenv').config();
const database = require('./database');

async function testConnection() {
  try {
    console.log('🔄 Testing MongoDB connection...');
    
    await database.connect();
    
    if (database.isConnected()) {
      console.log('✅ Connection test successful!');
      console.log('📊 Connection state:', database.getConnection().readyState);
      console.log('🏷️  Database name:', database.getConnection().name);
    } else {
      console.log('❌ Connection test failed - not connected');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  } finally {
    await database.close();
    process.exit(0);
  }
}

testConnection();
