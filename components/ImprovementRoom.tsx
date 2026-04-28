'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

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
}

interface ImprovementRoomProps {
  listingId: string;
  currentUserId: string;
  isSeller: boolean;
}

export default function ImprovementRoom({
  listingId,
  currentUserId,
  isSeller,
}: ImprovementRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [listing, setListing] = useState<ListingContext | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Seller update state
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

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${listingId}/messages`);
      const data = await res.json();
      setMessages(data.messages || []);
      setListing(data.listing || null);
    } catch {
      console.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Poll for new messages (fallback when WebSocket not available)
  useEffect(() => {
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const role = isSeller ? 'seller' : 'buyer';
    const wsUrl = `${protocol}//${window.location.host}/ws?roomId=${listingId}&userId=${currentUserId}&role=${role}`;

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        // Refresh messages on any incoming WS message
        fetchMessages();

        // Update listing context for price/preview changes
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

    return () => {
      ws?.close();
    };
  }, [listingId, currentUserId, isSeller, fetchMessages]);

  // Send text message
  async function handleSend(e: React.FormEvent) {
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

  // Seller: upload improved file + optional price change
  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!updateFile && !updatePrice) return;

    setUpdating(true);
    try {
      const formData = new FormData();
      if (updateFile) formData.append('file', updateFile);
      if (updatePreview) formData.append('preview', updatePreview);
      if (updatePrice) formData.append('price', updatePrice);

      const res = await fetch(`/api/room/${listingId}/update`, {
        method: 'POST',
        body: formData,
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

  return (
    <div className="flex flex-col h-full">
      {/* Room header */}
      <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">{listing?.title || 'Improvement Room'}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-emerald-400 font-medium">
              ${listing ? parseFloat(listing.price_usdc).toFixed(2) : '—'} USDC
            </span>
            {listing && (
              <span className="text-xs text-zinc-500">
                Preview v{listing.preview_version}
              </span>
            )}
            {isArchived && (
              <span className="text-xs bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded">
                Archived
              </span>
            )}
          </div>
        </div>

        {/* Preview thumbnail */}
        {listing?.preview_url && listing.preview_url !== 'pending' && (
          <img
            src={listing.preview_url}
            alt="Current preview"
            className="w-16 h-16 rounded-lg object-cover border border-zinc-700"
          />
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-zinc-600 py-8">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-600 py-8">
            <p>No messages yet.</p>
            <p className="text-sm mt-1">Start a conversation about this listing.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSystem = msg.message_type === 'system' || msg.message_type === 'preview_update' || msg.message_type === 'price_update';
            const isMe = msg.sender_id === currentUserId;

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                  {msg.preview_url && (
                    <img
                      src={msg.preview_url}
                      alt="Updated preview"
                      className="mx-auto mt-2 w-48 rounded-lg border border-zinc-700"
                    />
                  )}
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? 'bg-emerald-600 text-white rounded-br-sm'
                      : 'bg-zinc-800 text-zinc-200 rounded-bl-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-medium ${isMe ? 'text-emerald-200' : 'text-zinc-400'}`}>
                      {msg.sender_name || (msg.sender_role === 'seller' ? 'Seller' : 'Buyer')}
                    </span>
                    <span className={`text-xs ${isMe ? 'text-emerald-300/60' : 'text-zinc-600'}`}>
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
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
          <form onSubmit={handleUpdate} className="space-y-3">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 transition truncate"
              >
                {updateFile ? updateFile.name : 'Upload improved file'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setUpdateFile(e.target.files?.[0] || null)}
              />
              <button
                type="button"
                onClick={() => previewInputRef.current?.click()}
                className="text-sm bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-300 transition"
              >
                {updatePreview ? 'Screenshot added' : '+ Screenshot'}
              </button>
              <input
                ref={previewInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setUpdatePreview(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={updatePrice}
                  onChange={(e) => setUpdatePrice(e.target.value)}
                  placeholder={listing ? parseFloat(listing.price_usdc).toFixed(2) : 'New price'}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                disabled={updating || (!updateFile && !updatePrice)}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                {updating ? 'Updating...' : 'Push Update'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Message input */}
      {!isArchived && (
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            {isSeller && (
              <button
                onClick={() => setShowUpdatePanel(!showUpdatePanel)}
                className={`shrink-0 text-sm px-3 py-2 rounded-lg border transition ${
                  showUpdatePanel
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
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
                placeholder={isArchived ? 'Room archived' : 'Type a message...'}
                disabled={isArchived}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}

      {isArchived && (
        <div className="border-t border-zinc-800 p-4 text-center text-sm text-zinc-500">
          This room is archived. The item has been sold.
        </div>
      )}
    </div>
  );
}
