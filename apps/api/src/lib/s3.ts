import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  // Ensure we use virtual-hosted-style URLs (default)
  forcePathStyle: false,
  // Disable automatic checksums that can interfere with presigned URLs
  requestChecksumCalculation: 'WHEN_SUPPORTED',
  responseChecksumValidation: 'WHEN_SUPPORTED',
});

const bucketName = "smart-clip-temp";

export const uploadFile = async (key: string, buffer: Buffer, contentType: string): Promise<string> => {
  // Use multipart upload for files larger than 100MB
  if (buffer.length > 100 * 1024 * 1024) {
    console.log(`📤 Large file detected (${Math.round(buffer.length / 1024 / 1024)}MB), using multipart upload`);
    
    const { Upload } = await import('@aws-sdk/lib-storage');
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      },
      // Configure multipart upload settings
      partSize: 10 * 1024 * 1024, // 10MB parts
      queueSize: 4, // Process 4 parts concurrently
    });

    // Monitor upload progress
    upload.on('httpUploadProgress', (progress) => {
      const percent = Math.round((progress.loaded! / progress.total!) * 100);
      console.log(`📊 Upload progress: ${percent}% (${Math.round(progress.loaded! / 1024 / 1024)}MB/${Math.round(progress.total! / 1024 / 1024)}MB)`);
    });

    const result = await upload.done();
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  } else {
    // Standard upload for smaller files
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }
};

  export const uploadtoS3 = async (file: Buffer, filename: string, contentType: string, ) => {
    
    const fileBuffer = file;
    
    
    const timestampedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    

    
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `videos/${timestampedFilename}`,
      Body: fileBuffer,
      ContentType: contentType, 
    };
  
    const command = new PutObjectCommand(params);
    await s3Client.send(command);
  
    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/videos/${timestampedFilename}`;
  };




export const getSignedDownloadUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const getPresignedUploadUrl = async (key: string, contentType: string, expiresIn: number = 3600): Promise<string> => {
  try {
    // Create a new S3Client instance for this specific request to ensure clean state
    const tempS3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      // Use virtual-hosted-style URLs
      forcePathStyle: false,
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    // Generate presigned URL ensuring Content-Type is included in signature
    const url = await getSignedUrl(tempS3Client, command, { 
      expiresIn,
      // Explicitly sign the Content-Type header
      signableHeaders: new Set(['content-type']),
      // Disable unsignable headers to avoid conflicts
      unsignableHeaders: new Set([
        'authorization',
        'user-agent',
        'x-amzn-trace-id',
        'expect'
      ]),
    });
    
    return url;
  } catch (error) {
    throw error;
  }
};

export const downloadFile = async (key: string): Promise<Buffer> => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('File not found');
  }

  const stream = response.Body as Readable;
  const chunks: Uint8Array[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

export const deleteFile = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
};

export const uploadClip = async (filePath: string, userId: string, segmentId: string, projectId: string): Promise<string> => {
  // Get file stats first
  const stats = fs.statSync(filePath);
  const fileSizeMB = Math.round(stats.size / 1024 / 1024);
  console.log(`📁 Uploading clip: ${path.basename(filePath)} (${fileSizeMB}MB)`);
  
  const fileName = path.basename(filePath);
  const key = `clips/${userId}/${projectId}/${segmentId}-${fileName}`;
  
  // Use streaming upload for large files to avoid memory issues
  if (stats.size > 50 * 1024 * 1024) { // 50MB threshold
    console.log(`📤 Large clip detected, using streaming multipart upload`);
    
    const { Upload } = await import('@aws-sdk/lib-storage');
    const fileStream = fs.createReadStream(filePath);
    
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: 'video/mp4',
      },
      partSize: 5 * 1024 * 1024, // 5MB parts for clips
      queueSize: 3,
    });

    upload.on('httpUploadProgress', (progress) => {
      const percent = Math.round((progress.loaded! / progress.total!) * 100);
      console.log(`📊 Clip upload: ${percent}% (${segmentId})`);
    });

    await upload.done();
  } else {
    // Standard upload for smaller clips
    const fileBuffer = fs.readFileSync(filePath);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
    });

    await s3Client.send(command);
  }
  
  console.log(`✅ Clip uploaded successfully: ${key}`);
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const generateKey = (userId: string, originalName: string, type: 'video' | 'audio' | 'subtitle' = 'video'): string => {
  const timestamp = Date.now();
  // Remove extension from originalName to avoid double extensions
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const extension = originalName.split('.').pop() || 'mp4';
  return `${type}s/${userId}/${timestamp}-${nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, '_')}.${extension}`;
};