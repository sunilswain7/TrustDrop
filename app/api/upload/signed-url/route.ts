import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createSignedUploadUrl } from '@/lib/storage';
import { BUCKETS } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { fileName, fileType } = await req.json();
  if (!fileName) {
    return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
  }

  const uploadId = crypto.randomUUID();
  const ext = fileName.split('.').pop()?.toLowerCase() || 'bin';
  const isPreview = fileType === 'preview';
  const bucket = isPreview ? BUCKETS.previews : BUCKETS.files;
  const path = `uploads/${uploadId}.${ext}`;

  const data = await createSignedUploadUrl(bucket, path);

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path,
    bucket,
  });
}
