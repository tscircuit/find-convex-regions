import { expect, test } from "bun:test"
import { splitRegionsOnChokePoints } from "./lib/splitRegionsOnChokePoints"
import type { Point } from "./lib/types"

const hourglass = (scale: number): Point[] => {
  const s = scale
  return [
    { x: 0 * s, y: 0 * s },
    { x: 10 * s, y: 0 * s },
    { x: 10 * s, y: 4 * s },
    { x: 6 * s, y: 4 * s },
    { x: 6 * s, y: 6 * s },
    { x: 10 * s, y: 6 * s },
    { x: 10 * s, y: 10 * s },
    { x: 0 * s, y: 10 * s },
    { x: 0 * s, y: 6 * s },
    { x: 4 * s, y: 6 * s },
    { x: 4 * s, y: 4 * s },
    { x: 0 * s, y: 4 * s },
  ]
}

test("splitRegionsOnChokePoints is conditional and scale invariant", () => {
  const region = hourglass(1)

  const off = splitRegionsOnChokePoints({
    regions: [region],
    depths: [0],
    config: {
      enabled: false,
      maxNarrowWidthRatio: 0.25,
      minLobeAreaRatio: 0.2,
    },
  })

  expect(off.regions).toHaveLength(1)

  const on = splitRegionsOnChokePoints({
    regions: [region],
    depths: [0],
    config: {
      enabled: true,
      maxNarrowWidthRatio: 0.25,
      minLobeAreaRatio: 0.2,
      maxRecursiveSplits: 2,
    },
  })

  expect(on.regions.length).toBeGreaterThan(1)

  const onScaled = splitRegionsOnChokePoints({
    regions: [hourglass(100)],
    depths: [0],
    config: {
      enabled: true,
      maxNarrowWidthRatio: 0.25,
      minLobeAreaRatio: 0.2,
      maxRecursiveSplits: 2,
    },
  })

  expect(onScaled.regions.length).toBe(on.regions.length)
})
