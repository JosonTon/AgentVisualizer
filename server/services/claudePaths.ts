import { homedir } from 'os';
import { join } from 'path';

export function getClaudeDataDir(): string {
  return join(homedir(), '.claude');
}

export function encodeRepoPath(repoPath: string): string {
  // Normalize to forward slashes
  const normalized = repoPath.replace(/\\/g, '/');
  // Match drive letter pattern like "D:/"
  const driveMatch = normalized.match(/^([A-Za-z]):\//);
  if (driveMatch) {
    const driveLetter = driveMatch[1].toUpperCase();
    const rest = normalized.slice(3); // skip "D:/"
    // Split by / then replace spaces and other special chars with -
    const segments = rest.split('/').filter(Boolean);
    return driveLetter + '--' + segments.map(s => s.replace(/\s+/g, '-')).join('-');
  }
  // Unix-style path: /home/user/project → -home-user-project
  const segments = normalized.split('/').filter(Boolean);
  return segments.map(s => s.replace(/\s+/g, '-')).join('-');
}

export function getProjectDir(repoPath: string): string {
  return join(getClaudeDataDir(), 'projects', encodeRepoPath(repoPath));
}

export function getSessionsDir(): string {
  return join(getClaudeDataDir(), 'sessions');
}
