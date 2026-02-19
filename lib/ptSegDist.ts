import type { Point } from "./types"

export const ptSegDist = (params: { p: Point; a: Point; b: Point }): number => {
  const { p, a, b } = params
  const dx = b.x - a.x
  const dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  if (l2 < 1e-10) return Math.hypot(p.x - a.x, p.y - a.y)

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}
