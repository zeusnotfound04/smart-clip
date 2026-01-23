import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
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
  
  maxAttempts: 3, // Auto-retry failed requests
  
  forcePathStyle: false,
  
  useAccelerateEndpoint: process.env.USE_S3_ACCELERATION === 'true',
  
  requestChecksumCalculation: 'WHEN_SUPPORTED',
  responseChecksumValidation: 'WHEN_SUPPORTED',
});

const bucketName = "smart-clip-temp";

const getOptimizedUrl = (key: string): string => {
  const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN;
  const useAcceleration = process.env.USE_S3_ACCELERATION === 'true';
  
  if (cloudfrontDomain) {
    return `https://${cloudfrontDomain}/${key}`;
  }
  
  if (useAcceleration) {
    return `https://${bucketName}.s3-accelerate.amazonaws.com/${key}`;
  }
  
  return `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};

export const uploadFile = async (key: string, buffer: Buffer, contentType: string): Promise<string> => {
  const fileSizeMB = Math.round(buffer.length / 1024 / 1024);
  
  if (buffer.length > 50 * 1024 * 1024) {
    console.log(`Uploading ${fileSizeMB}MB with parallel multipart upload`);
    
    const { Upload } = await import('@aws-sdk/lib-storage');
    
    let partSize: number;
    let queueSize: number;
    
    if (buffer.length > 2 * 1024 * 1024 * 1024) { // >2GB
      partSize = 50 * 1024 * 1024; // 50MB chunks
      queueSize = 16; // 16 concurrent uploads (aggressive)
    } else if (buffer.length > 1024 * 1024 * 1024) { // >1GB
      partSize = 25 * 1024 * 1024; // 25MB chunks
      queueSize = 12; // 12 concurrent uploads
    } else if (buffer.length > 500 * 1024 * 1024) { // >500MB
      partSize = 20 * 1024 * 1024; // 20MB chunks
      queueSize = 10; // 10 concurrent uploads
    } else {
      partSize = 10 * 1024 * 1024; // 10MB chunks
      queueSize = 8; // 8 concurrent uploads
    }
    
    console.log(`Config: ${partSize / 1024 / 1024}MB parts × ${queueSize} parallel streams`);
    
    const startTime = Date.now();
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      },
      partSize: partSize,
      queueSize: queueSize,
      leavePartsOnError: false,
    });

    let lastLogTime = startTime;
    let lastLoaded = 0;
    
    upload.on('httpUploadProgress', (progress) => {
      const now = Date.now();
      if (now - lastLogTime > 2000 || progress.loaded === progress.total) {
        const percent = Math.round((progress.loaded! / progress.total!) * 100);
        const loadedMB = Math.round(progress.loaded! / 1024 / 1024);
        const totalMB = Math.round(progress.total! / 1024 / 1024);
        
        const bytesSinceLastLog = progress.loaded! - lastLoaded;
        const timeSinceLastLog = (now - lastLogTime) / 1000;
        const speedMBps = timeSinceLastLog > 0 ? (bytesSinceLastLog / timeSinceLastLog / 1024 / 1024).toFixed(1) : '0';
        
        const remainingBytes = progress.total! - progress.loaded!;
        const avgSpeed = progress.loaded! / ((now - startTime) / 1000);
        const etaSeconds = avgSpeed > 0 ? Math.round(remainingBytes / avgSpeed) : 0;
        
        console.log(`Upload: ${percent}% (${loadedMB}/${totalMB}MB) @ ${speedMBps}MB/s | ETA: ${etaSeconds}s`);
        
        lastLogTime = now;
        lastLoaded = progress.loaded!;
      }
    });

    await upload.done();
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgSpeed = (fileSizeMB / parseFloat(totalTime)).toFixed(1);
    console.log(`Upload complete: ${fileSizeMB}MB in ${totalTime}s (avg ${avgSpeed}MB/s)`);
    
    return getOptimizedUrl(key);
  } else {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });

    await s3Client.send(command);
    return getOptimizedUrl(key);
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





export const getSignedDownloadUrl = async (keyOrUrl: string, expiresIn: number = 3600): Promise<string> => {
  // Extract key from full URL if needed
  let key = keyOrUrl;
  
  // Handle full S3 URLs
  if (keyOrUrl.startsWith('https://')) {
    // Parse URL to extract key
    // Format: https://bucket.s3.region.amazonaws.com/key
    // or: https://bucket.s3-accelerate.amazonaws.com/key
    try {
      const url = new URL(keyOrUrl);
      key = url.pathname.slice(1); // Remove leading slash
    } catch (e) {
      // If URL parsing fails, use as-is
      console.warn(`Could not parse URL, using as key: ${keyOrUrl}`);
    }
  } else if (keyOrUrl.startsWith('s3://')) {
    // Handle s3:// URLs
    const parts = keyOrUrl.slice(5).split('/');
    key = parts.slice(1).join('/'); // Remove bucket name
  }
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const getPresignedUploadUrl = async (key: string, contentType: string, expiresIn: number = 3600): Promise<string> => {
  try {
    const tempS3Client = new S3Client({
      region: process.env.AWS_REGION || 'ap-south-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
      forcePathStyle: false,
    });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(tempS3Client, command, { 
      expiresIn,
      signableHeaders: new Set(['content-type']),
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

import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';

export const initiateMultipartUpload = async (key: string, contentType: string): Promise<{ uploadId: string; key: string }> => {
  const command = new CreateMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  });

  const response = await s3Client.send(command);
  return { uploadId: response.UploadId!, key };
};

export const getUploadPartUrl = async (key: string, uploadId: string, partNumber: number): Promise<string> => {
  const command = new UploadPartCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  return await getSignedUrl(s3Client, command, { expiresIn: 7200 }); // 2 hours
};

export const completeMultipartUpload = async (key: string, uploadId: string, parts: Array<{ ETag: string; PartNumber: number }>): Promise<string> => {
  const command = new CompleteMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
    MultipartUpload: { Parts: parts },
  });

  await s3Client.send(command);
  return getOptimizedUrl(key);
};

export const abortMultipartUpload = async (key: string, uploadId: string): Promise<void> => {
  const command = new AbortMultipartUploadCommand({
    Bucket: bucketName,
    Key: key,
    UploadId: uploadId,
  });

  await s3Client.send(command);
};

export const downloadFile = async (key: string): Promise<Buffer> => {
  try {
    const headCommand = new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const { ContentLength } = await s3Client.send(headCommand);
    
    if (!ContentLength) {
      throw new Error('Could not determine file size');
    }
    
    const fileSizeMB = Math.round(ContentLength / 1024 / 1024);
    console.log(`Downloading ${fileSizeMB}MB: ${key}`);
    
    if (ContentLength > 100 * 1024 * 1024) {
      return await downloadFileParallel(key, ContentLength);
    }
    
    return await downloadFileSingle(key);
    
  } catch (error) {
    console.error(`Download failed for ${key}:`, error);
    throw error;
  }
};

async function downloadFileSingle(key: string): Promise<Buffer> {
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
}

async function downloadFileParallel(key: string, fileSize: number): Promise<Buffer> {
  const startTime = Date.now();
  
  let chunkSize: number;
  let concurrency: number;
  
  if (fileSize > 1024 * 1024 * 1024) { // >1GB
    chunkSize = 20 * 1024 * 1024; // 20MB chunks
    concurrency = 12; // 12 parallel downloads
  } else if (fileSize > 500 * 1024 * 1024) { // >500MB
    chunkSize = 15 * 1024 * 1024; // 15MB chunks
    concurrency = 10; // 10 parallel downloads
  } else {
    chunkSize = 10 * 1024 * 1024; // 10MB chunks
    concurrency = 8; // 8 parallel downloads
  }
  
  const numChunks = Math.ceil(fileSize / chunkSize);
  const fileSizeMB = Math.round(fileSize / 1024 / 1024);
  
  console.log(`Parallel download: ${numChunks} chunks × ${concurrency} streams`);
  
  const chunks: Buffer[] = new Array(numChunks);
  let downloadedChunks = 0;
  
  const downloadChunk = async (chunkIndex: number): Promise<void> => {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize - 1, fileSize - 1);
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      Range: `bytes=${start}-${end}`, // Download specific byte range
    });
    
    const response = await s3Client.send(command);
    const stream = response.Body as Readable;
    const chunkData: Uint8Array[] = [];
    
    return new Promise<void>((resolve, reject) => {
      stream.on('data', (data) => chunkData.push(data));
      stream.on('end', () => {
        chunks[chunkIndex] = Buffer.concat(chunkData);
        downloadedChunks++;
        
        const progress = Math.round((downloadedChunks / numChunks) * 100);
        if (downloadedChunks % Math.max(1, Math.floor(numChunks / 10)) === 0 || downloadedChunks === numChunks) {
          const elapsed = (Date.now() - startTime) / 1000;
          const downloadedMB = Math.round((downloadedChunks / numChunks) * fileSizeMB);
          const speedMBps = elapsed > 0 ? (downloadedMB / elapsed).toFixed(1) : '0';
          console.log(`Download: ${progress}% (${downloadedMB}/${fileSizeMB}MB) @ ${speedMBps}MB/s`);
        }
        resolve();
      });
      stream.on('error', reject);
    });
  };
  
  for (let i = 0; i < numChunks; i += concurrency) {
    const batch = [];
    for (let j = i; j < Math.min(i + concurrency, numChunks); j++) {
      batch.push(downloadChunk(j));
    }
    await Promise.all(batch);
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgSpeed = (fileSizeMB / parseFloat(totalTime)).toFixed(1);
  console.log(`Download complete: ${fileSizeMB}MB in ${totalTime}s (avg ${avgSpeed}MB/s)`);
  
  return Buffer.concat(chunks);
}

export const downloadFileToPath = async (key: string, outputPath: string): Promise<void> => {
  const startTime = Date.now();
  
  const headCommand = new HeadObjectCommand({
    Bucket: bucketName,
    Key: key,
  });
  
  const { ContentLength } = await s3Client.send(headCommand);
  const fileSizeMB = Math.round((ContentLength || 0) / 1024 / 1024);
  console.log(`Streaming ${fileSizeMB}MB to: ${outputPath}`);
  
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (ContentLength && ContentLength > 200 * 1024 * 1024) {
    await downloadFileToPathParallel(key, outputPath, ContentLength);
    return;
  }
  
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error('File not found');
  }

  const stream = response.Body as Readable;
  const writeStream = fs.createWriteStream(outputPath, { highWaterMark: 16 * 1024 * 1024 }); // 16MB buffer
  
  let downloadedBytes = 0;
  let lastLogTime = startTime;
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => {
      downloadedBytes += chunk.length;
      const now = Date.now();
      if (now - lastLogTime > 2000) {
        const progress = ContentLength ? Math.round((downloadedBytes / ContentLength) * 100) : 0;
        const speedMBps = (downloadedBytes / 1024 / 1024) / ((now - startTime) / 1000);
        console.log(`Download: ${progress}% @ ${speedMBps.toFixed(1)}MB/s`);
        lastLogTime = now;
      }
    });
    
    stream.pipe(writeStream);
    writeStream.on('finish', () => {
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`Stream download complete: ${fileSizeMB}MB in ${totalTime}s`);
      resolve();
    });
    writeStream.on('error', reject);
    stream.on('error', reject);
  });
};

async function downloadFileToPathParallel(key: string, outputPath: string, fileSize: number): Promise<void> {
  const startTime = Date.now();
  const fileSizeMB = Math.round(fileSize / 1024 / 1024);
  
  let chunkSize: number;
  let concurrency: number;
  
  if (fileSize > 2 * 1024 * 1024 * 1024) { // >2GB
    chunkSize = 50 * 1024 * 1024; // 50MB chunks
    concurrency = 20; // 20 parallel downloads!
  } else if (fileSize > 1024 * 1024 * 1024) { // >1GB
    chunkSize = 32 * 1024 * 1024; // 32MB chunks
    concurrency = 16; // 16 parallel downloads
  } else if (fileSize > 500 * 1024 * 1024) { // >500MB
    chunkSize = 25 * 1024 * 1024; // 25MB chunks
    concurrency = 12; // 12 parallel downloads
  } else {
    chunkSize = 20 * 1024 * 1024; // 20MB chunks
    concurrency = 10; // 10 parallel downloads
  }
  
  const numChunks = Math.ceil(fileSize / chunkSize);
  console.log(`Parallel file download: ${numChunks} chunks × ${concurrency} streams → ${outputPath}`);
  
  const fd = fs.openSync(outputPath, 'w');
  fs.ftruncateSync(fd, fileSize);
  
  let downloadedChunks = 0;
  
  const downloadChunk = async (chunkIndex: number): Promise<void> => {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize - 1, fileSize - 1);
    const expectedSize = end - start + 1;
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
      Range: `bytes=${start}-${end}`,
    });
    
    const response = await s3Client.send(command);
    const stream = response.Body as Readable;
    const chunks: Buffer[] = [];
    
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (data: Buffer) => chunks.push(data));
      stream.on('end', () => {
        const buffer = Buffer.concat(chunks);
        fs.writeSync(fd, buffer, 0, buffer.length, start);
        downloadedChunks++;
        
        const progress = Math.round((downloadedChunks / numChunks) * 100);
        if (downloadedChunks % Math.max(1, Math.floor(numChunks / 5)) === 0 || downloadedChunks === numChunks) {
          const elapsed = (Date.now() - startTime) / 1000;
          const downloadedMB = Math.round((downloadedChunks / numChunks) * fileSizeMB);
          const speedMBps = elapsed > 0 ? (downloadedMB / elapsed).toFixed(1) : '0';
          console.log(`Download: ${progress}% (${downloadedMB}/${fileSizeMB}MB) @ ${speedMBps}MB/s`);
        }
        resolve();
      });
      stream.on('error', reject);
    });
  };
  
  for (let i = 0; i < numChunks; i += concurrency) {
    const batch = [];
    for (let j = i; j < Math.min(i + concurrency, numChunks); j++) {
      batch.push(downloadChunk(j));
    }
    await Promise.all(batch);
  }
  
  fs.closeSync(fd);
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgSpeed = (fileSizeMB / parseFloat(totalTime)).toFixed(1);
  console.log(`Parallel file download complete: ${fileSizeMB}MB in ${totalTime}s (avg ${avgSpeed}MB/s)`);
}

export const deleteFile = async (key: string): Promise<void> => {
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
};

export const uploadClip = async (filePath: string, userId: string, segmentId: string, projectId: string): Promise<string> => {
  const stats = fs.statSync(filePath);
  const fileSizeMB = Math.round(stats.size / 1024 / 1024);
  console.log(`Uploading clip: ${path.basename(filePath)} (${fileSizeMB}MB)`);
  
  const fileName = path.basename(filePath);
  const key = `clips/${userId}/${projectId}/${segmentId}-${fileName}`;
  
  if (stats.size > 30 * 1024 * 1024) {
    console.log(`Streaming multipart upload for clip`);
    
    const { Upload } = await import('@aws-sdk/lib-storage');
    const fileStream = fs.createReadStream(filePath, {
      highWaterMark: 1024 * 1024, // 1MB buffer for streaming
    });
    
    const partSize = stats.size > 100 * 1024 * 1024 ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    const queueSize = stats.size > 100 * 1024 * 1024 ? 8 : 6;
    
    const startTime = Date.now();
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
        ContentType: 'video/mp4',
        ServerSideEncryption: 'AES256',
      },
      partSize: partSize,
      queueSize: queueSize,
    });

    let lastLog = 0;
    upload.on('httpUploadProgress', (progress) => {
      const now = Date.now();
      if (now - lastLog > 2000 || progress.loaded === progress.total) {
        const percent = Math.round((progress.loaded! / progress.total!) * 100);
        console.log(`Clip upload: ${percent}% (${segmentId})`);
        lastLog = now;
      }
    });

    await upload.done();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Clip uploaded: ${fileSizeMB}MB in ${totalTime}s`);
  } else {
    const fileBuffer = fs.readFileSync(filePath);
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: 'video/mp4',
      ServerSideEncryption: 'AES256',
    });

    await s3Client.send(command);
    console.log(`Clip uploaded: ${key}`);
  }
  
  return getOptimizedUrl(key);
};

export const generateKey = (userId: string, originalName: string, type: 'video' | 'audio' | 'subtitle' = 'video'): string => {
  const timestamp = Date.now();
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const extension = originalName.split('.').pop() || 'mp4';
  return `${type}s/${userId}/${timestamp}-${nameWithoutExt.replace(/[^a-zA-Z0-9.-]/g, '_')}.${extension}`;
};