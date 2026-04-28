import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { broadcastToRoom } from '@/lib/websocket';

// GET /api/room/:id/messages — chat history
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
  const before = searchParams.get('before'); // cursor for pagination

  let sql = `
    SELECT m.id, m.sender_id, m.sender_role, m.message_type, m.content,
           m.preview_url, m.new_price, m.created_at,
           u.display_name as sender_name
    FROM room_messages m
    JOIN users u ON m.sender_id = u.id
    WHERE m.listing_id = $1
  `;
  const sqlParams: unknown[] = [listingId];

  if (before) {
    sql += ` AND m.created_at < $2`;
    sqlParams.push(before);
  }

  sql += ` ORDER BY m.created_at ASC LIMIT $${sqlParams.length + 1}`;
  sqlParams.push(limit);

  const result = await query(sql, sqlParams);

  // Also get listing info for room context
  const listingResult = await query(
    `SELECT l.id, l.title, l.price_usdc, l.preview_url, l.preview_version,
            l.status, l.seller_id, l.checkout_session_id
     FROM listings l WHERE l.id = $1`,
    [listingId]
  );

  return NextResponse.json({
    messages: result.rows,
    listing: listingResult.rows[0] || null,
  });
}

// POST /api/room/:id/messages — send a message
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
  const body = await req.json();
  const { content } = body;

  if (!content || !content.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  // Determine sender role
  const listingResult = await query(
    'SELECT seller_id, status FROM listings WHERE id = $1',
    [listingId]
  );

  if (!listingResult.rows.length) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  const listing = listingResult.rows[0] as { seller_id: string; status: string };

  if (listing.status === 'SOLD') {
    return NextResponse.json({ error: 'Room is archived (item sold)' }, { status: 400 });
  }

  const senderRole = listing.seller_id === userId ? 'seller' : 'buyer';

  // Save message
  const result = await query(
    `INSERT INTO room_messages (listing_id, sender_id, sender_role, message_type, content)
     VALUES ($1, $2, $3, 'text', $4)
     RETURNING id, created_at`,
    [listingId, userId, senderRole, content.trim()]
  );

  const msg = result.rows[0] as { id: string; created_at: string };

  // Broadcast via WebSocket
  broadcastToRoom(listingId, {
    type: 'text',
    senderId: userId,
    senderRole,
    content: content.trim(),
    timestamp: msg.created_at,
  });

  return NextResponse.json({
    id: msg.id,
    senderRole,
    createdAt: msg.created_at,
  }, { status: 201 });
}
