import type { FileNode } from '../../shared/types';
import { colorFromHue, ROOT_FILE_COLOR, resetFolderColors } from './fileTypeColors';

export interface BuildingData {
  filePath: string;
  fileName: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: string;
}

function totalSize(node: FileNode): number {
  if (node.type === 'file') return node.size ?? 1;
  return (node.children ?? []).reduce((sum, c) => sum + totalSize(c), 0) || 1;
}

interface Rect {
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Hue range for spectrum subdivision */
interface HueRange {
  start: number;
  end: number;
}

interface LayoutItem {
  node: FileNode;
  area: number;
  hueRange: HueRange; // pre-computed for directories, inherited for files
}

/**
 * Pre-compute hue ranges for a set of sibling items.
 * Directories evenly subdivide the parent's hue range.
 * Files inherit the parent hue range as-is.
 */
function assignHueRanges(
  items: { node: FileNode; area: number }[],
  parentHue: HueRange,
  isRoot: boolean,
): LayoutItem[] {
  const dirs = items.filter(i => i.node.type === 'directory');
  const dirCount = dirs.length;
  const parentSpan = parentHue.end - parentHue.start;

  let dirIdx = 0;
  return items.map(item => {
    if (item.node.type === 'directory') {
      const span = (isRoot ? 360 : parentSpan) / Math.max(1, dirCount);
      const base = isRoot ? 0 : parentHue.start;
      const range: HueRange = {
        start: base + dirIdx * span,
        end: base + (dirIdx + 1) * span,
      };
      dirIdx++;
      return { ...item, hueRange: range };
    }
    return { ...item, hueRange: parentHue };
  });
}

function squarify(
  items: { node: FileNode; area: number }[],
  rect: Rect,
  padding: number,
  result: BuildingData[],
  parentHue: HueRange,
  isRoot: boolean,
) {
  if (items.length === 0) return;

  // Pre-compute hue ranges for all items at this level
  const sorted = [...items].sort((a, b) => b.area - a.area);
  const withHues = assignHueRanges(sorted, parentHue, isRoot);
  layoutRow(withHues, rect, padding, result, isRoot);
}

function layoutRow(
  items: LayoutItem[],
  rect: Rect,
  padding: number,
  result: BuildingData[],
  isRoot: boolean,
) {
  if (items.length === 0) return;
  if (items.length === 1) {
    placeItem(items[0], rect, padding, result, isRoot);
    return;
  }

  const totalArea = items.reduce((s, i) => s + i.area, 0);
  const isHorizontal = rect.w >= rect.d;

  let row: LayoutItem[] = [];
  let remaining = [...items];
  let bestAspect = Infinity;

  for (let i = 0; i < items.length; i++) {
    const candidate = [...row, items[i]];
    const rowArea = candidate.reduce((s, c) => s + c.area, 0);

    const side = isHorizontal
      ? (rowArea / totalArea) * rect.w
      : (rowArea / totalArea) * rect.d;

    let worstAspect = 0;
    for (const c of candidate) {
      const otherSide = isHorizontal
        ? (c.area / rowArea) * rect.d
        : (c.area / rowArea) * rect.w;
      const aspect = side > 0 && otherSide > 0
        ? Math.max(side / otherSide, otherSide / side)
        : Infinity;
      worstAspect = Math.max(worstAspect, aspect);
    }

    if (worstAspect <= bestAspect) {
      bestAspect = worstAspect;
      row = candidate;
      remaining = items.slice(i + 1);
    } else {
      break;
    }
  }

  const rowArea = row.reduce((s, c) => s + c.area, 0);
  const rowFraction = totalArea > 0 ? rowArea / totalArea : 1;

  if (isHorizontal) {
    const rowWidth = rowFraction * rect.w;
    let zOffset = rect.z;
    for (const item of row) {
      const itemDepth = rowArea > 0 ? (item.area / rowArea) * rect.d : rect.d;
      placeItem(item, { x: rect.x, z: zOffset, w: rowWidth, d: itemDepth }, padding, result, isRoot);
      zOffset += itemDepth;
    }
    if (remaining.length > 0) {
      layoutRow(remaining, {
        x: rect.x + rowWidth,
        z: rect.z,
        w: rect.w - rowWidth,
        d: rect.d,
      }, padding, result, isRoot);
    }
  } else {
    const rowDepth = rowFraction * rect.d;
    let xOffset = rect.x;
    for (const item of row) {
      const itemWidth = rowArea > 0 ? (item.area / rowArea) * rect.w : rect.w;
      placeItem(item, { x: xOffset, z: rect.z, w: itemWidth, d: rowDepth }, padding, result, isRoot);
      xOffset += itemWidth;
    }
    if (remaining.length > 0) {
      layoutRow(remaining, {
        x: rect.x,
        z: rect.z + rowDepth,
        w: rect.w,
        d: rect.d - rowDepth,
      }, padding, result, isRoot);
    }
  }
}

function placeItem(
  item: LayoutItem,
  rect: Rect,
  padding: number,
  result: BuildingData[],
  isRoot: boolean,
) {
  const { node, hueRange } = item;
  const padded: Rect = {
    x: rect.x + padding,
    z: rect.z + padding,
    w: Math.max(0.1, rect.w - padding * 2),
    d: Math.max(0.1, rect.d - padding * 2),
  };

  if (node.type === 'file') {
    const size = node.size ?? 1;
    const height = Math.min(10, Math.max(0.2, size / 100));
    // Root bare files → gray, otherwise use the start hue of parent's range
    const color = isRoot ? ROOT_FILE_COLOR : colorFromHue(hueRange.start);
    result.push({
      filePath: node.path,
      fileName: node.name,
      x: padded.x + padded.w / 2,
      z: padded.z + padded.d / 2,
      width: padded.w,
      depth: padded.d,
      height,
      color,
    });
  } else {
    // Directory: recurse into children with this directory's hue range
    const children = node.children ?? [];
    if (children.length === 0) return;

    const childTotal = children.reduce((s, c) => s + totalSize(c), 0);
    const childItems = children.map(c => ({
      node: c,
      area: (totalSize(c) / childTotal) * padded.w * padded.d,
    }));
    // Children subdivide this directory's hue range
    squarify(childItems, padded, padding, result, hueRange, false);
  }
}

export function computeCityLayout(
  tree: FileNode,
  areaWidth = 40,
  areaDepth = 40,
): BuildingData[] {
  resetFolderColors();
  const result: BuildingData[] = [];
  const children = tree.children ?? [];
  if (children.length === 0) return result;

  const childTotal = children.reduce((s, c) => s + totalSize(c), 0);
  const items = children.map(c => ({
    node: c,
    area: (totalSize(c) / childTotal) * areaWidth * areaDepth,
  }));

  // Root level: full spectrum 0-360, isRoot=true
  squarify(
    items,
    { x: -areaWidth / 2, z: -areaDepth / 2, w: areaWidth, d: areaDepth },
    0.1,
    result,
    { start: 0, end: 360 },
    true,
  );

  return result;
}
