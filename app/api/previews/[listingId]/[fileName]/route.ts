import { readPreview } from '@/lib/storage';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/previews/:listingId/:fileName — serve preview images
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ listingId: string; fileName: string }> }
) {
  const { listingId, fileName } = await params;

  try {
    const imageBuffer = await readPreview(listingId, fileName);
    return new NextResponse(new Uint8Array(imageBuffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Preview not found' }, { status: 404 });
  }
}
