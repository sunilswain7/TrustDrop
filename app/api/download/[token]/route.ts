import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { decryptFile } from '@/lib/encryption';
import { readEncryptedFile } from '@/lib/storage';

// GET /api/download/:token — decrypt + stream file to buyer
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  // 1. Find purchase by token
  const purchaseResult = await query(
    'SELECT * FROM purchases WHERE download_token = $1',
    [token]
  );

  if (!purchaseResult.rows.length) {
    return NextResponse.json({ error: 'Invalid download token' }, { status: 404 });
  }

  const purchase = purchaseResult.rows[0] as Record<string, unknown>;

  // Check if already downloaded
  if (purchase.downloaded) {
    return NextResponse.json({ error: 'File already downloaded' }, { status: 410 });
  }

  // Check expiry
  if (new Date() > new Date(purchase.download_token_expires as string)) {
    return NextResponse.json({ error: 'Download link expired' }, { status: 410 });
  }

  // 2. Get listing + encryption key
  const listingResult = await query(
    'SELECT * FROM listings WHERE id = $1',
    [purchase.listing_id]
  );

  if (!listingResult.rows.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const listing = listingResult.rows[0] as Record<string, unknown>;

  // 3. Read encrypted file from Volume
  const encryptedBlob = await readEncryptedFile(listing.encrypted_file_path as string);

  // 4. Decrypt
  const decryptedFile = decryptFile(encryptedBlob, listing.encryption_key_enc as string);

  // 5. Mark as downloaded
  await query('UPDATE purchases SET downloaded = true WHERE id = $1', [purchase.id]);

  console.log(`[DOWNLOAD] File decrypted and served for listing ${listing.id}, purchase ${purchase.id}`);

  // 6. Stream to buyer
  return new NextResponse(new Uint8Array(decryptedFile), {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${listing.title}.${listing.file_type}"`,
      'Content-Length': decryptedFile.length.toString(),
    },
  });
}
