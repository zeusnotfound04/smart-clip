import { Request } from 'express';
import { s3Service } from './s3';

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export class UploadService {
  static validateVideoFile(mimetype: string): boolean {
    const allowedMimes = [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm'
    ];
    return allowedMimes.includes(mimetype);
  }

  static validateFileSize(size: number): boolean {
    const maxSize = 500 * 1024 * 1024;
    return size <= maxSize;
  }

  static async processVideoUpload(userId: string, file: UploadedFile): Promise<{ filePath: string; s3Key: string }> {
    if (!this.validateVideoFile(file.mimetype)) {
      throw new Error('Invalid file type. Only video files are allowed.');
    }

    if (!this.validateFileSize(file.size)) {
      throw new Error('File size too large. Maximum size is 500MB.');
    }

    const s3Key = s3Service.generateKey(userId, file.originalname, 'video');
    const filePath = await s3Service.uploadFile(s3Key, file.buffer, file.mimetype);

    return { filePath, s3Key };
  }

  static parseMultipartData(body: string, contentType: string): { fields: Record<string, string>; files: UploadedFile[] } {
    const boundary = contentType.split('boundary=')[1];
    const parts = body.split(`--${boundary}`);
    
    const fields: Record<string, string> = {};
    const files: UploadedFile[] = [];

    for (const part of parts) {
      if (part.includes('Content-Disposition')) {
        const lines = part.split('\r\n');
        const disposition = lines.find(line => line.includes('Content-Disposition'));
        
        if (disposition?.includes('filename=')) {
          const nameMatch = disposition.match(/name="([^"]+)"/);
          const filenameMatch = disposition.match(/filename="([^"]+)"/);
          const contentTypeMatch = lines.find(line => line.startsWith('Content-Type:'));
          
          if (nameMatch && filenameMatch && contentTypeMatch) {
            const dataStartIndex = part.indexOf('\r\n\r\n') + 4;
            const dataEndIndex = part.lastIndexOf('\r\n');
            const fileData = part.slice(dataStartIndex, dataEndIndex);
            
            files.push({
              originalname: filenameMatch[1],
              mimetype: contentTypeMatch.split(': ')[1],
              size: Buffer.byteLength(fileData, 'binary'),
              buffer: Buffer.from(fileData, 'binary')
            });
          }
        } else if (disposition) {
          const nameMatch = disposition.match(/name="([^"]+)"/);
          if (nameMatch) {
            const dataStartIndex = part.indexOf('\r\n\r\n') + 4;
            const dataEndIndex = part.lastIndexOf('\r\n');
            const value = part.slice(dataStartIndex, dataEndIndex);
            fields[nameMatch[1]] = value;
          }
        }
      }
    }

    return { fields, files };
  }
}

export const uploadService = new UploadService();