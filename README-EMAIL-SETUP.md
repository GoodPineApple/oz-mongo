# 이메일 인증 설정 가이드

## Gmail SMTP 설정

### 1. Gmail 앱 비밀번호 생성

1. Gmail 계정의 [Google 계정 설정](https://myaccount.google.com/)으로 이동
2. **보안** 탭 클릭
3. **2단계 인증**이 활성화되어 있는지 확인 (필수)
4. **앱 비밀번호** 검색 및 클릭
5. **앱 선택** → "기타(사용자 지정 이름)" 선택
6. 앱 이름 입력 (예: "Memo App")
7. **생성** 클릭
8. 생성된 16자리 비밀번호 복사 (공백 제거)

### 2. 환경 변수 설정

`.env` 파일에 다음 설정 추가:

```env
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=16자리앱비밀번호
FRONTEND_URL=http://localhost:3001
```

### 3. nodemailer 설치

```bash
npm install nodemailer
```

### 4. 이메일 서비스 활성화

`util/emailService.js` 파일에서 nodemailer 관련 주석 해제:

```javascript
// 이 부분의 주석을 해제하세요
const nodemailer = require('nodemailer');

// transporter 설정 주석 해제
this.transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// 실제 이메일 발송 코드 주석 해제
const info = await this.transporter.sendMail(mailOptions);
```

## 이메일 인증 플로우

### 1. 회원가입
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@gmail.com", 
  "password": "password123"
}
```

**응답:**
```json
{
  "message": "Registration successful! Please check your email to verify your account.",
  "user": {
    "id": "...",
    "username": "testuser",
    "email": "test@gmail.com",
    "isEmailVerified": false
  },
  "requiresEmailVerification": true
}
```

### 2. 이메일 확인
사용자가 이메일을 확인하고 인증 링크를 클릭하면:

```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "email": "test@gmail.com",
  "token": "123456"
}
```

**응답 (자동 로그인):**
```json
{
  "message": "Email verification successful! You are now logged in.",
  "user": {
    "id": "...",
    "username": "testuser", 
    "email": "test@gmail.com",
    "isEmailVerified": true
  },
  "token": "jwt-token..."
}
```

### 3. 로그인 (인증 후)
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "testuser",
  "password": "password123"
}
```

### 4. 인증 이메일 재발송
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "test@gmail.com"
}
```

## 개발 모드

nodemailer가 설치되지 않은 경우, 콘솔에 인증 정보가 출력됩니다:

```
📧 Verification email would be sent to: test@gmail.com
🔗 Verification URL: http://localhost:3001/verify-email?token=123456&email=test@gmail.com
🔑 Verification Code: 123456
```

이 정보를 사용하여 수동으로 인증을 테스트할 수 있습니다.

## 보안 고려사항

1. **앱 비밀번호 보안**: 앱 비밀번호를 절대 코드에 하드코딩하지 마세요
2. **환경 변수**: `.env` 파일을 `.gitignore`에 추가하세요
3. **HTTPS**: 프로덕션에서는 HTTPS를 사용하세요
4. **토큰 만료**: 인증 토큰은 1시간 후 자동 만료됩니다
5. **Rate Limiting**: 이메일 발송에 대한 rate limiting을 고려하세요

## 문제 해결

### Gmail 인증 실패
- 2단계 인증이 활성화되어 있는지 확인
- 앱 비밀번호가 정확한지 확인
- Gmail 계정이 잠기지 않았는지 확인

### 이메일이 스팸함에 들어가는 경우
- SPF, DKIM, DMARC 설정 고려
- 발송량 제한 준수
- 이메일 내용 최적화
