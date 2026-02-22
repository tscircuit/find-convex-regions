import { getOffsetPolygonPoints } from "./getOffsetPolygonPoints"
import { rotatePoint } from "./rotatePoint"
import type { Bounds, Point, Polygon, Rect, Via } from "./types"

export const generateBoundaryPoints = (params: {
  bounds: Bounds
  vias: Via[]
  clearance: number
  rects: Rect[]
  polygons?: Polygon[]
  viaSegments?: number
}): Point[] => {
  const {
    bounds,
    vias,
    clearance,
    rects,
    polygons = [],
    viaSegments = 24,
  } = params
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
    const rectEdgeSegments = Math.max(
      2,
      Math.ceil(Math.max(halfWidth * 2, halfHeight * 2) / 20),
    )

    for (let i = 0; i < rectEdgeSegments; i++) {
      const t = i / rectEdgeSegments
      points.push(
        rotatePoint({
          localX: -halfWidth + t * 2 * halfWidth,
          localY: -halfHeight,
          rect,
        }),
      )
      points.push(
        rotatePoint({
          localX: halfWidth,
          localY: -halfHeight + t * 2 * halfHeight,
          rect,
        }),
      )
      points.push(
        rotatePoint({
          localX: halfWidth - t * 2 * halfWidth,
          localY: halfHeight,
          rect,
        }),
      )
      points.push(
        rotatePoint({
          localX: -halfWidth,
          localY: halfHeight - t * 2 * halfHeight,
          rect,
        }),
      )
    }
  }

  for (const polygon of polygons) {
    if (polygon.points.length < 3) continue
    const offsetPoints = getOffsetPolygonPoints({ polygon, clearance })
    points.push(...offsetPoints)
  }

  return points.map((pt, i) => ({
    x: pt.x + ((i % 7) - 3) * 1e-6,
    y: pt.y + ((i % 5) - 2) * 1e-6,
  }))
}
