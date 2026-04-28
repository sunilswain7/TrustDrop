import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Server } from 'http';

interface RoomClient {
  ws: WebSocket;
  userId: string;
  role: 'buyer' | 'seller';
}

interface RoomMessage {
  type: 'text' | 'preview_update' | 'price_update' | 'system';
  senderId?: string;
  senderRole?: string;
  content: string;
  previewUrl?: string;
  newPrice?: number;
  timestamp: string;
}

// Room ID → connected clients
const rooms = new Map<string, Set<RoomClient>>();

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: Server) {
  if (wss) return wss;

  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const roomId = url.searchParams.get('roomId');
    const userId = url.searchParams.get('userId');
    const role = url.searchParams.get('role') as 'buyer' | 'seller';

    if (!roomId || !userId || !role) {
      ws.close(1008, 'Missing roomId, userId, or role');
      return;
    }

    // Add client to room
    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }
    const client: RoomClient = { ws, userId, role };
    rooms.get(roomId)!.add(client);

    console.log(`[WS] ${role} ${userId} joined room ${roomId}`);

    // Send join notification
    broadcastToRoom(roomId, {
      type: 'system',
      content: `${role === 'seller' ? 'Seller' : 'Buyer'} joined the room`,
      timestamp: new Date().toISOString(),
    });

    ws.on('close', () => {
      rooms.get(roomId)?.delete(client);
      if (rooms.get(roomId)?.size === 0) {
        rooms.delete(roomId);
      }
      console.log(`[WS] ${role} ${userId} left room ${roomId}`);
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error in room ${roomId}:`, err.message);
    });
  });

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

export function broadcastToRoom(roomId: string, message: RoomMessage) {
  const clients = rooms.get(roomId);
  if (!clients) return;

  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

export function getRoomClients(roomId: string): number {
  return rooms.get(roomId)?.size || 0;
}
