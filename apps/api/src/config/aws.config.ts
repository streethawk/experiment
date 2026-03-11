import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'eu-west-2',
  s3: {
    endpoint: process.env.S3_ENDPOINT,   // MinIO in local dev, undefined in prod
    bucket: process.env.S3_BUCKET || 'carecore-documents',
    accessKeyId: process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  },
  ses: {
    endpoint: process.env.SES_ENDPOINT,  // MailHog in local dev
    fromAddress: process.env.SES_FROM_ADDRESS || 'noreply@carecore.co.uk',
  },
}));
