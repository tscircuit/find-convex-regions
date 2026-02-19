import { hullIdx } from "./hullIdx"
import { ptSegDist } from "./ptSegDist"
import type { Point } from "./types"

export const concavityDepth = (ring: number[], pts: Point[]): number => {
  if (ring.length <= 3) return 0

  const hull = hullIdx(ring, pts)
  const hullSet = new Set(hull)
  const hullPoints = hull
    .map((i) => pts[i])
    .filter((pt): pt is Point => Boolean(pt))

  let maxDepth = 0
  for (const index of ring) {
    if (hullSet.has(index)) continue
    const p = pts[index]
    if (!p) continue

    let minDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < hullPoints.length; i++) {
      const a = hullPoints[i]
      const b = hullPoints[(i + 1) % hullPoints.length]
      if (!a || !b) continue
      minDistance = Math.min(minDistance, ptSegDist({ p, a, b }))
    }
    maxDepth = Math.max(maxDepth, minDistance)
  }

  return maxDepth
}
