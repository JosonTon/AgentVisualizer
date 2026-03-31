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
    const segments = rest.split('/').filter(Boolean);
    return driveLetter + '--' + segments.join('-');
  }
  // Unix-style path: /home/user/project → -home-user-project
  const segments = normalized.split('/').filter(Boolean);
  return segments.join('-');
}

export function getProjectDir(repoPath: string): string {
  return join(getClaudeDataDir(), 'projects', encodeRepoPath(repoPath));
}

export function getSessionsDir(): string {
  return join(getClaudeDataDir(), 'sessions');
}
