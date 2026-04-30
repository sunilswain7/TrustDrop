'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import CommitmentRequest from './CommitmentRequest';
import ShareLink from './ShareLink';
import DirectCheckoutLink from './DirectCheckoutLink';
import { SkeletonRoom } from './Skeleton';

interface Message {
  id: string;
  sender_id: string;
  sender_role: string;
  sender_name: string | null;
  message_type: string;
  content: string;
  preview_url: string | null;
  new_price: string | null;
  created_at: string;
}

interface ListingContext {
  id: string;
  title: string;
  price_usdc: string;
  preview_url: string;
  preview_version: number;
  status: string;
  seller_id: string;
  checkout_session_id: string | null;
  checkout_url: string | null;
}

interface Commitment {
  id: string;
  buyer_id: string;
  seller_id: string;
  amount_usdc: string;
  status: string;
  deadline: string;
  created_at: string;
  requested_changes: string;
}

interface ImprovementRoomProps {
  listingId: string;
  currentUserId: string;
  isSeller: boolean;
}

// Shows h/m/s countdown — updated every second when commitment is HELD
function formatRemaining(deadlineIso: string): string {
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Upload a file to Supabase via a server-issued signed URL
async function uploadToSupabase(file: File, fileType?: 'preview'): Promise<string> {
  const res = await fetch('/api/upload/signed-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileType }),
  });
  if (!res.ok) throw new Error('Failed to get upload URL');
  const { signedUrl, path } = await res.json();
  const uploadRes = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' },
    body: file,
  });
  if (!uploadRes.ok) throw new Error('Failed to upload file');
  return path;
}

export default function ImprovementRoom({
  listingId,
  currentUserId,
  isSeller,
}: ImprovementRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [commitment, setCommitment] = useState<Commitment | null>(null);
  const [sellerDelivered, setSellerDelivered] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setNowTick] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showUpdatePanel, setShowUpdatePanel] = useState(false);
  const [updateFile, setUpdateFile] = useState<File | null>(null);
  const [updatePreview, setUpdatePreview] = useState<File | null>(null);
  const [updatePrice, setUpdatePrice] = useState('');
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${listingId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
      setListing(data.listing || null);
      setCommitment(data.commitment || null);
      setSellerDelivered(Boolean(data.sellerDeliveredAfterCommit));
    } catch {
      console.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchMessages();
    fetch(`/api/room/${listingId}/check-deadline`, { method: 'POST' }).catch(() => {});
  }, [fetchMessages, listingId]);

  // 1-second tick to keep countdown display live when commitment is held
  useEffect(() => {
    if (!commitment || commitment.status !== 'HELD') return;
    const t = setInterval(() => setNowTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [commitment]);

  // Poll for new messages; also trigger deadline check when commitment expires
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMessages();
      if (commitment?.status === 'HELD') {
        const deadlineMs = new Date(commitment.deadline).getTime() - Date.now();
        if (deadlineMs <= 0) {
          fetch(`/api/room/${listingId}/check-deadline`, { method: 'POST' }).catch(() => {});
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages, listingId, commitment]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // WebSocket connection (polling fallback is the setInterval above)
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const role = isSeller ? 'seller' : 'buyer';
    const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${listingId}&userId=${currentUserId}&role=${role}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        fetchMessages();
        if (msg.type === 'price_update' && msg.newPrice) {
          setListing((prev) => prev ? { ...prev, price_usdc: String(msg.newPrice) } : prev);
        }
        if (msg.type === 'preview_update' && msg.previewUrl) {
          setListing((prev) => prev ? {
            ...prev,
            preview_url: msg.previewUrl,
            preview_version: (prev.preview_version || 1) + 1,
          } : prev);
        }
      };
      ws.onerror = () => {
        console.warn('[WS] Connection failed — using polling fallback');
      };
    } catch {
      // WS not available, polling handles it
    }

    return () => { ws?.close(); };
  }, [listingId, currentUserId, isSeller, fetchMessages]);

  async function handleSend(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await fetch(`/api/room/${listingId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });
      setNewMessage('');
      await fetchMessages();
    } catch {
      console.error('Failed to send message');
    } finally {
      setSending(false);
    }
  }

  // Seller: upload improved file via Supabase signed URL, then notify the room
  async function handleUpdate(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!updateFile && !updatePrice) return;

    setUpdating(true);
    try {
      let filePath: string | undefined;
      let previewPath: string | undefined;
      if (updateFile) filePath = await uploadToSupabase(updateFile);
      if (updatePreview) previewPath = await uploadToSupabase(updatePreview, 'preview');

      const res = await fetch(`/api/room/${listingId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath,
          previewPath,
          price: updatePrice || undefined,
          fileName: updateFile?.name,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setListing((prev) => prev ? {
          ...prev,
          preview_url: data.previewUrl,
          preview_version: data.previewVersion,
          price_usdc: String(data.price),
        } : prev);
        setUpdateFile(null);
        setUpdatePreview(null);
        setUpdatePrice('');
        setShowUpdatePanel(false);
        await fetchMessages();
      }
    } catch {
      console.error('Failed to update');
    } finally {
      setUpdating(false);
    }
  }

  const isArchived = listing?.status === 'SOLD';
  const heldCommitment = commitment?.status === 'HELD' ? commitment : null;
  const myHeldCommitment =
    heldCommitment && !isSeller && heldCommitment.buyer_id === currentUserId
      ? heldCommitment
      : null;

  async function handleReject() {
    if (rejecting) return;
    setRejecting(true);
    try {
      const res = await fetch(`/api/room/${listingId}/reject`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Reject failed', data);
      }
      await fetchMessages();
    } catch (err) {
      console.error('Reject network error', err);
    } finally {
      setRejecting(false);
    }
  }

  if (loading) return <SkeletonRoom />;

  return (
    <div className="flex flex-col h-full">

      {/* Room header */}
      <div className="border-b-2 border-[var(--ink)] bg-[var(--bg-cream)] p-3 sm:p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h2
            className="font-bold text-[var(--ink)] truncate uppercase text-sm sm:text-base"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {listing?.title || 'Improvement Room'}
          </h2>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-sm font-bold text-[var(--accent-green)]">
              ${listing ? parseFloat(listing.price_usdc).toFixed(2) : '—'} USDC
            </span>
            {listing && (
              <span className="text-[11px] text-[var(--ink-soft)] uppercase font-semibold tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                Preview v{listing.preview_version}
              </span>
            )}
            {isArchived && (
              <span
                className="text-[10px] border border-[var(--ink)] px-2 py-0.5 uppercase font-bold tracking-wide"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--bg-cream-alt)' }}
              >
                Archived
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isArchived && listing && (
            <div className="hidden sm:flex gap-2">
              <ShareLink listingId={listingId} />
              <DirectCheckoutLink checkoutUrl={listing.checkout_url} />
            </div>
          )}
          {listing?.preview_url && listing.preview_url !== 'pending' && (
            <img
              src={listing.preview_url}
              alt="Current preview"
              className="w-12 h-12 sm:w-14 sm:h-14 object-cover border-2 border-[var(--ink)]"
              style={{ boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
            />
          )}
        </div>
      </div>

      {/* Commitment countdown banner — changes color as deadline approaches */}
      {heldCommitment && (() => {
        const remaining = formatRemaining(heldCommitment.deadline);
        const isExpired = remaining === 'expired';
        const isUrgent = !isExpired && new Date(heldCommitment.deadline).getTime() - Date.now() < 60_000;
        const bg = isExpired
          ? 'var(--accent-coral)'
          : isUrgent
          ? '#F5B82E'
          : 'var(--accent-yellow)';
        return (
          <div
            className="border-b-2 border-[var(--ink)] px-4 py-2 text-sm font-semibold text-[var(--ink)] flex items-center justify-between gap-3 flex-wrap"
            style={{ background: bg }}
          >
            <span>
              {isSeller ? 'Buyer committed' : 'You committed'} ${parseFloat(heldCommitment.amount_usdc).toFixed(2)} —{' '}
              {sellerDelivered
                ? 'Seller delivered. Buyer can now Buy or Reject.'
                : isExpired
                  ? 'Deadline expired. Refund processing…'
                  : `Seller has ${remaining} to deliver.`}
            </span>
            {!sellerDelivered && !isExpired && (
              <span
                className="font-mono text-sm font-bold shrink-0"
                style={{ fontFamily: 'var(--font-display)', animation: isUrgent ? 'skeleton-pulse 0.6s ease-in-out infinite' : 'none' }}
              >
                {remaining}
              </span>
            )}
          </div>
        );
      })()}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-[var(--bg-cream)]">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p
              className="text-[var(--ink-soft)] font-bold uppercase tracking-wide text-sm"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              No messages yet.
            </p>
            <p className="text-sm text-[var(--ink-soft)] mt-1">Start a conversation about this listing.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.message_type === 'system' || msg.message_type === 'preview_update' || msg.message_type === 'price_update';
            const isMe = msg.sender_id === currentUserId;

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span
                    className="text-[11px] border-2 border-[var(--ink)] px-3 py-1 font-semibold uppercase tracking-wide inline-block"
                    style={{ background: 'var(--bg-cream-alt)', fontFamily: 'var(--font-display)', boxShadow: '2px 2px 0 0 var(--shadow-hard)' }}
                  >
                    {msg.content}
                  </span>
                  {msg.preview_url && (
                    <img
                      src={msg.preview_url}
                      alt="Updated preview"
                      className="mx-auto mt-2 w-40 sm:w-48 border-2 border-[var(--ink)]"
                      style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
                    />
                  )}
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 border-2 border-[var(--ink)] ${
                    isMe ? 'bg-[var(--accent-green)] text-[var(--ink)]' : 'bg-[var(--bg-cream-alt)] text-[var(--ink)]'
                  }`}
                  style={{ boxShadow: '3px 3px 0 0 var(--shadow-hard)' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>
                      {msg.sender_name || (msg.sender_role === 'seller' ? 'Seller' : 'Buyer')}
                    </span>
                    <span className="text-[11px] text-[var(--ink-soft)]">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{msg.content}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Seller update panel */}
      {isSeller && !isArchived && showUpdatePanel && (
        <div className="border-t-2 border-[var(--ink)] p-4 bg-[var(--bg-cream-alt)]">
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex-1 text-[11px] truncate"
                style={{ padding: '7px 12px', fontSize: '11px' }}
              >
                {updateFile ? updateFile.name : 'Upload improved file'}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => setUpdateFile(e.target.files?.[0] || null)} />
              <button
                type="button"
                onClick={() => previewInputRef.current?.click()}
                className="btn-secondary text-[11px]"
                style={{ padding: '7px 12px', fontSize: '11px' }}
              >
                {updatePreview ? '✓ Screenshot' : '+ Screenshot'}
              </button>
              <input ref={previewInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => setUpdatePreview(e.target.files?.[0] || null)} />
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-soft)] text-sm font-bold">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={updatePrice}
                  onChange={(e) => setUpdatePrice(e.target.value)}
                  placeholder={listing ? parseFloat(listing.price_usdc).toFixed(2) : 'New price'}
                  className="input-retro pl-7"
                  style={{ padding: '8px 14px 8px 28px' }}
                />
              </div>
              <button
                type="submit"
                disabled={updating || (!updateFile && !updatePrice)}
                className="btn-primary text-[11px]"
                style={{ padding: '8px 14px', fontSize: '11px' }}
              >
                {updating ? 'Uploading…' : 'Push Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Buyer post-delivery actions: Buy or Reject */}
      {myHeldCommitment && sellerDelivered && !isArchived && (
        <div className="border-t-2 border-[var(--ink)] p-4 bg-[var(--accent-yellow)] flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[var(--ink)]">
            Seller delivered. Commitment deducted from final price.
          </span>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleReject}
              disabled={rejecting}
              className="btn-destructive text-[12px] disabled:opacity-50"
              style={{ padding: '7px 14px', fontSize: '12px' }}
            >
              {rejecting ? 'Releasing…' : 'Reject'}
            </button>
            <a
              href={`/listing/${listingId}`}
              className="btn-primary text-[12px]"
              style={{ padding: '7px 14px', fontSize: '12px' }}
            >
              Buy
            </a>
          </div>
        </div>
      )}

      {/* Commitment input (buyer only, when no held commitment) */}
      {!isSeller && !isArchived && !myHeldCommitment && listing && (
        <div className="border-t-2 border-[var(--ink)] px-4 py-2 flex justify-end bg-[var(--bg-cream)]">
          <CommitmentRequest
            listingId={listingId}
            currentPrice={listing.price_usdc}
            onConfirmed={fetchMessages}
          />
        </div>
      )}

      {/* Message input */}
      {!isArchived && (
        <div className="border-t-2 border-[var(--ink)] bg-[var(--bg-cream)] p-3 sm:p-4">
          <div className="flex gap-2">
            {isSeller && (
              <button
                onClick={() => setShowUpdatePanel(!showUpdatePanel)}
                className={showUpdatePanel ? 'btn-primary text-[11px]' : 'btn-secondary text-[11px]'}
                style={{ padding: '8px 12px', fontSize: '11px', flexShrink: 0 }}
                title="Upload improved version"
              >
                Update
              </button>
            )}
            <form onSubmit={handleSend} className="flex-1 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message…"
                className="input-retro flex-1"
                style={{ padding: '8px 14px' }}
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="btn-primary text-[11px]"
                style={{ padding: '8px 16px', fontSize: '11px', flexShrink: 0 }}
              >
                {sending ? '…' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {isArchived && (
        <div className="border-t-2 border-[var(--ink)] bg-[var(--bg-cream-alt)] p-4 text-center">
          <span
            className="text-[12px] font-bold text-[var(--ink-soft)] uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Room archived — item sold.
          </span>
        </div>
      )}
    </div>
  );
}
