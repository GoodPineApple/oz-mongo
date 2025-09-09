const logger = require('./logger');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

class JWTService {
  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-key-for-development-only';
    this.jwtExpire = process.env.JWT_EXPIRE || '7d';
    this.saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    
    if (!process.env.JWT_SECRET) {
      logger.warning('JWT_SECRET not found in environment variables. Using fallback secret.');
      logger.info('Please set JWT_SECRET in .env file for production security.');
    }
    
    logger.success('JWT service initialized');
  }

  /**
   * 비밀번호 해시화
   * @param {string} password - 평문 비밀번호
   * @returns {Promise<string>} - 해시화된 비밀번호
   */
  async hashPassword(password) {
    try {
      const hashedPassword = await bcrypt.hash(password, this.saltRounds);
      logger.debug(`Password hashed with ${this.saltRounds} salt rounds`);
      return hashedPassword;
    } catch (error) {
      logger.error(`Password hashing failed: ${error.message}`);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * 비밀번호 검증
   * @param {string} password - 평문 비밀번호
   * @param {string} hashedPassword - 해시화된 비밀번호
   * @returns {Promise<boolean>} - 검증 결과
   */
  async comparePassword(password, hashedPassword) {
    try {
      const isMatch = await bcrypt.compare(password, hashedPassword);
      logger.debug(`Password comparison result: ${isMatch}`);
      return isMatch;
    } catch (error) {
      logger.error(`Password comparison failed: ${error.message}`);
      return false;
    }
  }

  /**
   * JWT 토큰 생성
   * @param {Object} payload - 토큰에 포함할 데이터 (user id, email 등)
   * @returns {string} - JWT 토큰
   */
  generateToken(payload) {
    try {
      const token = jwt.sign(payload, this.jwtSecret, {
        expiresIn: this.jwtExpire,
        issuer: 'memo-app',
        audience: 'memo-app-users'
      });
      logger.debug(`JWT token generated for user: ${payload.userId}`);
      return token;
    } catch (error) {
      logger.error(`Token generation failed: ${error.message}`);
      throw new Error('Token generation failed');
    }
  }

  /**
   * JWT 토큰 검증
   * @param {string} token - 검증할 JWT 토큰
   * @returns {Object|null} - 디코딩된 페이로드 또는 null
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: 'memo-app',
        audience: 'memo-app-users'
      });
      logger.debug(`JWT token verified for user: ${decoded.userId}`);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        logger.warning('JWT token has expired');
      } else if (error.name === 'JsonWebTokenError') {
        logger.warning('Invalid JWT token');
      } else {
        logger.error(`Token verification failed: ${error.message}`);
      }
      return null;
    }
  }

  /**
   * 토큰에서 사용자 ID 추출
   * @param {string} token - JWT 토큰
   * @returns {string|null} - 사용자 ID 또는 null
   */
  getUserIdFromToken(token) {
    const decoded = this.verifyToken(token);
    return decoded ? decoded.userId : null;
  }

  /**
   * Authorization 헤더에서 토큰 추출
   * @param {string} authHeader - Authorization 헤더 값
   * @returns {string|null} - 토큰 또는 null
   */
  extractTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // 'Bearer ' 제거
  }

  /**
   * 리프레시 토큰 생성
   * @param {Object} payload - 토큰에 포함할 데이터
   * @returns {string} - 리프레시 토큰
   */
  generateRefreshToken(payload) {
    // 리프레시 토큰은 보통 더 긴 만료 시간을 가짐
    try {
      const refreshToken = jwt.sign(payload, this.jwtSecret, {
        expiresIn: '30d',
        issuer: 'memo-app',
        audience: 'memo-app-users'
      });
      logger.debug(`Refresh token generated for user: ${payload.userId}`);
      return refreshToken;
    } catch (error) {
      logger.error(`Refresh token generation failed: ${error.message}`);
      throw new Error('Refresh token generation failed');
    }
  }
}

// 싱글톤 인스턴스
const jwtService = new JWTService();

module.exports = jwtService;
