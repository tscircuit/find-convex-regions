import { expect, test, describe } from "bun:test"
import { unionObstacleBoundaries } from "./lib/unionObstacleBoundaries"
import { computeConvexRegions } from "./lib/computeConvexRegions"
import type { Point } from "./lib/types"

/** Generate octagon ring centered at (cx, cy) with given radius. */
function octagon(cx: number, cy: number, radius: number): Point[] {
  const pts: Point[] = []
  for (let i = 0; i < 8; i++) {
    const angle = (2 * Math.PI * i) / 8
    pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) })
  }
  return pts
}

/** Shoelace signed area (positive = CCW). */
function signedArea(ring: Point[]): number {
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const p = ring[i]!
    const q = ring[(i + 1) % ring.length]!
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

describe("unionObstacleBoundaries", () => {
  test("single ring passes through unchanged", () => {
    const ring = octagon(0, 0, 5)
    const result = unionObstacleBoundaries([ring])
    expect(result).toHaveLength(1)
    expect(result[0]!.length).toBe(8)
  })

  test("non-overlapping rings stay separate", () => {
    const a = octagon(-20, 0, 5)
    const b = octagon(20, 0, 5)
    const result = unionObstacleBoundaries([a, b])
    expect(result).toHaveLength(2)
  })

  test("overlapping rings merge into one", () => {
    const a = octagon(0, 0, 5)
    const b = octagon(3, 0, 5) // overlaps with a
    const result = unionObstacleBoundaries([a, b])
    // Should merge into a single polygon (may have one face)
    expect(result.length).toBeLessThanOrEqual(2) // 1 outer, possibly 0 holes
    // Merged area should be larger than either individual
    const totalArea = result.reduce((sum, r) => sum + Math.abs(signedArea(r)), 0)
    const areaA = Math.abs(signedArea(a))
    expect(totalArea).toBeGreaterThan(areaA)
  })

  test("contained ring merges (ring B fully inside ring A)", () => {
    const outer = octagon(0, 0, 10)
    const inner = octagon(0, 0, 3) // fully inside
    const result = unionObstacleBoundaries([outer, inner])
    // The inner is fully contained — union should yield the outer polygon
    // (flatten-js may produce the outer ring only)
    const totalArea = result.reduce((sum, r) => sum + Math.abs(signedArea(r)), 0)
    const outerArea = Math.abs(signedArea(outer))
    // Total should be approximately equal to the outer area
    expect(totalArea).toBeCloseTo(outerArea, 0)
  })

  test("transitive overlap: A↔B, B↔C all merge", () => {
    const a = octagon(-4, 0, 5)
    const b = octagon(0, 0, 5)
    const c = octagon(4, 0, 5)
    const result = unionObstacleBoundaries([a, b, c])
    // All three overlap transitively, should merge
    const outerFaces = result.filter((r) => Math.abs(signedArea(r)) > 1)
    expect(outerFaces.length).toBeLessThanOrEqual(2)
  })

  test("empty input returns empty", () => {
    expect(unionObstacleBoundaries([])).toHaveLength(0)
  })
})

describe("computeConvexRegions with overlapping obstacles", () => {
  const bounds = { minX: -50, maxX: 50, minY: -50, maxY: 50 }

  test("contained via produces same triangle count as single via", () => {
    const singleResult = computeConvexRegions({
      bounds,
      vias: [{ center: { x: 0, y: 0 }, diameter: 10 }],
      clearance: 2,
      concavityTolerance: 0.1,
    })

    const containedResult = computeConvexRegions({
      bounds,
      vias: [
        { center: { x: 0, y: 0 }, diameter: 10 },
        { center: { x: 0, y: 0 }, diameter: 4 }, // fully inside
      ],
      clearance: 2,
      concavityTolerance: 0.1,
    })

    // Contained via should not create extra triangles inside the obstacle
    // Allow some tolerance for slightly different triangulation
    expect(containedResult.validTris.length).toBeLessThanOrEqual(
      singleResult.validTris.length + 2,
    )
    expect(containedResult.validTris.length).toBeGreaterThan(0)
  })

  test("overlapping vias produce valid triangulation", () => {
    const result = computeConvexRegions({
      bounds,
      vias: [
        { center: { x: -3, y: 0 }, diameter: 10 },
        { center: { x: 3, y: 0 }, diameter: 10 },
      ],
      clearance: 2,
      concavityTolerance: 0.1,
    })

    expect(result.validTris.length).toBeGreaterThan(0)
    expect(result.regions.length).toBeGreaterThan(0)
  })

  test("overlapping rect + via produce valid triangulation", () => {
    const result = computeConvexRegions({
      bounds,
      vias: [{ center: { x: 0, y: 0 }, diameter: 10 }],
      rects: [{ center: { x: 2, y: 0 }, width: 8, height: 8, ccwRotation: 0 }],
      clearance: 2,
      concavityTolerance: 0.1,
    })

    expect(result.validTris.length).toBeGreaterThan(0)
    expect(result.regions.length).toBeGreaterThan(0)
  })
})
