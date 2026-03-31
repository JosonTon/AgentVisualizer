// Hierarchical spectrum-based coloring
// Root bare files → gray
// First-level subdirectories evenly divide hue 0-360
// Sub-subdirectories further subdivide their parent's hue range
// Files inherit the start hue of their containing directory

const SATURATION = 55; // slightly muted
const LIGHTNESS = 62;

/** Convert HSL to hex string */
function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = s / 100;
  const ll = l / 100;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => {
    const k = (n + hh / 30) % 12;
    const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Gray color for root-level bare files */
export const ROOT_FILE_COLOR = '#8888a0';

/** Get color from a hue value using the project's saturation/lightness */
export function colorFromHue(hue: number): string {
  return hslToHex(hue, SATURATION, LIGHTNESS);
}

// Legacy exports kept for backward compat
export function resetFolderColors(): void {
  // no-op, spectrum is computed on the fly now
}

export function getFolderColor(_folderPath: string): string {
  return ROOT_FILE_COLOR;
}

export function getFileColor(_filename: string): string {
  return ROOT_FILE_COLOR;
}
