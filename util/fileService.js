const { File, DOMAIN_TYPES, FILE_STATUS, RESIZE_TYPES } = require('../models/File');
const path = require('path');
const fs = require('fs').promises;
// Sharp는 선택적으로 사용 (이미지 리사이징용)
let sharp = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp not installed. Image resizing features will be disabled.');
}
const logger = require('./logger');

class FileService {
  /**
   * 파일을 데이터베이스에 저장
   * @param {Object} fileData - 업로드된 파일 정보
   * @param {string} domain - 파일 도메인
   * @param {string} referenceId - 참조 ID
   * @param {string} uploadedBy - 업로더 ID
   * @param {Object} options - 추가 옵션
   * @returns {Promise<File>}
   */
  static async saveFile(fileData, domain, referenceId, uploadedBy, options = {}) {
    try {
      const { originalname, filename, path: filePath, size, mimetype } = fileData;
      const extension = path.extname(originalname).toLowerCase().substring(1);
      
      // 이미지 파일인 경우 원본 크기 정보 가져오기
      let dimensions = null;
      if (mimetype.startsWith('image/') && sharp) {
        try {
          const metadata = await sharp(filePath).metadata();
          dimensions = {
            width: metadata.width,
            height: metadata.height
          };
        } catch (error) {
          logger.warn(`Failed to get image dimensions for ${filename}: ${error.message}`);
        }
      }
      
      // 파일 URL 생성
      const relativePath = filePath.replace(path.join(__dirname, '../'), '');
      const fileUrl = `/${relativePath.replace(/\\/g, '/')}`;
      
      const file = new File({
        originalName: originalname,
        domain,
        referenceId,
        uploadedBy,
        metadata: {
          original: {
            filename,
            path: filePath,
            url: fileUrl,
            size,
            mimeType: mimetype,
            extension,
            dimensions
          }
        },
        status: FILE_STATUS.ACTIVE,
        tags: options.tags || [],
        description: options.description || '',
        isPublic: options.isPublic || false,
        expiresAt: options.expiresAt || null
      });
      
      await file.save();
      logger.success(`File saved to database: ${filename} (${domain})`);
      
      return file;
    } catch (error) {
      logger.error(`Failed to save file to database: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 이미지 리사이징 및 저장
   * @param {File} fileRecord - 파일 레코드
   * @param {Array} resizeSizes - 리사이징할 크기들
   * @returns {Promise<File>}
   */
  static async createResizedVersions(fileRecord, resizeSizes = []) {
    if (!sharp) {
      logger.warn('Sharp not available, skipping image resize');
      return fileRecord;
    }
    
    if (!fileRecord.isImage) {
      logger.warn(`File ${fileRecord.id} is not an image, skipping resize`);
      return fileRecord;
    }
    
    const defaultSizes = [
      { type: RESIZE_TYPES.THUMBNAIL, width: 150, height: 150 },
      { type: RESIZE_TYPES.SMALL, width: 300, height: 300 },
      { type: RESIZE_TYPES.MEDIUM, width: 600, height: 600 },
      { type: RESIZE_TYPES.LARGE, width: 1200, height: 1200 }
    ];
    
    const sizesToProcess = resizeSizes.length > 0 ? resizeSizes : defaultSizes;
    
    try {
      fileRecord.status = FILE_STATUS.PROCESSING;
      await fileRecord.save();
      
      for (const sizeConfig of sizesToProcess) {
        await this.createSingleResizedVersion(fileRecord, sizeConfig);
      }
      
      fileRecord.status = FILE_STATUS.ACTIVE;
      await fileRecord.save();
      
      logger.success(`Created ${sizesToProcess.length} resized versions for ${fileRecord.originalName}`);
      return fileRecord;
    } catch (error) {
      fileRecord.status = FILE_STATUS.FAILED;
      await fileRecord.save();
      logger.error(`Failed to create resized versions: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 단일 리사이징 버전 생성
   * @param {File} fileRecord - 파일 레코드
   * @param {Object} sizeConfig - 크기 설정
   * @returns {Promise<void>}
   */
  static async createSingleResizedVersion(fileRecord, sizeConfig) {
    const { type, width, height, quality = 85 } = sizeConfig;
    const originalPath = fileRecord.metadata.original.path;
    const originalDir = path.dirname(originalPath);
    const originalName = path.parse(fileRecord.metadata.original.filename).name;
    const extension = fileRecord.metadata.original.extension;
    
    const resizedFilename = `${originalName}_${type}.${extension}`;
    const resizedPath = path.join(originalDir, resizedFilename);
    const relativePath = resizedPath.replace(path.join(__dirname, '../'), '');
    const resizedUrl = `/${relativePath.replace(/\\/g, '/')}`;
    
    try {
      const resizeOptions = { width, height, fit: 'cover', withoutEnlargement: true };
      
      let sharpInstance = sharp(originalPath).resize(resizeOptions);
      
      // JPEG인 경우 품질 설정
      if (extension === 'jpg' || extension === 'jpeg') {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (extension === 'png') {
        sharpInstance = sharpInstance.png({ quality });
      } else if (extension === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      }
      
      await sharpInstance.toFile(resizedPath);
      
      // 파일 크기 가져오기
      const stats = await fs.stat(resizedPath);
      const resizedSize = stats.size;
      
      // 실제 생성된 이미지 크기 가져오기
      const metadata = await sharp(resizedPath).metadata();
      
      // 리사이징 정보 저장
      await fileRecord.addResizedVersion(type, {
        filename: resizedFilename,
        path: resizedPath,
        url: resizedUrl,
        size: resizedSize,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        }
      });
      
      logger.info(`Created ${type} version: ${resizedFilename}`);
    } catch (error) {
      logger.error(`Failed to create ${type} version: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 파일 삭제 (소프트 삭제)
   * @param {string} fileId - 파일 ID
   * @returns {Promise<boolean>}
   */
  static async deleteFile(fileId) {
    try {
      const file = await File.findById(fileId);
      if (!file) {
        throw new Error('File not found');
      }
      
      await file.softDelete();
      logger.success(`File soft deleted: ${file.originalName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 파일 물리적 삭제
   * @param {string} fileId - 파일 ID
   * @returns {Promise<boolean>}
   */
  static async hardDeleteFile(fileId) {
    try {
      const file = await File.findById(fileId);
      if (!file) {
        throw new Error('File not found');
      }
      
      // 원본 파일 삭제
      try {
        await fs.unlink(file.metadata.original.path);
      } catch (error) {
        logger.warn(`Failed to delete original file: ${error.message}`);
      }
      
      // 리사이징된 파일들 삭제
      if (file.metadata.resized) {
        for (const [type, resizedData] of file.metadata.resized) {
          try {
            await fs.unlink(resizedData.path);
          } catch (error) {
            logger.warn(`Failed to delete resized file ${type}: ${error.message}`);
          }
        }
      }
      
      // 데이터베이스에서 삭제
      await File.findByIdAndDelete(fileId);
      
      logger.success(`File hard deleted: ${file.originalName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to hard delete file: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 도메인별 파일 조회
   * @param {string} domain - 도메인
   * @param {string} referenceId - 참조 ID
   * @returns {Promise<Array>}
   */
  static async getFilesByDomain(domain, referenceId) {
    try {
      const files = await File.findByDomain(domain, referenceId);
      return files;
    } catch (error) {
      logger.error(`Failed to get files by domain: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 사용자별 파일 조회
   * @param {string} uploaderId - 업로더 ID
   * @param {Object} options - 조회 옵션
   * @returns {Promise<Array>}
   */
  static async getFilesByUploader(uploaderId, options = {}) {
    try {
      const files = await File.findByUploader(uploaderId, options);
      return files;
    } catch (error) {
      logger.error(`Failed to get files by uploader: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * 파일 통계 조회
   * @returns {Promise<Object>}
   */
  static async getFileStats() {
    try {
      const stats = await File.aggregate([
        {
          $group: {
            _id: '$domain',
            count: { $sum: 1 },
            totalSize: { $sum: '$metadata.original.size' },
            avgSize: { $avg: '$metadata.original.size' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);
      
      const totalFiles = await File.countDocuments({ status: FILE_STATUS.ACTIVE });
      const totalSize = await File.aggregate([
        { $match: { status: FILE_STATUS.ACTIVE } },
        { $group: { _id: null, total: { $sum: '$metadata.original.size' } } }
      ]);
      
      return {
        totalFiles,
        totalSize: totalSize[0]?.total || 0,
        byDomain: stats
      };
    } catch (error) {
      logger.error(`Failed to get file stats: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FileService;
