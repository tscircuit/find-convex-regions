import { circumcircle } from "./circumcircle"
import type { Point, Triangle } from "./types"

type IndexedPoint = Point & { i: number }

type TriangleNode = {
  a: IndexedPoint
  b: IndexedPoint
  c: IndexedPoint
  cc: { x: number; y: number; r2: number }
}

const hasEdge = (triangle: TriangleNode, p1: IndexedPoint, p2: IndexedPoint) =>
  [triangle.a, triangle.b, triangle.c].includes(p1) &&
  [triangle.a, triangle.b, triangle.c].includes(p2)

export const delaunay = (rawPoints: Point[]): Triangle[] => {
  const points: IndexedPoint[] = rawPoints.map((p, i) => ({ ...p, i }))
  if (points.length < 3) return []

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  const dimension = Math.max(maxX - minX, maxY - minY) || 1
  const midX = (minX + maxX) / 2
  const midY = (minY + maxY) / 2

  const s0: IndexedPoint = {
    x: midX - 30 * dimension,
    y: midY - dimension,
    i: -1,
  }
  const s1: IndexedPoint = { x: midX, y: midY + 30 * dimension, i: -2 }
  const s2: IndexedPoint = {
    x: midX + 30 * dimension,
    y: midY - dimension,
    i: -3,
  }

  let triangles: TriangleNode[] = [
    { a: s0, b: s1, c: s2, cc: circumcircle({ a: s0, b: s1, c: s2 }) },
  ]

  for (const p of points) {
    const bad = triangles.filter((triangle) => {
      const dx = p.x - triangle.cc.x
      const dy = p.y - triangle.cc.y
      return dx * dx + dy * dy < triangle.cc.r2 + 1e-6
    })

    const badSet = new Set(bad)
    const boundaryEdges: Array<[IndexedPoint, IndexedPoint]> = []

    for (const triangle of bad) {
      const triangleEdges: Array<[IndexedPoint, IndexedPoint]> = [
        [triangle.a, triangle.b],
        [triangle.b, triangle.c],
        [triangle.c, triangle.a],
      ]

      for (const [ea, eb] of triangleEdges) {
        let isShared = false
        for (const other of bad) {
          if (other === triangle) continue
          if (hasEdge(other, ea, eb)) {
            isShared = true
            break
          }
        }
        if (!isShared) boundaryEdges.push([ea, eb])
      }
    }

    triangles = triangles.filter((triangle) => !badSet.has(triangle))
    for (const [ea, eb] of boundaryEdges) {
      triangles.push({
        a: ea,
        b: eb,
        c: p,
        cc: circumcircle({ a: ea, b: eb, c: p }),
      })
    }
  }

  return triangles
    .filter(
      (triangle) => triangle.a.i >= 0 && triangle.b.i >= 0 && triangle.c.i >= 0,
    )
    .map((triangle) => [triangle.a.i, triangle.b.i, triangle.c.i])
}
