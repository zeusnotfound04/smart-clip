# Environment Configuration for Video Generation

This guide will help you set up the required environment variables for the complete video generation feature.

## Required Services

### 1. Google Cloud Text-to-Speech
For AI narration generation.

### 2. AWS S3
For video and audio file storage.

### 3. Google Gemini API
For AI script generation (already configured).

---

## Environment Variables Setup

### 1. Google Cloud Text-to-Speech Setup

1. **Create Google Cloud Project**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Note your project ID

2. **Enable Text-to-Speech API**
   ```bash
   gcloud services enable texttospeech.googleapis.com
   ```

3. **Create Service Account**
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Name: `smartclip-tts-service`
   - Grant role: "Text-to-Speech Admin"

4. **Generate Service Account Key**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key" > JSON
   - Download the JSON file

5. **Set Environment Variables**
   ```bash
   # Google Cloud Project ID
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   
   # Service Account Credentials (from downloaded JSON)
   GOOGLE_CLOUD_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
   GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
   ```

### 2. AWS S3 Setup

1. **Create S3 Bucket**
   - Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
   - Click "Create bucket"
   - Bucket name: `smartclip-videos-[random]` (must be globally unique)
   - Region: Choose your preferred region
   - **Important**: Enable public read access for generated videos

2. **Configure Bucket Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadGetObject",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-bucket-name/*"
       }
     ]
   }
   ```

3. **Create IAM User**
   - Go to IAM > Users
   - Click "Add user"
   - Username: `smartclip-s3-user`
   - Access type: "Programmatic access"
   - Attach policy: "AmazonS3FullAccess"

4. **Set Environment Variables**
   ```bash
   # AWS S3 Configuration
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=your-bucket-name
   ```

### 3. Complete .env File

Create or update your `.env` file:

```bash
# Existing Configuration
GOOGLE_API_KEY=your-gemini-api-key
DATABASE_URL=your-database-url
NEXTAUTH_SECRET=your-nextauth-secret

# Google Cloud Text-to-Speech
GOOGLE_CLOUD_PROJECT_ID=your-gcp-project-id
GOOGLE_CLOUD_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key\n-----END PRIVATE KEY-----\n"

# AWS S3 Storage
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-s3-bucket-name
```

---

## Verification

### Test Google Cloud TTS
```bash
# In your API directory
npm install @google-cloud/text-to-speech
node -e "
const {TextToSpeechClient} = require('@google-cloud/text-to-speech');
const client = new TextToSpeechClient();
client.listVoices().then(console.log).catch(console.error);
"
```

### Test AWS S3 Connection
```bash
# In your API directory
npm install @aws-sdk/client-s3
node -e "
const {S3Client, ListBucketsCommand} = require('@aws-sdk/client-s3');
const client = new S3Client({region: process.env.AWS_REGION});
client.send(new ListBucketsCommand({})).then(console.log).catch(console.error);
"
```

---

## Cost Estimation

### Google Cloud TTS Pricing (as of 2024)
- **Standard voices**: $4.00 per 1 million characters
- **Premium/Neural voices**: $16.00 per 1 million characters
- **Free tier**: 1 million characters per month

**Example**: A 200-word script (~1,000 characters) costs approximately $0.016

### AWS S3 Pricing (as of 2024)
- **Storage**: $0.023 per GB per month
- **PUT requests**: $0.0005 per 1,000 requests
- **GET requests**: $0.0004 per 10,000 requests

**Example**: A 50MB video costs approximately $0.00115 per month to store

### Total Estimated Cost Per Video
- Script Generation (Gemini): ~$0.001-0.01
- Audio Generation (TTS): ~$0.016
- Video Storage (S3): ~$0.001/month
- **Total per video**: ~$0.02 + storage costs

---

## Troubleshooting

### Common Issues

1. **Google Cloud Authentication Error**
   ```
   Error: Could not load the default credentials
   ```
   **Solution**: Verify `GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_CLIENT_EMAIL`, and `GOOGLE_CLOUD_PRIVATE_KEY` are set correctly.

2. **AWS S3 Access Denied**
   ```
   Error: Access Denied
   ```
   **Solution**: Check IAM permissions and bucket policy. Ensure the user has S3 full access.

3. **Private Key Format Error**
   ```
   Error: Invalid private key format
   ```
   **Solution**: Ensure the private key includes proper line breaks. Use double quotes and `\\n` for newlines.

4. **CORS Issues**
   - Configure CORS in your S3 bucket settings to allow your domain
   - Add proper headers for video playback

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
DEBUG=video-generation:*
```

---

## Security Best Practices

1. **Rotate Keys Regularly**
   - Rotate AWS access keys every 90 days
   - Rotate Google Cloud service account keys annually

2. **Limit Permissions**
   - Use minimal required permissions
   - Consider separate buckets for different environments

3. **Monitor Usage**
   - Set up billing alerts in both AWS and Google Cloud
   - Monitor API usage for unusual spikes

4. **Environment Isolation**
   - Use different credentials for development/production
   - Never commit credentials to version control

---

## Production Deployment

### Environment Variables in Production

**Vercel**:
- Add all environment variables in Vercel dashboard
- Use Vercel's secret management for sensitive values

**Railway**:
- Set environment variables in Railway dashboard
- Use Railway's built-in secret management

**Docker**:
- Use Docker secrets or external secret management
- Never include secrets in Docker images

**Example Docker Compose**:
```yaml
version: '3.8'
services:
  api:
    build: .
    environment:
      - GOOGLE_CLOUD_PROJECT_ID=${GOOGLE_CLOUD_PROJECT_ID}
      - GOOGLE_CLOUD_CLIENT_EMAIL=${GOOGLE_CLOUD_CLIENT_EMAIL}
      - GOOGLE_CLOUD_PRIVATE_KEY=${GOOGLE_CLOUD_PRIVATE_KEY}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_REGION=${AWS_REGION}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
```

---

## Feature Status

✅ **Working Features**:
- AI Script Generation (Gemini 2.5 Pro)
- Text-to-Speech Narration (Google Cloud TTS)
- Video Processing (FFmpeg)
- S3 Upload & Storage
- Audio-Video Synchronization
- Library Video Selection

🔄 **Optional Enhancements**:
- Multiple voice support per video
- Background music mixing
- Video effects and transitions
- Batch processing
- Real-time progress tracking

Need help? Check the [Video Generation API Documentation](../VIDEO_GENERATION.md) for detailed technical information.