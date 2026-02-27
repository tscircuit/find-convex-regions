import {
  BooleanOperations,
  Polygon as FlattenPolygon,
  point,
} from "@flatten-js/core"
import type { Point } from "./types"

/**
 * Bounding-box overlap check (with small epsilon tolerance).
 */
const bboxOverlap = (a: Point[], b: Point[]): boolean => {
  let aMinX = Infinity
  let aMaxX = -Infinity
  let aMinY = Infinity
  let aMaxY = -Infinity
  for (const p of a) {
    if (p.x < aMinX) aMinX = p.x
    if (p.x > aMaxX) aMaxX = p.x
    if (p.y < aMinY) aMinY = p.y
    if (p.y > aMaxY) aMaxY = p.y
  }
  let bMinX = Infinity
  let bMaxX = -Infinity
  let bMinY = Infinity
  let bMaxY = -Infinity
  for (const p of b) {
    if (p.x < bMinX) bMinX = p.x
    if (p.x > bMaxX) bMaxX = p.x
    if (p.y < bMinY) bMinY = p.y
    if (p.y > bMaxY) bMaxY = p.y
  }
  const eps = 1e-6
  return (
    aMinX <= bMaxX + eps &&
    aMaxX >= bMinX - eps &&
    aMinY <= bMaxY + eps &&
    aMaxY >= bMinY - eps
  )
}

/**
 * Convert a ring of Points to a flatten-js Polygon.
 */
const ringToFlattenPoly = (ring: Point[]): FlattenPolygon => {
  return new FlattenPolygon(ring.map((p) => point(p.x, p.y)))
}

/**
 * Extract all face rings from a flatten-js Polygon as Point[][].
 */
const extractFaces = (poly: FlattenPolygon): Point[][] => {
  const result: Point[][] = []
  for (const face of poly.faces) {
    const ring: Point[] = []
    for (const v of face.vertices) {
      ring.push({ x: v.x, y: v.y })
    }
    if (ring.length >= 3) {
      result.push(ring)
    }
  }
  return result
}

/**
 * Union overlapping obstacle boundary rings.
 *
 * Takes an array of closed rings (Point[][]) representing obstacle boundaries,
 * and merges any that overlap using flatten-js boolean unify.
 * Returns an array of merged rings (may include holes as separate rings).
 *
 * Falls back to original rings if flatten-js throws.
 */
export const unionObstacleBoundaries = (rings: Point[][]): Point[][] => {
  if (rings.length <= 1) return rings

  try {
    // Convert to flatten-js polygons
    let polys: FlattenPolygon[] = rings.map(ringToFlattenPoly)

    // Iterative merge: keep merging overlapping polygons until stable.
    // Two passes catch transitive overlaps (A↔B, B↔C → A∪B∪C).
    for (let pass = 0; pass < 2; pass++) {
      const merged: FlattenPolygon[] = []
      const used = new Set<number>()

      for (let i = 0; i < polys.length; i++) {
        if (used.has(i)) continue
        let current = polys[i]!

        for (let j = i + 1; j < polys.length; j++) {
          if (used.has(j)) continue

          // Quick bbox pre-check using flatten-js box
          const boxA = current.box
          const boxB = polys[j]!.box
          if (
            boxA.xmin > boxB.xmax + 1e-6 ||
            boxA.xmax < boxB.xmin - 1e-6 ||
            boxA.ymin > boxB.ymax + 1e-6 ||
            boxA.ymax < boxB.ymin - 1e-6
          ) {
            continue
          }

          try {
            const unified = BooleanOperations.unify(current, polys[j]!)
            // Only accept the union if it produced a valid polygon
            if (unified.faces.size > 0) {
              current = unified
              used.add(j)
            }
          } catch {
            // If unify fails for this pair, skip and keep both separate
          }
        }

        merged.push(current)
        used.add(i)
      }

      polys = merged
    }

    // Extract all face rings from the merged polygons
    const result: Point[][] = []
    for (const poly of polys) {
      const faces = extractFaces(poly)
      result.push(...faces)
    }

    return result.length > 0 ? result : rings
  } catch {
    // Fallback: return original rings if anything goes wrong
    return rings
  }
}
