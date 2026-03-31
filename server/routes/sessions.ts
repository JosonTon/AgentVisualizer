import { Router } from 'express';
import { discoverSessions, getSessionEvents } from '../services/sessionDiscovery.js';

const router = Router();

router.get('/sessions', async (req, res) => {
  const repoPath = req.query.repoPath as string | undefined;
  if (!repoPath) {
    res.status(400).json({ error: 'repoPath query parameter is required' });
    return;
  }

  try {
    const sessions = await discoverSessions(repoPath);
    res.json(sessions);
  } catch {
    res.status(500).json({ error: 'Failed to discover sessions' });
  }
});

router.get('/sessions/:id/events', async (req, res) => {
  const repoPath = req.query.repoPath as string | undefined;
  if (!repoPath) {
    res.status(400).json({ error: 'repoPath query parameter is required' });
    return;
  }

  const sessionId = req.params.id;
  try {
    const events = await getSessionEvents(repoPath, sessionId);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to get session events' });
  }
});

export default router;
