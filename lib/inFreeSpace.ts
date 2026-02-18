import type { Bounds, Point, Polygon, Rect, Via } from "./types"

/**
 * Check if a point is inside a polygon using ray casting algorithm.
 * Also checks if point is within clearance distance of any polygon edge.
 */
const isPointInOrNearPolygon = (
  px: number,
  py: number,
  polygon: Point[],
  clearance: number,
): boolean => {
  const n = polygon.length
  if (n < 3) return false

  // First check if point is inside the polygon using ray casting
  let inside = false
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = polygon[i]!
    const pj = polygon[j]!
    if (
      pi.y > py !== pj.y > py &&
      px < ((pj.x - pi.x) * (py - pi.y)) / (pj.y - pi.y) + pi.x
    ) {
      inside = !inside
    }
  }
  if (inside) return true

  // Check if point is within clearance distance of any edge
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i]!
    const p2 = polygon[(i + 1) % n]!

    // Calculate distance from point to line segment
    const dx = p2.x - p1.x
    const dy = p2.y - p1.y
    const lengthSq = dx * dx + dy * dy

    if (lengthSq === 0) {
      // p1 and p2 are the same point
      const dist = Math.sqrt((px - p1.x) ** 2 + (py - p1.y) ** 2)
      if (dist < clearance - 0.1) return true
      continue
    }

    // Project point onto line segment
    const t = Math.max(
      0,
      Math.min(1, ((px - p1.x) * dx + (py - p1.y) * dy) / lengthSq),
    )
    const projX = p1.x + t * dx
    const projY = p1.y + t * dy
    const dist = Math.sqrt((px - projX) ** 2 + (py - projY) ** 2)

    if (dist < clearance - 0.1) return true
  }

  return false
}

export const inFreeSpace = (
  px: number,
  py: number,
  bounds: Bounds,
  vias: Via[],
  clearance: number,
  rects: Rect[],
  polygons: Polygon[],
): boolean => {
  const { minX, maxX, minY, maxY } = bounds
  if (
    px < minX - 0.1 ||
    px > maxX + 0.1 ||
    py < minY - 0.1 ||
    py > maxY + 0.1
  ) {
    return false
  }

  for (const via of vias) {
    const radius = via.diameter / 2 + clearance
    if (
      (px - via.center.x) ** 2 + (py - via.center.y) ** 2 <
      radius * radius - 0.1
    ) {
      return false
    }
  }

  for (const rect of rects) {
    const halfWidth = rect.width / 2 + clearance
    const halfHeight = rect.height / 2 + clearance
    const dx = px - rect.center.x
    const dy = py - rect.center.y
    const cosTheta = Math.cos(rect.ccwRotation)
    const sinTheta = Math.sin(rect.ccwRotation)
    const localX = dx * cosTheta + dy * sinTheta
    const localY = -dx * sinTheta + dy * cosTheta

    if (
      Math.abs(localX) < halfWidth - 0.1 &&
      Math.abs(localY) < halfHeight - 0.1
    ) {
      return false
    }
  }

  for (const polygon of polygons) {
    if (isPointInOrNearPolygon(px, py, polygon.points, clearance)) {
      return false
    }
  }

  return true
}
