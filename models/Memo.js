const database = require('../util/database');
const mongoose = database.getMongoose();
const { Schema } = mongoose;

const memoSchema = new Schema({
  title: {
    type: String,
    required: [true, 'Memo title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Memo content is required'],
    trim: true,
    maxlength: [10000, 'Content cannot exceed 10000 characters']
  },
  templateId: {
    type: Schema.Types.Mixed, // ObjectId 또는 String 모두 허용
    ref: 'DesignTemplate',
    required: [true, 'Template ID is required']
  },
  userId: {
    type: Schema.Types.Mixed, // ObjectId 또는 String 모두 허용
    ref: 'User',
    required: [true, 'User ID is required']
  },
  // 레거시 지원을 위한 imageUrl (기존 데이터 호환성)
  imageUrl: {
    type: String,
    default: null,
    trim: true
  },
  // File 모델 참조 (새로운 파일 시스템)
  attachedFiles: [{
    type: Schema.Types.ObjectId,
    ref: 'File'
  }]
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      // createdAt과 updatedAt을 문자열로 변환
      if (ret.createdAt) ret.createdAt = ret.createdAt.toISOString();
      if (ret.updatedAt) ret.updatedAt = ret.updatedAt.toISOString();
      // ObjectId를 문자열로 변환
      if (ret.templateId) ret.templateId = ret.templateId.toString();
      if (ret.userId) ret.userId = ret.userId.toString();
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      if (ret.templateId) ret.templateId = ret.templateId.toString();
      if (ret.userId) ret.userId = ret.userId.toString();
      return ret;
    }
  }
});

// 인덱스 설정
memoSchema.index({ userId: 1, createdAt: -1 }); // 사용자별 메모 조회 최적화
memoSchema.index({ templateId: 1 }); // 템플릿별 메모 조회 최적화

const Memo = mongoose.model('Memo', memoSchema);

module.exports = Memo;
