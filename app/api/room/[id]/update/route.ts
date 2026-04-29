import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { encryptFile } from '@/lib/encryption';
import { saveEncryptedFile, deleteEncryptedFile, savePreview } from '@/lib/storage';
import { generatePreview, watermarkSellerScreenshot } from '@/lib/preview';
import { cancelCheckoutSession, createCheckoutSession } from '@/lib/locus';
import { broadcastToRoom } from '@/lib/websocket';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST /api/room/:id/update — seller uploads improved file + optional price change
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (user as { id: string }).id;

  // Verify seller ownership
  const listingResult = await query(
    `SELECT l.*, u.locus_wallet_address as seller_wallet
     FROM listings l JOIN users u ON l.seller_id = u.id
     WHERE l.id = $1 AND l.seller_id = $2`,
    [listingId, userId]
  );

  if (!listingResult.rows.length) {
    return NextResponse.json({ error: 'Listing not found or not yours' }, { status: 404 });
  }

  const listing = listingResult.rows[0] as Record<string, unknown>;

  if (listing.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Listing is not active' }, { status: 400 });
  }

  const body = await req.json();
  const { filePath, previewPath, price: newPriceStr, fileName } = body as {
    filePath?: string;
    previewPath?: string;
    price?: string;
    fileName?: string;
  };

  if (!filePath && !newPriceStr) {
    return NextResponse.json(
      { error: 'Provide an updated file and/or new price' },
      { status: 400 }
    );
  }

  const currentVersion = (listing.preview_version as number) || 1;
  const newVersion = currentVersion + 1;
  let newPreviewUrl = listing.preview_url as string;
  let newPrice = listing.price_usdc as number;
  const fileType = listing.file_type as string;

  // --- Handle file update ---
  if (filePath) {
    const { downloadRawUpload, deleteRawUpload } = await import('@/lib/storage');
    const fileBuffer = await downloadRawUpload(filePath);
    const isImage = IMAGE_EXTENSIONS.includes(fileType);

    // 1. Delete old encrypted file
    await deleteEncryptedFile(listing.encrypted_file_path as string);

    // 2. Encrypt new file with NEW key
    const { encryptedBlob, encryptedKey, fileHash } = encryptFile(fileBuffer);

    // 3. Save new encrypted file
    const newPath = await saveEncryptedFile(listingId, encryptedBlob);

    // 4. Generate new preview
    if (isImage) {
      const previewBuffer = await generatePreview(fileBuffer);
      newPreviewUrl = await savePreview(listingId, newVersion, previewBuffer);
    } else if (previewPath) {
      const screenshotBuffer = await downloadRawUpload(previewPath);
      const watermarked = await watermarkSellerScreenshot(screenshotBuffer);
      newPreviewUrl = await savePreview(listingId, newVersion, watermarked);
      await deleteRawUpload(previewPath).catch(() => {});
    }

    // Clean up raw upload
    await deleteRawUpload(filePath).catch(() => {});

    // 5. Update listing with new file data
    await query(
      `UPDATE listings SET encrypted_file_path = $1, encryption_key_enc = $2,
       original_file_hash = $3, file_size_bytes = $4, preview_url = $5,
       preview_version = $6, updated_at = NOW() WHERE id = $7`,
      [newPath, encryptedKey, fileHash, fileBuffer.length, newPreviewUrl, newVersion, listingId]
    );

    // Broadcast preview update
    broadcastToRoom(listingId, {
      type: 'preview_update',
      senderId: userId,
      senderRole: 'seller',
      content: `Preview updated (v${newVersion})`,
      previewUrl: newPreviewUrl,
      timestamp: new Date().toISOString(),
    });

    // System message in chat
    await query(
      `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content, preview_url)
       VALUES ($1, $2, 'seller', 'preview_update', $3, $4)`,
      [listingId, userId, `Preview updated to v${newVersion}`, newPreviewUrl]
    );
  }

  // --- Handle price update ---
  if (newPriceStr) {
    newPrice = parseFloat(newPriceStr);
    if (isNaN(newPrice) || newPrice <= 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    // 6. Cancel old Checkout session
    if (listing.checkout_session_id) {
      try {
        await cancelCheckoutSession(listing.checkout_session_id as string);
        console.log(`[ROOM] Cancelled old session: ${listing.checkout_session_id}`);
      } catch (err) {
        console.warn('[ROOM] Could not cancel old session:', err);
      }
    }

    // 7. Create new Checkout session with updated price
    let checkoutSessionId: string | null = null;
    let checkoutUrl: string | null = null;

    try {
      const session = await createCheckoutSession({
        amount: String(newPrice),
        description: `TrustDrop: ${listing.title}`,
        webhookUrl: `${APP_URL}/api/checkout/webhook`,
        successUrl: `${APP_URL}/listing/${listingId}?paid=true`,
        metadata: {
          listingId,
          sellerWallet: listing.seller_wallet as string,
        },
      });
      checkoutSessionId = session.id;
      checkoutUrl = session.checkoutUrl;
      console.log(`[ROOM] New checkout session: ${session.id} — $${newPrice} USDC`);
    } catch (err) {
      console.warn('[ROOM] Could not create new checkout session:', err);
    }

    // 8. Update listing price + session
    await query(
      `UPDATE listings SET price_usdc = $1, checkout_session_id = $2,
       checkout_url = $3, updated_at = NOW() WHERE id = $4`,
      [newPrice, checkoutSessionId, checkoutUrl, listingId]
    );

    // Broadcast price update
    broadcastToRoom(listingId, {
      type: 'price_update',
      senderId: userId,
      senderRole: 'seller',
      content: `Price updated to $${newPrice.toFixed(2)} USDC`,
      newPrice,
      timestamp: new Date().toISOString(),
    });

    // System message in chat
    await query(
      `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content, new_price)
       VALUES ($1, $2, 'seller', 'price_update', $3, $4)`,
      [listingId, userId, `Price updated to $${newPrice.toFixed(2)} USDC`, newPrice]
    );
  }

  return NextResponse.json({
    success: true,
    previewUrl: newPreviewUrl,
    previewVersion: filePath ? newVersion : currentVersion,
    price: newPrice,
  });
}
