const database = require('../util/database');
const mongoose = database.getMongoose();
const { Schema } = mongoose;

// 파일 도메인 타입 정의
const DOMAIN_TYPES = {
  MEMO: 'memo',
  PROFILE_IMAGE: 'profile-image',
  TEMPLATE_IMAGE: 'template-image',
  ATTACHMENT: 'attachment'
};

// 파일 상태 정의
const FILE_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted',
  PROCESSING: 'processing',
  FAILED: 'failed'
};

// 리사이징 타입 정의
const RESIZE_TYPES = {
  THUMBNAIL: 'thumbnail',    // 150x150
  SMALL: 'small',           // 300x300
  MEDIUM: 'medium',         // 600x600
  LARGE: 'large',           // 1200x1200
  ORIGINAL: 'original'      // 원본
};

const fileSchema = new Schema({
  // 기본 파일 정보
  originalName: {
    type: String,
    required: [true, 'Original filename is required'],
    trim: true,
    maxlength: [255, 'Original filename cannot exceed 255 characters']
  },
  
  // 파일 도메인 (어떤 용도로 사용되는 파일인지)
  domain: {
    type: String,
    required: [true, 'File domain is required'],
    enum: Object.values(DOMAIN_TYPES),
    index: true
  },
  
  // 도메인별 참조 ID (memo ID, user ID, template ID 등)
  referenceId: {
    type: Schema.Types.Mixed, // ObjectId 또는 String 모두 허용
    required: [true, 'Reference ID is required'],
    index: true
  },
  
  // 업로드한 사용자 ID
  uploadedBy: {
    type: Schema.Types.Mixed, // ObjectId 또는 String 모두 허용
    ref: 'User',
    required: [true, 'Uploader ID is required'],
    index: true
  },
  // 파일 메타데이터
  metadata: {
    // 원본 파일 정보
    original: {
      filename: {
        type: String,
        required: true
      },
      path: {
        type: String,
        required: true
      },
      url: {
        type: String,
        required: true
      },
      size: {
        type: Number,
        required: true,
        min: 0
      },
      mimeType: {
        type: String,
        required: true
      },
      extension: {
        type: String,
        required: true,
        lowercase: true
      },
      // 이미지인 경우 원본 크기
      dimensions: {
        width: Number,
        height: Number
      }
    },
    
    // 리사이징된 버전들
    resized: {
      type: Map,
      of: {
        filename: String,
        path: String,
        url: String,
        size: Number,
        dimensions: {
          width: Number,
          height: Number
        }
      },
      default: new Map()
    }
  },
  
  // 파일 상태
  status: {
    type: String,
    enum: Object.values(FILE_STATUS),
    default: FILE_STATUS.ACTIVE,
    index: true
  },
  
  // 파일 태그 (검색, 분류용)
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  // 파일 설명/메모
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  
  // 접근 제어
  isPublic: {
    type: Boolean,
    default: false
  },
  
  // 만료 날짜 (임시 파일용)
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },
  
  // 다운로드/조회 통계
  stats: {
    downloadCount: {
      type: Number,
      default: 0,
      min: 0
    },
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastAccessedAt: {
      type: Date
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      
      // 날짜 필드 ISO 문자열로 변환
      if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
      if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
      if (ret.expiresAt) ret.expiresAt = ret.expiresAt.toISOString();
      if (ret.stats && ret.stats.lastAccessedAt) {
        ret.stats.lastAccessedAt = ret.stats.lastAccessedAt.toISOString();
      }
      
      // ObjectId를 문자열로 변환
      if (ret.referenceId) ret.referenceId = ret.referenceId.toString();
      if (ret.uploadedBy) ret.uploadedBy = ret.uploadedBy.toString();
      
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      if (ret.referenceId) ret.referenceId = ret.referenceId.toString();
      if (ret.uploadedBy) ret.uploadedBy = ret.uploadedBy.toString();
      return ret;
    }
  }
});

// 인덱스 설정
fileSchema.index({ domain: 1, referenceId: 1 }); // 도메인별 참조 조회 최적화
fileSchema.index({ uploadedBy: 1, createdAt: -1 }); // 사용자별 파일 조회 최적화
fileSchema.index({ status: 1, createdAt: -1 }); // 상태별 파일 조회 최적화
fileSchema.index({ 'metadata.original.mimeType': 1 }); // MIME 타입별 조회 최적화
fileSchema.index({ tags: 1 }); // 태그 검색 최적화

// 가상 필드
fileSchema.virtual('isImage').get(function() {
  return this.metadata.original.mimeType.startsWith('image/');
});

fileSchema.virtual('isVideo').get(function() {
  return this.metadata.original.mimeType.startsWith('video/');
});

fileSchema.virtual('isDocument').get(function() {
  const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
  return docTypes.some(type => this.metadata.original.mimeType.includes(type));
});

// 스태틱 메소드
fileSchema.statics.findByDomain = function(domain, referenceId) {
  return this.find({ domain, referenceId, status: FILE_STATUS.ACTIVE });
};

fileSchema.statics.findByUploader = function(uploaderId, options = {}) {
  const { page = 1, limit = 20, domain } = options;
  const query = { uploadedBy: uploaderId, status: FILE_STATUS.ACTIVE };
  if (domain) query.domain = domain;
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// 인스턴스 메소드
fileSchema.methods.addResizedVersion = function(type, fileData) {
  if (!this.metadata.resized) {
    this.metadata.resized = new Map();
  }
  this.metadata.resized.set(type, fileData);
  return this.save();
};

fileSchema.methods.incrementDownload = function() {
  this.stats.downloadCount += 1;
  this.stats.lastAccessedAt = new Date();
  return this.save();
};

fileSchema.methods.incrementView = function() {
  this.stats.viewCount += 1;
  this.stats.lastAccessedAt = new Date();
  return this.save();
};

fileSchema.methods.softDelete = function() {
  this.status = FILE_STATUS.DELETED;
  return this.save();
};

const File = mongoose.model('File', fileSchema);

module.exports = {
  File,
  DOMAIN_TYPES,
  FILE_STATUS,
  RESIZE_TYPES
};
