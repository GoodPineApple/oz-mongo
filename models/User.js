const database = require('../util/database');
const mongoose = database.getMongoose();
const { Schema } = mongoose;
const jwtService = require('../util/jwtService');

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      delete ret.password; // 비밀번호는 응답에서 제외
      delete ret.emailVerificationToken; // 인증 토큰도 응답에서 제외
      return ret;
    }
  },
  toObject: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 비밀번호 해시화 미들웨어
userSchema.pre('save', async function(next) {
  // 비밀번호가 수정되지 않았으면 스킵
  if (!this.isModified('password')) return next();
  
  try {
    // 비밀번호 해시화
    this.password = await jwtService.hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

// 비밀번호 비교 메서드 추가
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await jwtService.comparePassword(candidatePassword, this.password);
};

// JWT 토큰 생성 메서드 추가
userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id.toString(),
    username: this.username,
    email: this.email,
    isEmailVerified: this.isEmailVerified
  };
  return jwtService.generateToken(payload);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
