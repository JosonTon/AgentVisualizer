import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import type { WsMessage } from '../../shared/types.js';

export function createBroadcaster(wss: WebSocketServer) {
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    ws.on('close', () => {
      clients.delete(ws);
    });
    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  function broadcast(msg: WsMessage): void {
    const data = JSON.stringify(msg);
    for (const client of clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(data);
      }
    }
  }

  return { broadcast };
}
