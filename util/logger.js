const morgan = require('morgan');

// 커스텀 토큰 정의
morgan.token('timestamp', () => {
  return new Date().toISOString();
});

// 색상 코드 정의
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

// 로그 레벨별 색상 매핑
const levelColors = {
  info: colors.cyan,
  success: colors.green,
  warning: colors.yellow,
  error: colors.red,
  debug: colors.magenta
};

// 커스텀 로거 클래스
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  _formatMessage(level, message, emoji = '') {
    const timestamp = new Date().toISOString();
    const color = levelColors[level] || colors.white;
    
    if (this.isDevelopment) {
      // 개발 환경: 색상과 이모지 포함
      return `${color}[${timestamp}] ${emoji} ${level.toUpperCase()}: ${message}${colors.reset}`;
    } else {
      // 프로덕션 환경: 단순한 형태
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }
  }

  info(message, emoji = 'ℹ️') {
    console.log(this._formatMessage('info', message, emoji));
  }

  success(message, emoji = '✅') {
    console.log(this._formatMessage('success', message, emoji));
  }

  warning(message, emoji = '⚠️') {
    console.warn(this._formatMessage('warning', message, emoji));
  }

  error(message, emoji = '❌') {
    console.error(this._formatMessage('error', message, emoji));
  }

  debug(message, emoji = '🐛') {
    if (this.isDevelopment) {
      console.log(this._formatMessage('debug', message, emoji));
    }
  }

  // 특별한 용도의 로그들
  database(message, emoji = '🔌') {
    console.log(this._formatMessage('info', `[DATABASE] ${message}`, emoji));
  }

  seed(message, emoji = '🌱') {
    console.log(this._formatMessage('info', `[SEED] ${message}`, emoji));
  }

  connection(message, emoji = '🔄') {
    console.log(this._formatMessage('info', `[CONNECTION] ${message}`, emoji));
  }

  // Morgan HTTP 로거 설정
  getHttpLogger() {
    if (this.isDevelopment) {
      // 개발 환경: 상세한 로그
      return morgan('combined', {
        stream: {
          write: (message) => {
            console.log(`${colors.blue}[HTTP]${colors.reset} ${message.trim()}`);
          }
        }
      });
    } else {
      // 프로덕션 환경: 간단한 로그
      return morgan('common', {
        stream: {
          write: (message) => {
            console.log(`[HTTP] ${message.trim()}`);
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
          console.error(`${colors.red}[HTTP ERROR]${colors.reset} ${message.trim()}`);
        }
      }
    });
  }
}

// 싱글톤 로거 인스턴스
const logger = new Logger();

module.exports = logger;
