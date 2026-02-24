import { BaseSolver } from "@tscircuit/solver-utils"
import type { GraphicsObject } from "graphics-debug"
import { buildRegionsFromCells } from "./buildRegionsFromCells"
import { splitRegionsOnChokePoints } from "./splitRegionsOnChokePoints"
import type { ConvexRegionsComputeResult, MergeCellsStageOutput } from "./types"

export class BuildRegionsSolver extends BaseSolver {
  private readonly input: MergeCellsStageOutput
  private output: ConvexRegionsComputeResult | null = null

  constructor(input: MergeCellsStageOutput) {
    super()
    this.input = input
  }

  override _step(): void {
    const { regions } = buildRegionsFromCells(this.input)
    const split = splitRegionsOnChokePoints({
      regions,
      depths: this.input.depths,
      config: this.input.chokePointPrevention,
    })

    this.output = {
      pts: this.input.pts,
      validTris: this.input.validTris,
      regions: split.regions,
      hulls: split.hulls,
      depths: split.depths,
    }
    this.stats = { regions: split.regions.length }
    this.solved = true
  }

  override getConstructorParams(): [MergeCellsStageOutput] {
    return [this.input]
  }

  override getOutput(): ConvexRegionsComputeResult | null {
    return this.output
  }

  override visualize(): GraphicsObject {
    const output = this.output
    if (!output) {
      return { points: [], lines: [], rects: [], circles: [], texts: [] }
    }

    return {
      points: output.pts.map((pt) => ({ x: pt.x, y: pt.y, color: "#3b82f6" })),
      lines: output.regions.flatMap((region) =>
        region.flatMap((point, i) => {
          const next = region[(i + 1) % region.length]
          if (!next) return []
          return [{ points: [point, next], strokeColor: "#0f766e" }]
        }),
      ),
      rects: [],
      circles: [],
      texts: [
        {
          x: 4,
          y: 12,
          text: `regions: ${output.regions.length}`,
          color: "#1f2937",
        },
      ],
    }
  }
}
