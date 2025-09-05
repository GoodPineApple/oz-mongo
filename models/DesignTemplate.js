const database = require('../util/database');
const mongoose = database.getMongoose();
const { Schema } = mongoose;

const designTemplateSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Template name is required'],
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  backgroundColor: {
    type: String,
    required: [true, 'Background color is required'],
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code']
  },
  textColor: {
    type: String,
    required: [true, 'Text color is required'],
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Please enter a valid hex color code']
  },
  borderStyle: {
    type: String,
    required: [true, 'Border style is required'],
    trim: true,
    maxlength: [200, 'Border style cannot exceed 200 characters']
  },
  shadowStyle: {
    type: String,
    required: [true, 'Shadow style is required'],
    trim: true,
    maxlength: [200, 'Shadow style cannot exceed 200 characters']
  },
  preview: {
    type: String,
    required: [true, 'Preview is required'],
    trim: true,
    maxlength: [10, 'Preview cannot exceed 10 characters'] // 이모지나 간단한 아이콘용
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
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

const DesignTemplate = mongoose.model('DesignTemplate', designTemplateSchema);

module.exports = DesignTemplate;
