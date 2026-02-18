import type { Bounds, Point, Polygon, Rect, Via } from "./types"

const rotatePoint = (localX: number, localY: number, rect: Rect): Point => {
  const cosTheta = Math.cos(rect.ccwRotation)
  const sinTheta = Math.sin(rect.ccwRotation)

  return {
    x: rect.center.x + localX * cosTheta - localY * sinTheta,
    y: rect.center.y + localX * sinTheta + localY * cosTheta,
  }
}

export const genPoints = (
  bounds: Bounds,
  vias: Via[],
  clearance: number,
  rects: Rect[],
  polygons: Polygon[] = [],
): Point[] => {
  const points: Point[] = []
  const { minX: x0, maxX: x1, minY: y0, maxY: y1 } = bounds

  points.push(
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  )

  const edgeSegments = 10
  for (let i = 1; i < edgeSegments; i++) {
    const t = i / edgeSegments
    points.push({ x: x0 + t * (x1 - x0), y: y0 })
    points.push({ x: x1, y: y0 + t * (y1 - y0) })
    points.push({ x: x1 - t * (x1 - x0), y: y1 })
    points.push({ x: x0, y: y1 - t * (y1 - y0) })
  }

  const viaSegments = 24
  for (const via of vias) {
    const radius = via.diameter / 2 + clearance
    for (let i = 0; i < viaSegments; i++) {
      const angle = (2 * Math.PI * i) / viaSegments
      points.push({
        x: via.center.x + radius * Math.cos(angle),
        y: via.center.y + radius * Math.sin(angle),
      })
    }
  }

  for (const rect of rects) {
    const halfWidth = rect.width / 2 + clearance
    const halfHeight = rect.height / 2 + clearance
    const edgeSegments = Math.max(
      2,
      Math.ceil(Math.max(halfWidth * 2, halfHeight * 2) / 20),
    )

    for (let i = 0; i < edgeSegments; i++) {
      const t = i / edgeSegments
      points.push(
        rotatePoint(-halfWidth + t * 2 * halfWidth, -halfHeight, rect),
      )
      points.push(
        rotatePoint(halfWidth, -halfHeight + t * 2 * halfHeight, rect),
      )
      points.push(rotatePoint(halfWidth - t * 2 * halfWidth, halfHeight, rect))
      points.push(
        rotatePoint(-halfWidth, halfHeight - t * 2 * halfHeight, rect),
      )
    }
  }

  for (const polygon of polygons) {
    const polyPoints = polygon.points
    const n = polyPoints.length
    if (n < 3) continue

    for (let i = 0; i < n; i++) {
      const p1 = polyPoints[i]!
      const p2 = polyPoints[(i + 1) % n]!

      // Calculate edge length to determine number of segments
      const edgeLength = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2)
      const edgeSegments = Math.max(2, Math.ceil(edgeLength / 20))

      // Calculate outward normal for the edge
      const dx = p2.x - p1.x
      const dy = p2.y - p1.y
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len === 0) continue

      // Outward normal (perpendicular to edge, pointing outward)
      // For CCW polygon, outward normal is (-dy, dx) / len
      // For CW polygon, it's (dy, -dx) / len
      // We'll use the convention that positive clearance expands outward
      const nx = -dy / len
      const ny = dx / len

      for (let j = 0; j < edgeSegments; j++) {
        const t = j / edgeSegments
        const baseX = p1.x + t * dx
        const baseY = p1.y + t * dy
        // Offset by clearance in the outward normal direction
        points.push({
          x: baseX + clearance * nx,
          y: baseY + clearance * ny,
        })
      }
    }
  }

  return points.map((point, i) => ({
    x: point.x + ((i % 7) - 3) * 1e-6,
    y: point.y + ((i % 5) - 2) * 1e-6,
  }))
}
