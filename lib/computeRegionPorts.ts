import { dist2 } from "./dist2"
import type { Bounds, Point, RegionPort, Via } from "./types"

export const computeRegionPorts = (params: {
  regions: Point[][]
  bounds: Bounds
  vias: Via[]
  clearance: number
}): RegionPort[] => {
  const { regions, bounds, vias, clearance } = params
  const result: RegionPort[] = []

  for (let regionIndex = 0; regionIndex < regions.length; regionIndex++) {
    const region = regions[regionIndex]
    if (!region) continue

    for (let i = 0; i < region.length; i++) {
      const a = region[i]
      const b = region[(i + 1) % region.length]
      if (!a || !b) continue

      const mx = (a.x + b.x) / 2
      const my = (a.y + b.y) / 2
      const onBoundary =
        Math.abs(mx - bounds.minX) < 1 ||
        Math.abs(mx - bounds.maxX) < 1 ||
        Math.abs(my - bounds.minY) < 1 ||
        Math.abs(my - bounds.maxY) < 1

      const nearVia = vias.some(
        (via) =>
          dist2(via.center, { x: mx, y: my }) <
          (via.diameter / 2 + clearance + 2) ** 2,
      )

      if (!onBoundary || nearVia) {
        const segmentLength = Math.sqrt(dist2(a, b))
        const pointsOnSegment = Math.max(1, Math.floor(segmentLength / 40))

        for (let k = 0; k < pointsOnSegment; k++) {
          const t = (k + 1) / (pointsOnSegment + 1)
          result.push({
            x: a.x + t * (b.x - a.x),
            y: a.y + t * (b.y - a.y),
            region: regionIndex,
          })
        }
      }
    }
  }

  return result
}
