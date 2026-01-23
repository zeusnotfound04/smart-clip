from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

import os
import sys
import json
import time
import logging
import tempfile
import traceback
import subprocess
import shutil
import gc
from datetime import datetime
from typing import Optional, Dict, Any
from urllib.parse import urlparse, parse_qs
from contextlib import contextmanager

import redis
import boto3
from botocore.config import Config

sys.path.insert(0, str(Path(__file__).parent))

from smartclip_engine import SmartClipEngine

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('podcast_clipper_worker')

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
AWS_REGION = os.environ.get('AWS_REGION', 'ap-south-1')
AWS_S3_BUCKET = os.environ.get('AWS_S3_BUCKET_NAME', 'smart-clip-temp')
WORKER_CONCURRENCY = int(os.environ.get('WORKER_CONCURRENCY', '1'))
MAX_TEMP_SIZE_MB = int(os.environ.get('MAX_TEMP_SIZE_MB', '500'))
JOB_QUEUE_KEY = 'podcast_clipper_jobs'
STATUS_KEY_PREFIX = 'podcast_clipper_status:'
POLL_INTERVAL = 2  # seconds

@contextmanager
def managed_temp_dir(prefix: str = 'podcast_clipper_'):
    """
    Context manager for temporary directory with guaranteed cleanup.
    Ensures temp files are always deleted, even on exceptions.
    """
    temp_dir = tempfile.mkdtemp(prefix=prefix)
    logger.info(f"Created temp directory: {temp_dir}")
    try:
        yield temp_dir
    finally:
        cleanup_temp_dir(temp_dir)

def cleanup_temp_dir(temp_dir: str) -> None:
    """Aggressively cleanup temporary directory."""
    if temp_dir and os.path.exists(temp_dir):
        try:
            total_size = get_dir_size(temp_dir)
            
            shutil.rmtree(temp_dir, ignore_errors=True)
            logger.info(f"Cleaned up temp directory: {temp_dir} ({total_size / 1024 / 1024:.2f} MB freed)")
        except Exception as e:
            logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")
            try:
                for root, dirs, files in os.walk(temp_dir, topdown=False):
                    for name in files:
                        try:
                            os.remove(os.path.join(root, name))
                        except:
                            pass
                    for name in dirs:
                        try:
                            os.rmdir(os.path.join(root, name))
                        except:
                            pass
                os.rmdir(temp_dir)
            except:
                pass

def get_dir_size(path: str) -> int:
    """Get total size of directory in bytes."""
    total = 0
    try:
        for entry in os.scandir(path):
            if entry.is_file():
                total += entry.stat().st_size
            elif entry.is_dir():
                total += get_dir_size(entry.path)
    except:
        pass
    return total

def cleanup_file(file_path: str) -> None:
    """Safely delete a single file."""
    try:
        if file_path and os.path.exists(file_path):
            size = os.path.getsize(file_path)
            os.remove(file_path)
            logger.debug(f"Deleted file: {file_path} ({size / 1024 / 1024:.2f} MB)")
    except Exception as e:
        logger.warning(f"Failed to delete file {file_path}: {e}")

def force_garbage_collection():
    """Force Python garbage collection to free memory."""
    gc.collect()

_s3_client = None

def get_s3_client():
    """Get or create S3 client (singleton for connection reuse)."""
    global _s3_client
    if _s3_client is None:
        config = Config(
            region_name=AWS_REGION,
            retries={'max_attempts': 3, 'mode': 'adaptive'},
            s3={'addressing_style': 'virtual'},
            max_pool_connections=10
        )
        _s3_client = boto3.client(
            's3',
            config=config,
            aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY')
        )
    return _s3_client

def download_from_s3(s3_url: str, local_path: str) -> None:
    """Download a file from S3 to local path."""
    s3 = get_s3_client()
    
    if s3_url.startswith('s3://'):
        parts = s3_url[5:].split('/', 1)
        bucket = parts[0]
        key = parts[1] if len(parts) > 1 else ''
    elif 's3.amazonaws.com' in s3_url or 's3-accelerate.amazonaws.com' in s3_url:
        parsed = urlparse(s3_url)
        if parsed.netloc.startswith(AWS_S3_BUCKET):
            bucket = AWS_S3_BUCKET
            key = parsed.path.lstrip('/')
        else:
            bucket = parsed.netloc.split('.')[0]
            key = parsed.path.lstrip('/')
    else:
        bucket = AWS_S3_BUCKET
        key = s3_url
    
    logger.info(f"Downloading from S3: bucket={bucket}, key={key}")
    s3.download_file(bucket, key, local_path)
    logger.info(f"Downloaded to: {local_path} ({os.path.getsize(local_path) / 1024 / 1024:.2f} MB)")

def upload_to_s3(local_path: str, s3_key: str, content_type: str = 'video/mp4') -> str:
    """Upload a file to S3 and return the URL."""
    s3 = get_s3_client()
    
    file_size = os.path.getsize(local_path)
    logger.info(f"Uploading to S3: {s3_key} ({file_size / 1024 / 1024:.2f} MB)")
    
    if file_size > 50 * 1024 * 1024:
        from boto3.s3.transfer import TransferConfig
        config = TransferConfig(
            multipart_threshold=25 * 1024 * 1024,
            max_concurrency=4,
            multipart_chunksize=25 * 1024 * 1024
        )
        s3.upload_file(
            local_path, 
            AWS_S3_BUCKET, 
            s3_key,
            ExtraArgs={'ContentType': content_type},
            Config=config
        )
    else:
        s3.upload_file(
            local_path, 
            AWS_S3_BUCKET, 
            s3_key,
            ExtraArgs={'ContentType': content_type}
        )
    
    url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
    logger.info(f"Uploaded to: {url}")
    return url


def download_youtube_clip(url: str, start_time: float, end_time: float, output_path: str) -> None:
    """
    Download only the specified clip portion from YouTube using yt-dlp.
    
    This is MUCH more efficient than downloading the entire video:
    - 3-hour video = ~3GB download
    - 1-minute clip = ~30MB download
    
    Args:
        url: YouTube video URL
        start_time: Start time in seconds
        end_time: End time in seconds
        output_path: Path to save the downloaded clip
    """
    logger.info(f"Downloading YouTube clip: {url}")
    logger.info(f"Time range: {start_time}s - {end_time}s (only downloading this portion)")
    
    def format_time(seconds: float) -> str:
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"
    
    time_range = f"*{format_time(start_time)}-{format_time(end_time)}"
    
    cmd = [
        'yt-dlp',
        '--no-playlist',
        '--download-sections', time_range,
        '--force-keyframes-at-cuts',
        '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]',
        '--merge-output-format', 'mp4',
        '-o', output_path,
        '--no-warnings',
        '--quiet',
        '--no-cache-dir',
        '--no-mtime',
        url
    ]
    
    logger.info(f"Running yt-dlp with clip-only download...")
    
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300
        )
        
        if result.returncode != 0:
            logger.error(f"yt-dlp stderr: {result.stderr}")
            raise Exception(f"yt-dlp failed: {result.stderr}")
        
        if not os.path.exists(output_path):
            for ext in ['.mp4', '.webm', '.mkv']:
                alt_path = output_path.replace('.mp4', '') + ext
                if os.path.exists(alt_path):
                    if alt_path != output_path:
                        os.rename(alt_path, output_path)
                    break
            else:
                raise Exception(f"Downloaded file not found at {output_path}")
        
        file_size = os.path.getsize(output_path)
        logger.info(f"Downloaded clip: {file_size / 1024 / 1024:.2f} MB")
        
    except subprocess.TimeoutExpired:
        raise Exception("YouTube download timed out after 5 minutes")

def download_youtube_full_and_trim(url: str, start_time: float, end_time: float, output_path: str, temp_dir: str) -> None:
    """
    Fallback: Download full video and trim. Used if clip download fails.
    Immediately deletes full video after trimming to save space.
    """
    logger.info(f"Fallback: Downloading full video and trimming")
    
    full_video_path = os.path.join(temp_dir, 'full_video_temp.mp4')
    
    try:
        cmd = [
            'yt-dlp',
            '--no-playlist',
            '-f', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]',
            '--merge-output-format', 'mp4',
            '-o', full_video_path,
            '--no-warnings',
            '--no-cache-dir',
            url
        ]
        
        logger.info("Downloading full video (720p max)...")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=1200)
        
        if result.returncode != 0:
            raise Exception(f"yt-dlp failed: {result.stderr}")
        
        if not os.path.exists(full_video_path):
            if os.path.exists(full_video_path + '.mp4'):
                full_video_path = full_video_path + '.mp4'
            else:
                raise Exception("Downloaded video not found")
        
        full_size = os.path.getsize(full_video_path)
        logger.info(f"Downloaded full video: {full_size / 1024 / 1024:.2f} MB")
        
        duration = end_time - start_time
        ffmpeg_cmd = [
            'ffmpeg', '-y',
            '-ss', str(start_time),
            '-i', full_video_path,
            '-t', str(duration),
            '-c:v', 'libx264',
            '-preset', 'veryfast',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-avoid_negative_ts', 'make_zero',
            '-movflags', '+faststart',
            output_path
        ]
        
        logger.info(f"Trimming: {start_time}s - {end_time}s")
        result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True, timeout=300)
        
        if result.returncode != 0:
            raise Exception(f"FFmpeg trim failed: {result.stderr}")
        
        clip_size = os.path.getsize(output_path)
        logger.info(f"Trimmed clip: {clip_size / 1024 / 1024:.2f} MB (saved {(full_size - clip_size) / 1024 / 1024:.2f} MB)")
        
    finally:
        cleanup_file(full_video_path)
        for f in os.listdir(temp_dir):
            if f.startswith('full_video_temp') and f != os.path.basename(output_path):
                cleanup_file(os.path.join(temp_dir, f))

def get_redis_client() -> redis.Redis:
    """Create Redis client from URL."""
    return redis.from_url(REDIS_URL, decode_responses=True)

def update_status(redis_client: redis.Redis, project_id: str, status: Dict[str, Any]) -> None:
    """Update job status in Redis with short expiry."""
    key = f"{STATUS_KEY_PREFIX}{project_id}"
    redis_client.set(key, json.dumps(status), ex=1800)
    logger.debug(f"Updated status for {project_id}: {status.get('stage', 'unknown')}")

def process_job(job_data: Dict[str, Any], redis_client: redis.Redis) -> Dict[str, Any]:
    """
    Process a single podcast clipper job with optimized resource usage.
    """
    project_id = job_data['project_id']
    job_id = job_data['job_id']
    
    logger.info(f"[{job_id}] Processing job for project {project_id}")
    
    start_time = time.time()
    
    with managed_temp_dir(f'podcast_{project_id[:8]}_') as temp_dir:
        try:
            source_type = job_data.get('source_type', 'youtube')
            clip_start = job_data['clip_start_time']
            clip_end = job_data['clip_end_time']
            clip_duration = clip_end - clip_start
            
            clipped_video_path = os.path.join(temp_dir, 'input_clip.mp4')
            
            if source_type == 'youtube':
                update_status(redis_client, project_id, {
                    'status': 'processing',
                    'stage': 'downloading_youtube',
                    'progress': 5
                })
                
                source_url = job_data['source_url']
                
                try:
                    download_youtube_clip(source_url, clip_start, clip_end, clipped_video_path)
                except Exception as e:
                    logger.warning(f"[{job_id}] Clip download failed, using fallback: {e}")
                    download_youtube_full_and_trim(source_url, clip_start, clip_end, clipped_video_path, temp_dir)
                
            else:
                update_status(redis_client, project_id, {
                    'status': 'processing',
                    'stage': 'downloading_video',
                    'progress': 5
                })
                
                video_path = job_data['video_path']
                full_video_path = os.path.join(temp_dir, 'full_video.mp4')
                download_from_s3(video_path, full_video_path)
                
                update_status(redis_client, project_id, {
                    'status': 'processing',
                    'stage': 'extracting_clip',
                    'progress': 15
                })
                
                ffmpeg_cmd = [
                    'ffmpeg', '-y',
                    '-ss', str(clip_start),
                    '-i', full_video_path,
                    '-t', str(clip_duration),
                    '-c:v', 'libx264',
                    '-preset', 'veryfast',
                    '-crf', '23',
                    '-c:a', 'aac',
                    '-b:a', '128k',
                    '-avoid_negative_ts', 'make_zero',
                    clipped_video_path
                ]
                
                logger.info(f"[{job_id}] Extracting clip: {clip_start}s - {clip_end}s")
                subprocess.run(ffmpeg_cmd, check=True, capture_output=True, timeout=300)
                
                cleanup_file(full_video_path)
            
            force_garbage_collection()
            
            update_status(redis_client, project_id, {
                'status': 'processing',
                'stage': 'analyzing_faces',
                'progress': 25
            })
            
            
            subtitle_style = job_data.get('subtitle_style', 'chris_cinematic')
            whisper_model = job_data.get('whisper_model', 'base')
            
            output_path = os.path.join(temp_dir, 'output.mp4')
            
            
            models_dir = os.path.join(os.path.dirname(__file__), 'models')
            engine = SmartClipEngine(
                models_dir=models_dir,
                temp_dir=temp_dir,
                output_dir=temp_dir
            )
            
            
            def progress_callback(progress: float, message: str):
                mapped_progress = 25 + (progress * 65)  # Map 0-1 to 25-90
                update_status(redis_client, project_id, {
                    'status': 'processing',
                    'stage': message,
                    'progress': int(mapped_progress)
                })
            
            
            result = engine.process(
                input_path=clipped_video_path,
                output_path=output_path,
                start_time=0,
                end_time=clip_duration,
                subtitle_style=subtitle_style,
                whisper_model=whisper_model,
                progress_callback=progress_callback
            )

            
            cleanup_file(clipped_video_path)
            
            
            force_garbage_collection()
            
            
            update_status(redis_client, project_id, {
                'status': 'processing',
                'stage': 'uploading',
                'progress': 92
            })
            
            
            output_prefix = job_data.get('output_prefix', f"podcast-clips/{job_data['user_id']}/{project_id}")
            output_key = f"{output_prefix}/output_{int(time.time())}.mp4"
            
            output_url = upload_to_s3(output_path, output_key)
            
            
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            
            final_status = {
                'status': 'completed',
                'stage': 'completed',
                'progress': 100,
                'output_url': output_url,
                'speakers_detected': result.get('speakers_detected', 1),
                'layout_mode': result.get('layout_mode', 'single'),
                'processing_time_ms': processing_time_ms
            }
            
            update_status(redis_client, project_id, final_status)
            
            logger.info(f"[{job_id}] Job completed in {processing_time_ms / 1000:.1f}s")
            logger.info(f"[{job_id}] Output: {output_url}")
            
            return final_status
            
        except Exception as e:
            error_msg = str(e)
            logger.error(f"[{job_id}] Job failed: {error_msg}")
            logger.error(traceback.format_exc())
            
            update_status(redis_client, project_id, {
                'status': 'failed',
                'stage': 'error',
                'progress': 0,
                'error': error_msg
            })
            
            raise

def run_worker():
    """Main worker loop that polls Redis for jobs."""
    logger.info("=" * 60)
    logger.info("Podcast Clipper Worker Starting (Optimized)")
    logger.info("=" * 60)
    logger.info(f"Redis URL: {REDIS_URL.split('@')[-1] if '@' in REDIS_URL else REDIS_URL}")
    logger.info(f"S3 Bucket: {AWS_S3_BUCKET}")
    logger.info(f"AWS Region: {AWS_REGION}")
    logger.info(f"Max Temp Size: {MAX_TEMP_SIZE_MB} MB")
    logger.info("=" * 60)
    
    redis_client = get_redis_client()
    
    
    try:
        redis_client.ping()
        logger.info("Redis connection successful")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")
        sys.exit(1)
    
    logger.info(f"Listening for jobs on queue: {JOB_QUEUE_KEY}")
    
    jobs_processed = 0
    
    while True:
        try:
            
            result = redis_client.brpop(JOB_QUEUE_KEY, timeout=POLL_INTERVAL)
            
            if result is None:
                continue
            
            queue_name, job_json = result
            
            try:
                job_data = json.loads(job_json)
                logger.info(f"Received job: {job_data.get('job_id', 'unknown')}")
                
                process_job(job_data, redis_client)
                jobs_processed += 1
                
                
                force_garbage_collection()
                
                
                if jobs_processed % 5 == 0:
                    try:
                        import psutil
                        process = psutil.Process()
                        mem_mb = process.memory_info().rss / 1024 / 1024
                        logger.info(f"Jobs processed: {jobs_processed}, Memory usage: {mem_mb:.1f} MB")
                    except ImportError:
                        pass
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid job JSON: {e}")
                continue
            except Exception as e:
                logger.error(f"Job processing failed: {e}")
                continue
                
        except redis.ConnectionError as e:
            logger.error(f"Redis connection lost: {e}")
            logger.info("Attempting to reconnect in 5 seconds...")
            time.sleep(5)
            redis_client = get_redis_client()
            
        except KeyboardInterrupt:
            logger.info("Shutdown signal received")
            break
            
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            logger.error(traceback.format_exc())
            time.sleep(1)
    
    logger.info(f"Worker shutting down. Total jobs processed: {jobs_processed}")

if __name__ == '__main__':
    run_worker()
