import { Router } from 'express';
import { readdir, stat, readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { FileNode } from '../../shared/types.js';

const router = Router();

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', '.cache', '__pycache__', '.venv']);

async function countLines(filePath: string): Promise<number> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
}

async function scanDirectory(dirPath: string, depth: number, maxDepth: number): Promise<FileNode> {
  const name = basename(dirPath);
  const node: FileNode = {
    name,
    path: dirPath.replace(/\\/g, '/'),
    type: 'directory',
    children: [],
  };

  if (depth >= maxDepth) return node;

  let entries: string[];
  try {
    entries = await readdir(dirPath);
  } catch {
    return node;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    if (entry.startsWith('.') && entry !== '.') continue;

    const fullPath = join(dirPath, entry);
    try {
      const stats = await stat(fullPath);
      if (stats.isDirectory()) {
        const child = await scanDirectory(fullPath, depth + 1, maxDepth);
        node.children!.push(child);
      } else if (stats.isFile()) {
        const lines = await countLines(fullPath);
        node.children!.push({
          name: entry,
          path: fullPath.replace(/\\/g, '/'),
          type: 'file',
          size: lines,
        });
      }
    } catch {
      // skip inaccessible entries
    }
  }

  return node;
}

router.get('/repo/tree', async (req, res) => {
  const repoPath = req.query.path as string | undefined;
  if (!repoPath) {
    res.status(400).json({ error: 'path query parameter is required' });
    return;
  }

  try {
    const tree = await scanDirectory(repoPath, 0, 5);
    res.json(tree);
  } catch {
    res.status(500).json({ error: 'Failed to scan directory' });
  }
});

export default router;
