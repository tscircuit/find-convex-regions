import { expect, test } from "bun:test"
import { ConvexRegionsSolver } from "../lib/ConvexRegionsSolver"
import { computeConvexRegions } from "../lib/computeConvexRegions"
import type { ConvexRegionsComputeInput } from "../lib/types"
import input from "./assets/input-4-via-region.json"

test("via tile 4 regions", async () => {
  const solver = new ConvexRegionsSolver(input)
  solver.solve()

  await expect(solver.visualize()).toMatchGraphicsSvg(import.meta.path)
})
