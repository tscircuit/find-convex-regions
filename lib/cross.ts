import type { Point } from "./types"

export const cross = (params: { o: Point; a: Point; b: Point }): number => {
  const { o, a, b } = params
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}
