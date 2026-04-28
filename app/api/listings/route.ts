import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { encryptFile } from '@/lib/encryption';
import { saveEncryptedFile, savePreview } from '@/lib/storage';
import { generatePreview, watermarkSellerScreenshot } from '@/lib/preview';
import { suggestPrice, generateDescription } from '@/lib/listing-agent';
import { query } from '@/lib/db';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// POST /api/listings — create a new listing
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const previewFile = formData.get('preview') as File | null;
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const category = formData.get('category') as string;
  const priceStr = formData.get('price') as string;

  // Validation
  if (!file || !title || !category) {
    return NextResponse.json(
      { error: 'file, title, and category are required' },
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const isImage = IMAGE_EXTENSIONS.includes(fileExt);

  // Non-image files require a seller-provided screenshot
  if (!isImage && !previewFile) {
    return NextResponse.json(
      { error: 'Non-image files require a preview screenshot' },
      { status: 400 }
    );
  }

  // 1. Encrypt the file
  const { encryptedBlob, encryptedKey, fileHash } = encryptFile(fileBuffer);

  // 2. Create listing record first to get ID
  const userId = (user as { id: string }).id;
  const walletAddress = (user as { locus_wallet_address: string }).locus_wallet_address;

  // Get price suggestion if none provided
  let price = priceStr ? parseFloat(priceStr) : 0;
  let desc = description;

  if (!price) {
    const suggestion = await suggestPrice({ title, category, description });
    price = suggestion.suggestedPrice;
  }

  if (!desc) {
    desc = await generateDescription({ title, category, sellerNotes: description });
  }

  const insertResult = await query(
    `INSERT INTO listings
     (seller_id, title, description, price_usdc, category, file_type,
      file_size_bytes, original_file_hash, encrypted_file_path,
      encryption_key_enc, preview_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      userId, title, desc, price, category, fileExt,
      file.size, fileHash, 'pending', encryptedKey, 'pending', 'ACTIVE',
    ]
  );

  const listingId = (insertResult.rows[0] as { id: string }).id;

  // 3. Save encrypted file
  const encryptedPath = await saveEncryptedFile(listingId, encryptedBlob);

  // 4. Generate preview
  let previewUrl: string;
  if (isImage) {
    const previewBuffer = await generatePreview(fileBuffer);
    previewUrl = await savePreview(listingId, 1, previewBuffer);
  } else {
    const screenshotBuffer = Buffer.from(await previewFile!.arrayBuffer());
    const watermarked = await watermarkSellerScreenshot(screenshotBuffer);
    previewUrl = await savePreview(listingId, 1, watermarked);
  }

  // 5. Create Locus Checkout session
  let checkoutSessionId: string | null = null;
  let checkoutUrl: string | null = null;
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const { createCheckoutSession } = await import('@/lib/locus');
    const session = await createCheckoutSession({
      amount: String(price),
      description: `TrustDrop: ${title}`,
      webhookUrl: `${APP_URL}/api/checkout/webhook`,
      successUrl: `${APP_URL}/listing/${listingId}?paid=true`,
      metadata: { listingId, sellerWallet: walletAddress },
    });
    checkoutSessionId = session.id;
    checkoutUrl = session.checkoutUrl;
    console.log(`[LISTING] Checkout session created: ${session.id}`);
  } catch (err) {
    console.warn('[LISTING] Could not create checkout session (will be created on buy):', err);
  }

  // 6. Update listing with actual paths + checkout session
  await query(
    `UPDATE listings SET encrypted_file_path = $1, preview_url = $2,
     checkout_session_id = $3, checkout_url = $4 WHERE id = $5`,
    [encryptedPath, previewUrl, checkoutSessionId, checkoutUrl, listingId]
  );

  return NextResponse.json({
    id: listingId,
    title,
    price,
    category,
    previewUrl,
    checkoutSessionId,
    checkoutUrl,
    status: 'ACTIVE',
  }, { status: 201 });
}

// GET /api/listings — browse listings
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status') || 'ACTIVE';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const search = searchParams.get('q');

  let sql = `
    SELECT l.id, l.title, l.description, l.price_usdc, l.category,
           l.file_type, l.preview_url, l.preview_version, l.status,
           l.created_at, l.checkout_session_id, l.checkout_url,
           u.display_name as seller_name, u.trust_score as seller_trust,
           u.locus_wallet_address as seller_wallet
    FROM listings l
    JOIN users u ON l.seller_id = u.id
    WHERE l.status = $1
  `;
  const params: unknown[] = [status];
  let paramIdx = 2;

  if (category) {
    sql += ` AND l.category = $${paramIdx}`;
    params.push(category);
    paramIdx++;
  }

  if (search) {
    sql += ` AND (l.title ILIKE $${paramIdx} OR l.description ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  sql += ` ORDER BY l.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`;
  params.push(limit, offset);

  const result = await query(sql, params);

  // Get total count
  let countSql = 'SELECT COUNT(*) as total FROM listings WHERE status = $1';
  const countParams: unknown[] = [status];
  if (category) {
    countSql += ' AND category = $2';
    countParams.push(category);
  }

  const countResult = await query(countSql, countParams);
  const total = parseInt((countResult.rows[0] as { total: string }).total);

  return NextResponse.json({
    listings: result.rows,
    pagination: { total, limit, offset, hasMore: offset + limit < total },
  });
}
