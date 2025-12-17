export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getAuthClientFromEnv, requireProjectId } from '@/lib/gcloud';

async function getStorage() {
  const projectId = requireProjectId();
  const authClient = await getAuthClientFromEnv(['https://www.googleapis.com/auth/devstorage.read_write']);
  const storage = new Storage({ projectId, authClient });
  return storage;
}

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType, action = 'write' } = await req.json();

    if (!fileName) {
      return NextResponse.json({ ok: false, error: 'fileName is required.' }, { status: 400 });
    }

    if (action === 'write' && !contentType) {
      return NextResponse.json({ ok: false, error: 'contentType is required for write action.' }, { status: 400 });
    }

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('The GCS_BUCKET_NAME environment variable is not set.');
    }

    const storage = await getStorage();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    const options: any = {
      version: 'v4',
      action: action,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    };

    if (action === 'write') {
      options.contentType = contentType;
    }

    const [url] = await file.getSignedUrl(options);

    return NextResponse.json({ ok: true, signedUrl: url });

  } catch (e: any) {
    console.error('Error generating signed URL:', e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? 'Unknown error') }, { status: 500 });
  }
}
