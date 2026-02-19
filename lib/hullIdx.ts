import { cross } from "./cross"
import type { Point } from "./types"

type IndexedPoint = Point & { i: number }

export const hullIdx = (indices: number[], pts: Point[]): number[] => {
  const tagged: IndexedPoint[] = [...new Set(indices)]
    .map((i) => {
      const pt = pts[i]
      if (!pt) return null
      return { i, x: pt.x, y: pt.y }
    })
    .filter((value): value is IndexedPoint => value !== null)

  tagged.sort((a, b) => a.x - b.x || a.y - b.y)
  if (tagged.length <= 2) return tagged.map((v) => v.i)

  const lower: IndexedPoint[] = []
  const upper: IndexedPoint[] = []

  for (const p of tagged) {
    while (lower.length >= 2) {
      const prev2 = lower[lower.length - 2]
      const prev1 = lower[lower.length - 1]
      if (!prev2 || !prev1 || cross({ o: prev2, a: prev1, b: p }) > 1e-10) break
      lower.pop()
    }
    lower.push(p)
  }

  for (let k = tagged.length - 1; k >= 0; k--) {
    const p = tagged[k]
    if (!p) continue
    while (upper.length >= 2) {
      const prev2 = upper[upper.length - 2]
      const prev1 = upper[upper.length - 1]
      if (!prev2 || !prev1 || cross({ o: prev2, a: prev1, b: p }) > 1e-10) break
      upper.pop()
    }
    upper.push(p)
  }

  lower.pop()
  upper.pop()
  return lower.concat(upper).map((v) => v.i)
}
