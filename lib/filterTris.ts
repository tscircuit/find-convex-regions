import { inFreeSpace } from "./inFreeSpace"
import type { Bounds, Point, Polygon, Rect, Triangle, Via } from "./types"

export const filterTris = (
  triangles: Triangle[],
  pts: Point[],
  bounds: Bounds,
  vias: Via[],
  clearance: number,
  rects: Rect[],
  polygons: Polygon[],
): Triangle[] =>
  triangles.filter(([a, b, c]) => {
    const pa = pts[a]
    const pb = pts[b]
    const pc = pts[c]
    if (!pa || !pb || !pc) return false

    const cx = (pa.x + pb.x + pc.x) / 3
    const cy = (pa.y + pb.y + pc.y) / 3
    return inFreeSpace(cx, cy, bounds, vias, clearance, rects, polygons)
  })
