import { inFreeSpace } from "./inFreeSpace"
import { isPointInOrNearPolygon } from "./isPointInOrNearPolygon"
import type { Bounds, Point, Polygon, Rect, Triangle, Via } from "./types"

export const filterTris = (params: {
  triangles: Triangle[]
  pts: Point[]
  bounds: Bounds
  vias: Via[]
  clearance: number
  rects: Rect[]
  polygons: Polygon[]
}): Triangle[] => {
  const { triangles, pts, bounds, vias, clearance, rects, polygons } = params
  return triangles.filter(([a, b, c]) => {
    const pa = pts[a]
    const pb = pts[b]
    const pc = pts[c]
    if (!pa || !pb || !pc) return false

    // Check centroid against all obstacles
    const cx = (pa.x + pb.x + pc.x) / 3
    const cy = (pa.y + pb.y + pc.y) / 3
    if (
      !inFreeSpace({
        px: cx,
        py: cy,
        bounds,
        vias,
        clearance,
        rects,
        polygons,
      })
    ) {
      return false
    }

    if (polygons.length > 0) {
      const pointsToCheck = [
        pa,
        pb,
        pc,
        { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
        { x: (pb.x + pc.x) / 2, y: (pb.y + pc.y) / 2 },
        { x: (pc.x + pa.x) / 2, y: (pc.y + pa.y) / 2 },
      ]

      for (const pt of pointsToCheck) {
        for (const polygon of polygons) {
          if (
            isPointInOrNearPolygon({
              px: pt.x,
              py: pt.y,
              polygonPoints: polygon.points,
              clearance,
            })
          ) {
            return false
          }
        }
      }
    }

    return true
  })
}
