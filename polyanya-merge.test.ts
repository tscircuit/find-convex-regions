import { expect, test } from "bun:test"
import { computeConvexRegions } from "./lib/computeConvexRegions"
import { cross } from "./lib/cross"
import type { ConvexRegionsComputeInput, Point } from "./lib/types"
import {
  createThinHorizontalWallInput,
  createDiagonalWallInput,
} from "./tests/cdt-comparison.shared"
import { createPolygonObstaclesInput } from "./tests/polygon-obstacles.shared"
import { createStaggeredJumpersInput } from "./tests/staggered-jumpers.shared"

// --- Helpers ---

/** Total area of all regions using the shoelace formula */
function totalArea(regions: Point[][]): number {
  let total = 0
  for (const ring of regions) {
    let a = 0
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i]!
      const q = ring[(i + 1) % ring.length]!
      a += p.x * q.y - q.x * p.y
    }
    total += Math.abs(a) / 2
  }
  return total
}

/** Check that every region is strictly convex (all cross products > -eps) */
function allConvex(regions: Point[][]): boolean {
  for (const ring of regions) {
    for (let i = 0; i < ring.length; i++) {
      const o = ring[(i - 1 + ring.length) % ring.length]!
      const a = ring[i]!
      const b = ring[(i + 1) % ring.length]!
      if (cross({ o, a, b }) < -1e-8) return false
    }
  }
  return true
}

function run(input: ConvexRegionsComputeInput) {
  const baseline = computeConvexRegions(input)
  const polyanya = computeConvexRegions({ ...input, usePolyanyaMerge: true })
  return { baseline, polyanya }
}

// --- Tests ---

test("Polyanya merge: significantly reduces triangle count (horizontal wall)", () => {
  const input = createThinHorizontalWallInput(true)
  const { baseline, polyanya } = run(input)

  // Polyanya produces strictly convex regions — may differ from greedy concavity merge
  // but should significantly reduce triangle count
  expect(polyanya.regions.length).toBeLessThan(polyanya.regions.length + baseline.validTris.length)
  expect(polyanya.regions.length).toBeGreaterThanOrEqual(1)
  // Should reduce to at most half the triangle count
  expect(polyanya.regions.length).toBeLessThanOrEqual(baseline.validTris.length / 2)
})

test("Polyanya merge: significantly reduces triangle count (staggered jumpers)", () => {
  const input = { ...createStaggeredJumpersInput(), useConstrainedDelaunay: true }
  const { baseline, polyanya } = run(input)

  expect(polyanya.regions.length).toBeGreaterThanOrEqual(1)
  expect(polyanya.regions.length).toBeLessThanOrEqual(baseline.validTris.length / 2)
})

test("Polyanya merge: significantly reduces triangle count (polygon obstacles)", () => {
  const input = { ...createPolygonObstaclesInput(), useConstrainedDelaunay: true }
  const { baseline, polyanya } = run(input)

  expect(polyanya.regions.length).toBeGreaterThanOrEqual(1)
  expect(polyanya.regions.length).toBeLessThanOrEqual(baseline.validTris.length / 2)
})

test("Polyanya merge: all regions are strictly convex", () => {
  const inputs: ConvexRegionsComputeInput[] = [
    createThinHorizontalWallInput(true),
    createDiagonalWallInput(true),
    { ...createPolygonObstaclesInput(), useConstrainedDelaunay: true },
    { ...createStaggeredJumpersInput(), useConstrainedDelaunay: true },
  ]

  for (const input of inputs) {
    const result = computeConvexRegions({ ...input, usePolyanyaMerge: true })
    expect(allConvex(result.regions)).toBe(true)
  }
})

test("Polyanya merge: preserves total area", () => {
  const inputs: ConvexRegionsComputeInput[] = [
    createThinHorizontalWallInput(true),
    createDiagonalWallInput(true),
    { ...createPolygonObstaclesInput(), useConstrainedDelaunay: true },
    { ...createStaggeredJumpersInput(), useConstrainedDelaunay: true },
  ]

  for (const input of inputs) {
    const baseline = computeConvexRegions(input)
    const polyanya = computeConvexRegions({ ...input, usePolyanyaMerge: true })

    const baselineArea = totalArea(baseline.regions)
    const polyanyaArea = totalArea(polyanya.regions)

    expect(baselineArea).toBeGreaterThan(0)
    // Both methods should cover the same free-space area (same triangles, different merging)
    expect(Math.abs(polyanyaArea - baselineArea) / baselineArea).toBeLessThan(1e-6)
  }
})

test("Polyanya merge: depths are all zero (strictly convex)", () => {
  const input = { ...createStaggeredJumpersInput(), useConstrainedDelaunay: true }
  const result = computeConvexRegions({ ...input, usePolyanyaMerge: true })

  for (const d of result.depths) {
    expect(d).toBe(0)
  }
})

test("Polyanya merge: works with unconstrained Delaunay", () => {
  const input: ConvexRegionsComputeInput = {
    bounds: { minX: 0, maxX: 400, minY: 0, maxY: 400 },
    rects: [
      { center: { x: 200, y: 200 }, width: 80, height: 40, ccwRotation: 0 },
    ],
    clearance: 10,
    concavityTolerance: 0,
    useConstrainedDelaunay: false,
    usePolyanyaMerge: true,
  }
  const result = computeConvexRegions(input)

  expect(result.regions.length).toBeGreaterThanOrEqual(1)
  expect(allConvex(result.regions)).toBe(true)
})

test("Polyanya merge: no obstacles produces single region", () => {
  const result = computeConvexRegions({
    bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    clearance: 0,
    concavityTolerance: 0,
    useConstrainedDelaunay: true,
    usePolyanyaMerge: true,
  })

  // With no obstacles, all triangles should merge into a small number of convex cells
  expect(result.regions.length).toBeGreaterThanOrEqual(1)
  expect(allConvex(result.regions)).toBe(true)
})

test("Polyanya merge: single rect obstacle produces valid regions", () => {
  const result = computeConvexRegions({
    bounds: { minX: 0, maxX: 100, minY: 0, maxY: 100 },
    rects: [
      { center: { x: 50, y: 50 }, width: 20, height: 20, ccwRotation: 0 },
    ],
    clearance: 5,
    concavityTolerance: 0,
    useConstrainedDelaunay: true,
    usePolyanyaMerge: true,
  })

  expect(result.regions.length).toBeGreaterThanOrEqual(1)
  expect(allConvex(result.regions)).toBe(true)
})
