const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { DOMAIN_TYPES } = require('../models/File');

// uploads 디렉토리 구조 생성 (도메인별로 구성)
const createUploadDirs = (domain = DOMAIN_TYPES.MEMO) => {
  const baseDir = path.join(__dirname, '../uploads');
  const domainDir = path.join(baseDir, domain);
  const yearDir = path.join(domainDir, new Date().getFullYear().toString());
  const monthDir = path.join(yearDir, String(new Date().getMonth() + 1).padStart(2, '0'));
  
  [baseDir, domainDir, yearDir, monthDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  return monthDir;
};

// 도메인별 파일 저장 설정을 생성하는 함수
const createStorage = (domain = DOMAIN_TYPES.MEMO) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = createUploadDirs(domain);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // 파일명 형식: domain_userId_timestamp_originalname
      const userId = req.user ? req.user.id : 'anonymous';
      const timestamp = Date.now();
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      const sanitizedName = name.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      
      const filename = `${domain}_${userId}_${timestamp}_${sanitizedName}${ext}`;
      cb(null, filename);
    }
  });
};

// 기본 스토리지 (메모용)
const storage = createStorage(DOMAIN_TYPES.MEMO);

// 파일 필터링 (이미지만 허용)
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'), false);
  }
};

// multer 설정
const upload = multer({
  // storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
    files: 1 // 단일 파일만 허용
  },
  fileFilter: fileFilter
});

// 단일 이미지 업로드 미들웨어
const uploadSingleImage = upload.single('image');

// 업로드 에러 핸들링 미들웨어
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 5MB.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Only one file is allowed.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name. Use "image" field for file upload.'
      });
    }
  }
  
  if (err.message.includes('Only image files')) {
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }
  
  next(err);
};

// 도메인별 업로드 미들웨어 생성 함수
const createUploadMiddleware = (domain, fieldName = 'image') => {
  const domainStorage = createStorage(domain);
  const domainUpload = multer({
    storage: domainStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB 제한
      files: 1 // 단일 파일만 허용
    },
    fileFilter: fileFilter
  });
  
  return domainUpload.single(fieldName);
};

module.exports = {
  uploadSingleImage,
  handleUploadError,
  createUploadMiddleware,
  createStorage,
  DOMAIN_TYPES
};
