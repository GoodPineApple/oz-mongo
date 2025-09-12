const { createClient } = require("redis");
const logger = require('./logger');

let client = null;

const connectRedis = async () => {
  try {
    client = createClient({
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      socket: {
        host: process.env.REDIS_HOST_URL,
        port: parseInt(process.env.REDIS_PORT || '17538')
      }
    });
    
    client.on('error', err => {
      logger.error('Redis Client Error:', err);
    });
    
    await client.connect();
    logger.info('Redis connected successfully');
    
    // Redis 연결 테스트
    await client.set('foo', 'bar');
    const result = await client.get('foo');
    logger.info(`Redis test result: ${result}`);
    
    // 세션 테스트
    await client.set('session:test', 'test', { EX: 30 });
    const sessionResult = await client.get('session:test');
    logger.info(`Redis session test result: ${sessionResult}`);
    
    // TTL 모니터링 (30초간)
    const setinterval = setInterval(async () => {
      try {
        const expiresAt = await client.ttl('session:test');
        logger.info(`Session TTL: ${expiresAt} seconds`);
      } catch (err) {
        logger.error('TTL check error:', err);
      }
    }, 2000);
    
    setTimeout(() => {
      clearInterval(setinterval);
      logger.info('Redis connection test completed');
    }, 30000);
    
    return client;
  } catch (error) {
    logger.error(`Failed to connect to Redis: ${error.message}`);
    throw error;
  }
};

const getRedisClient = () => {
  if (!client) {
    throw new Error('Redis client is not connected. Call connectRedis() first.');
  }
  return client;
};

module.exports = {
  connectRedis,
  getRedisClient
};
