import { createServer } from 'http';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { WebSocketServer } from 'ws';
import repoRouter from './routes/repo.js';
import sessionsRouter from './routes/sessions.js';
import historyRouter from './routes/history.js';
import { createBroadcaster } from './ws/eventBroadcaster.js';
import { startWatching, stopWatching } from './services/fileWatcher.js';
import { recordEvent } from './services/historyRecorder.js';
import type { WsMessage } from '../shared/types.js';

const PORT = 3888;
const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

// API routes
app.use('/api', repoRouter);
app.use('/api', sessionsRouter);
app.use('/api', historyRouter);

// In production, serve static files from dist/
if (process.env.NODE_ENV === 'production') {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

// Watch endpoint to start/stop watching a repo
app.post('/api/watch', (req, res) => {
  const { repoPath } = req.body as { repoPath?: string };
  if (!repoPath) {
    res.status(400).json({ error: 'repoPath is required' });
    return;
  }

  console.log('[Server] Starting watch for:', repoPath);
  let treeRefreshTimer: ReturnType<typeof setTimeout> | null = null;
  startWatching(repoPath, (event) => {
    console.log('[Server] Broadcasting event:', event.toolName, event.filePath?.slice(-40));
    broadcaster.broadcast({ type: 'agent_event', data: event } satisfies WsMessage);
    void recordEvent(repoPath, event);

    // Debounce tree refresh on write/create/edit operations
    if (['write', 'create', 'edit'].includes(event.operation)) {
      if (treeRefreshTimer) clearTimeout(treeRefreshTimer);
      treeRefreshTimer = setTimeout(() => {
        broadcaster.broadcast({ type: 'tree_changed', data: { repoPath } } as WsMessage);
        treeRefreshTimer = null;
      }, 2000);
    }
  });

  res.json({ status: 'watching', repoPath });
});

app.post('/api/watch/stop', (_req, res) => {
  stopWatching();
  res.json({ status: 'stopped' });
});

// HTTP + WebSocket server
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const broadcaster = createBroadcaster(wss);

server.listen(PORT, () => {
  console.log(`AgentVisualizer server running at http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  stopWatching();
  wss.close();
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopWatching();
  wss.close();
  server.close();
  process.exit(0);
});
