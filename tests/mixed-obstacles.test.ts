import { expect, test } from "bun:test"
import { ConvexRegionsSolver } from "../lib/ConvexRegionsSolver"
import { createMixedObstaclesInput } from "./polygon-obstacles.shared"

test("mixed obstacles (vias, rects, polygons)", async () => {
  const solver = new ConvexRegionsSolver(createMixedObstaclesInput())
  solver.solve()
  await expect(solver.visualize()).toMatchGraphicsSvg(import.meta.path)
})
