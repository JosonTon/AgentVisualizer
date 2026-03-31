import { Router } from 'express';
import { readHistory } from '../services/historyRecorder.js';

const router = Router();

router.get('/history', async (req, res) => {
  const repoPath = req.query.repoPath as string | undefined;
  if (!repoPath) {
    res.status(400).json({ error: 'repoPath query parameter is required' });
    return;
  }

  try {
    const events = await readHistory(repoPath);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to read history' });
  }
});

export default router;
