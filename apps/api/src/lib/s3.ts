import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  }
});

const bucketName = process.env.AWS_S3_BUCKET || '';

export const uploadFile = async (key: string, buffer: Buffer, contentType: string): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await s3Client.send(command);
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const getSignedDownloadUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const getPresignedUploadUrl = async (key: string, contentType: string, expiresIn: number = 3600): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
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

export const generateKey = (userId: string, originalName: string, type: 'video' | 'audio' | 'subtitle' = 'video'): string => {
  const timestamp = Date.now();
  const extension = originalName.split('.').pop();
  return `${type}s/${userId}/${timestamp}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}.${extension}`;
};