import type {
  Bounds,
  ConvexRegionsComputeInput,
  Point,
  Triangle,
} from "../lib/types"

export const CDT_BOUNDS: Bounds = {
  minX: 0,
  maxX: 400,
  minY: 0,
  maxY: 400,
}

/**
 * Thin horizontal wall: 350px wide, 2px tall, centered at y=200.
 */
export const createThinHorizontalWallInput = (
  useConstrainedDelaunay: boolean,
): ConvexRegionsComputeInput => ({
  bounds: CDT_BOUNDS,
  polygons: [
    {
      points: [
        { x: 25, y: 199 },
        { x: 375, y: 199 },
        { x: 375, y: 201 },
        { x: 25, y: 201 },
      ],
    },
  ],
  clearance: 2,
  concavityTolerance: 0,
  useConstrainedDelaunay,
})

/**
 * Thin diagonal wall from near (50,50) to near (350,350), 4px thick.
 */
export const createDiagonalWallInput = (
  useConstrainedDelaunay: boolean,
): ConvexRegionsComputeInput => {
  const hw = 2
  const dx = -hw / Math.SQRT2
  const dy = hw / Math.SQRT2

  return {
    bounds: CDT_BOUNDS,
    polygons: [
      {
        points: [
          { x: 50 + dx, y: 50 + dy },
          { x: 350 + dx, y: 350 + dy },
          { x: 350 - dx, y: 350 - dy },
          { x: 50 - dx, y: 50 - dy },
        ],
      },
    ],
    clearance: 2,
    concavityTolerance: 0,
    useConstrainedDelaunay,
  }
}

/**
 * Sparse boundary samples around a thin horizontal wall at y=200.
 * Points along the top and bottom of the wall's clearance boundary,
 * plus bounds corners. With low point density, unconstrained Delaunay
 * creates many edges that bridge across the wall.
 */
export const createSparseHorizontalWallPoints = (): {
  pts: Point[]
  constraintEdges: [number, number][]
  wallPoints: Point[]
} => {
  const wallY = 200
  const pts: Point[] = [
    // 0-3: Bounds corners (closed ring)
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 400 },
    { x: 0, y: 400 },
    // 4-8: Wall top edge (clearance boundary above)
    { x: 25, y: wallY - 3 },
    { x: 125, y: wallY - 3 },
    { x: 225, y: wallY - 3 },
    { x: 325, y: wallY - 3 },
    { x: 375, y: wallY - 3 },
    // 9-13: Wall bottom edge (clearance boundary below), reversed for closed ring
    { x: 375, y: wallY + 3 },
    { x: 325, y: wallY + 3 },
    { x: 225, y: wallY + 3 },
    { x: 125, y: wallY + 3 },
    { x: 25, y: wallY + 3 },
  ]

  const constraintEdges: [number, number][] = [
    // Bounds ring
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    // Wall ring (top left → top right → bottom right → bottom left → close)
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 12],
    [12, 13],
    [13, 4],
  ]

  const wallPoints: Point[] = [
    { x: 25, y: wallY - 1 },
    { x: 375, y: wallY - 1 },
    { x: 375, y: wallY + 1 },
    { x: 25, y: wallY + 1 },
  ]

  return { pts, constraintEdges, wallPoints }
}

/**
 * Sparse boundary samples around a thin diagonal wall from (50,50) to (350,350).
 * Points along both sides of the wall's clearance boundary, plus bounds corners.
 */
export const createSparseDiagonalWallPoints = (): {
  pts: Point[]
  constraintEdges: [number, number][]
  wallPoints: Point[]
} => {
  const hw = 2
  const dx = -hw / Math.SQRT2
  const dy = hw / Math.SQRT2
  const offset = 4
  const ndx = -offset / Math.SQRT2
  const ndy = offset / Math.SQRT2

  const wallPoints: Point[] = [
    { x: 50 + dx, y: 50 + dy },
    { x: 350 + dx, y: 350 + dy },
    { x: 350 - dx, y: 350 - dy },
    { x: 50 - dx, y: 50 - dy },
  ]

  const pts: Point[] = [
    // 0-3: Bounds corners
    { x: 0, y: 0 },
    { x: 400, y: 0 },
    { x: 400, y: 400 },
    { x: 0, y: 400 },
    // 4-7: Wall upper-left side (above wall)
    { x: 50 + ndx + dx, y: 50 + ndy + dy },
    { x: 150 + ndx + dx, y: 150 + ndy + dy },
    { x: 250 + ndx + dx, y: 250 + ndy + dy },
    { x: 350 + ndx + dx, y: 350 + ndy + dy },
    // 8-11: Wall lower-right side (below wall), reversed for closed ring
    { x: 350 - ndx - dx, y: 350 - ndy - dy },
    { x: 250 - ndx - dx, y: 250 - ndy - dy },
    { x: 150 - ndx - dx, y: 150 - ndy - dy },
    { x: 50 - ndx - dx, y: 50 - ndy - dy },
  ]

  const constraintEdges: [number, number][] = [
    // Bounds ring
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    // Wall ring
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 8],
    [8, 9],
    [9, 10],
    [10, 11],
    [11, 4],
  ]

  return { pts, constraintEdges, wallPoints }
}

/**
 * Check whether a line segment (p1->p2) crosses through a wall zone.
 */
const segmentsIntersect = (
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): boolean => {
  const d1x = a2.x - a1.x
  const d1y = a2.y - a1.y
  const d2x = b2.x - b1.x
  const d2y = b2.y - b1.y

  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return false

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / denom

  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99
}

/**
 * Returns the number of triangle edges that cross through any edge
 * of the given wall polygon.
 */
export const countEdgeCrossings = (
  pts: Point[],
  tris: Triangle[],
  wallPoints: Point[],
): number => {
  let crossings = 0
  const n = wallPoints.length

  for (const [a, b, c] of tris) {
    const pa = pts[a]!
    const pb = pts[b]!
    const pc = pts[c]!

    const edges: [Point, Point][] = [
      [pa, pb],
      [pb, pc],
      [pc, pa],
    ]

    for (const [e1, e2] of edges) {
      for (let i = 0; i < n; i++) {
        const w1 = wallPoints[i]!
        const w2 = wallPoints[(i + 1) % n]!
        if (segmentsIntersect(e1, e2, w1, w2)) {
          crossings++
          break
        }
      }
    }
  }

  return crossings
}
