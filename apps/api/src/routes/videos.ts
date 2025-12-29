import { Router } from 'express';
import { getPresignedUrl, confirmUpload, list, deleteVideo, generateClip, streamVideo, initiateMultipartUpload, getMultipartUploadPartUrl, completeMultipartUpload, abortMultipartUpload } from '../controllers/video.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router: Router = Router();

router.post('/upload-url', authMiddleware, getPresignedUrl);
router.post('/confirm-upload', authMiddleware, confirmUpload);

// Multipart upload endpoints for large files
router.post('/multipart/initiate', authMiddleware, initiateMultipartUpload);
router.post('/multipart/part-url', authMiddleware, getMultipartUploadPartUrl);
router.post('/multipart/complete', authMiddleware, completeMultipartUpload);
router.post('/multipart/abort', authMiddleware, abortMultipartUpload);

router.get('/', authMiddleware, list);
router.delete('/:id', authMiddleware, deleteVideo);
router.post('/generate-clip', authMiddleware, generateClip);
router.post('/:id/generate-clip', authMiddleware, generateClip);
router.get('/:id/stream', authMiddleware, streamVideo);

export default router;