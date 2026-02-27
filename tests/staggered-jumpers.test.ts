import { expect, test } from "bun:test"
import { ConvexRegionsSolver } from "../lib/ConvexRegionsSolver"
import { createStaggeredJumpersInput } from "./staggered-jumpers.shared"

test("staggered jumpers", async () => {
  const solver = new ConvexRegionsSolver(createStaggeredJumpersInput())
  solver.solve()
  await expect(solver.visualize()).toMatchGraphicsSvg(import.meta.path)
})
