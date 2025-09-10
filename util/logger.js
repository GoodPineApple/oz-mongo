const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const morgan = require('morgan');
const path = require('path');

// 로그 디렉토리 생성
const logDir = path.join(process.cwd(), 'logs');
require('fs').mkdirSync(logDir, { recursive: true });

// 색상 코드 정의 (콘솔 출력용)
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Winston 로거 설정
const createWinstonLogger = () => {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // 커스텀 포맷 정의
  const customFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // 콘솔용 컬러 포맷
  const consoleFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, emoji = '', category = '' }) => {
      const colorMap = {
        error: colors.red,
        warn: colors.yellow,
        info: colors.cyan,
        debug: colors.magenta,
        success: colors.green
      };
      
      const color = colorMap[level] || colors.white;
      const categoryStr = category ? `[${category}] ` : '';
      const stackStr = stack && isDevelopment ? `\n${stack}` : '';
      
      return `${color}[${timestamp}] ${emoji} ${level.toUpperCase()}: ${categoryStr}${message}${colors.reset}${stackStr}`;
    })
  );

  // 일반 로그 파일 (info, warn, error)
  const fileTransport = new DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: customFormat,
    level: 'info'
  });

  // 에러 전용 로그 파일
  const errorFileTransport = new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: customFormat,
    level: 'error'
  });

  // HTTP 요청 로그 파일
  const httpFileTransport = new DailyRotateFile({
    filename: path.join(logDir, 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    maxSize: '20m',
    format: customFormat
  });

  const transports = [fileTransport, errorFileTransport];

  // 개발 환경에서는 콘솔 출력 추가
  if (isDevelopment) {
    transports.push(new winston.transports.Console({
      format: consoleFormat,
      level: 'debug'
    }));
  }

  const mainLogger = winston.createLogger({
    level: isDevelopment ? 'debug' : 'info',
    transports
  });

  // HTTP 로그용 별도 로거 생성
  const httpLogger = winston.createLogger({
    level: 'info',
    format: customFormat,
    transports: [httpFileTransport]
  });

  return { mainLogger, httpLogger };
};

// 커스텀 로거 클래스
class Logger {
  constructor() {
    const loggers = createWinstonLogger();
    this.winstonLogger = loggers.mainLogger;
    this.httpLogger = loggers.httpLogger;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  info(message, emoji = 'ℹ️', category = '') {
    this.winstonLogger.info(message, { emoji, category });
  }

  success(message, emoji = '✅', category = '') {
    // Winston에는 success 레벨이 없으므로 info 레벨로 처리
    this.winstonLogger.info(message, { emoji, category, level: 'success' });
  }

  warning(message, emoji = '⚠️', category = '') {
    this.winstonLogger.warn(message, { emoji, category });
  }

  error(message, emoji = '❌', category = '', error = null) {
    if (error) {
      this.winstonLogger.error(message, { emoji, category, stack: error.stack });
    } else {
      this.winstonLogger.error(message, { emoji, category });
    }
  }

  debug(message, emoji = '🐛', category = '') {
    this.winstonLogger.debug(message, { emoji, category });
  }

  // 특별한 용도의 로그들
  database(message, emoji = '🔌') {
    this.info(message, emoji, 'DATABASE');
  }

  seed(message, emoji = '🌱') {
    this.info(message, emoji, 'SEED');
  }

  connection(message, emoji = '🔄') {
    this.info(message, emoji, 'CONNECTION');
  }

  // Morgan HTTP 로거 설정
  getHttpLogger() {
    if (this.isDevelopment) {
      // 개발 환경: 상세한 로그
      return morgan('combined', {
        stream: {
          write: (message) => {
            // 콘솔에 컬러로 출력
            console.log(`${colors.blue}[HTTP]${colors.reset} ${message.trim()}`);
            // 파일에 로그 저장
            this.httpLogger.info(message.trim(), { category: 'HTTP' });
          }
        }
      });
    } else {
      // 프로덕션 환경: 간단한 로그
      return morgan('common', {
        stream: {
          write: (message) => {
            this.httpLogger.info(message.trim(), { category: 'HTTP' });
          }
        }
      });
    }
  }

  // 에러 전용 HTTP 로거
  getErrorLogger() {
    return morgan('combined', {
      skip: (req, res) => res.statusCode < 400,
      stream: {
        write: (message) => {
          if (this.isDevelopment) {
            console.error(`${colors.red}[HTTP ERROR]${colors.reset} ${message.trim()}`);
          }
          this.httpLogger.error(message.trim(), { category: 'HTTP_ERROR' });
        }
      }
    });
  }
}

// 싱글톤 로거 인스턴스
const logger = new Logger();

module.exports = logger;
