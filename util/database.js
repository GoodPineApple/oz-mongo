const mongoose = require('mongoose');

class Database {
  constructor() {
    this._connection = null;
    this._isConnecting = false;
  }

  async connect() {
    // 이미 연결되어 있으면 기존 연결 반환
    if (this._connection && mongoose.connection.readyState === 1) {
      return this._connection;
    }

    // 연결 중이면 대기
    if (this._isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (mongoose.connection.readyState === 1) {
            resolve(this._connection);
          } else if (mongoose.connection.readyState === 3) {
            reject(new Error('Connection failed'));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    try {
      this._isConnecting = true;
      
      const url = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_HOST_URI}/?retryWrites=true&w=majority&appName=${process.env.MONGODB_APP_NAME}`;
      
      await mongoose.connect(url, {
        maxPoolSize: 10, // 최대 연결 풀 크기
        serverSelectionTimeoutMS: 5000, // 서버 선택 타임아웃
        socketTimeoutMS: 45000, // 소켓 타임아웃
      });
      console.log('✅ Connected to MongoDB');

      this._connection = mongoose.connection;
      
      // 연결 이벤트 리스너 설정
      this._connection.on('connected', () => {
        console.log('✅ Connected to MongoDB');
      });

      this._connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
      });

      this._connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
      });

      // 프로세스 종료 시 연결 정리
      process.on('SIGINT', this.close.bind(this));
      process.on('SIGTERM', this.close.bind(this));

      this._isConnecting = false;
      return this._connection;

    } catch (error) {
      this._isConnecting = false;
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async close() {
    if (this._connection) {
      await mongoose.connection.close();
      this._connection = null;
      console.log('🔌 MongoDB connection closed');
    }
  }

  getConnection() {
    return this._connection;
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  // mongoose 인스턴스 반환 (모델에서 사용)
  getMongoose() {
    return mongoose;
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const database = new Database();

module.exports = database;
