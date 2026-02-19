import type { Point } from "./types"

type Circumcircle = {
  x: number
  y: number
  r2: number
}

export const circumcircle = (params: {
  a: Point
  b: Point
  c: Point
}): Circumcircle => {
  const { a, b, c } = params
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(d) < 1e-10) return { x: 0, y: 0, r2: 1e18 }

  const a2 = a.x * a.x + a.y * a.y
  const b2 = b.x * b.x + b.y * b.y
  const c2 = c.x * c.x + c.y * c.y
  const ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d
  const uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d

  return { x: ux, y: uy, r2: (a.x - ux) ** 2 + (a.y - uy) ** 2 }
}
