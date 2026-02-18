import { expect, test } from "bun:test"
import { ConvexRegionsSolver } from "./lib/ConvexRegionsSolver"
import { createPolygonObstaclesInput } from "./tests/polygon-obstacles.shared"

test("polygon obstacles", async () => {
  const solver = new ConvexRegionsSolver(createPolygonObstaclesInput())
  solver.solve()
  await expect(solver.visualize()).toMatchGraphicsSvg(import.meta.path)
})
