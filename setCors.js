import dotenv from 'dotenv';
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';

dotenv.config();

const missing = [];
if (!process.env.S3_BUCKET) missing.push('S3_BUCKET');
if (!process.env.S3_ACCESS_KEY) missing.push('S3_ACCESS_KEY');
if (!process.env.S3_SECRET_KEY) missing.push('S3_SECRET_KEY');

// Provide safe defaults for region/endpoint if not set
if (!process.env.S3_REGION) process.env.S3_REGION = 'us-east-1';
if (!process.env.S3_ENDPOINT) process.env.S3_ENDPOINT = 'https://s3.us-east-1.wasabisys.com';

if (missing.length) {
  console.error('❌ Missing required env vars:', missing.join(', '));
  console.error('Create a .env with at least:\nS3_BUCKET=patient\nS3_ACCESS_KEY=...\nS3_SECRET_KEY=...\n[optional] S3_REGION=us-east-1\n[optional] S3_ENDPOINT=https://s3.us-east-1.wasabisys.com');
  process.exit(1);
}

console.log('ℹ️ Using S3 config:', {
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  bucket: process.env.S3_BUCKET
});

const s3 = new S3Client({
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY
  },
  forcePathStyle: true // important for Wasabi
});

const Bucket = process.env.S3_BUCKET;

// Customize your allowed origins here:
const corsConfig = {
  CORSConfiguration: {
    CORSRules: [
      {
        AllowedOrigins: ['http://localhost:5173', 'https://lwilliams002.github.io'],
        AllowedMethods: ['GET', 'PUT', 'HEAD'],
        AllowedHeaders: ['*'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3000
      }
    ]
  }
};

try {
  await s3.send(new PutBucketCorsCommand({ Bucket, ...corsConfig }));
  console.log('✅ CORS applied.');

  const out = await s3.send(new GetBucketCorsCommand({ Bucket }));
  console.log('🔎 Current CORS:', JSON.stringify(out, null, 2));
} catch (err) {
  console.error('❌ Failed to set CORS:', err);
  process.exit(1);
}