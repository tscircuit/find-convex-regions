import { BasePipelineSolver, definePipelineStep } from "@tscircuit/solver-utils"
import type { GraphicsObject } from "graphics-debug"
import { BuildRegionsSolver } from "./BuildRegionsSolver"
import { GeneratePointsSolver } from "./GeneratePointsSolver"
import { MergeCellsSolver } from "./MergeCellsSolver"
import { TriangulateSolver } from "./TriangulateSolver"
import type {
  ConvexRegionsComputeInput,
  ConvexRegionsComputeResult,
  GeneratePointsStageOutput,
  MergeCellsStageOutput,
  TriangulateStageOutput,
} from "./types"

export class ConvexRegionsSolver extends BasePipelineSolver<ConvexRegionsComputeInput> {
  pipelineDef = [
    definePipelineStep("generatePoints", GeneratePointsSolver, (instance) => [
      instance.inputProblem,
    ]),
    definePipelineStep("triangulate", TriangulateSolver, (instance) => {
      const generated =
        instance.getStageOutput<GeneratePointsStageOutput>("generatePoints")
      if (!generated) throw new Error("generatePoints output missing")
      return [
        {
          pts: generated.pts,
          bounds: instance.inputProblem.bounds,
          vias: instance.inputProblem.vias,
          rects: instance.inputProblem.rects,
          polygons: instance.inputProblem.polygons,
          clearance: instance.inputProblem.clearance,
        },
      ]
    }),
    definePipelineStep("mergeCells", MergeCellsSolver, (instance) => {
      const triangulated =
        instance.getStageOutput<TriangulateStageOutput>("triangulate")
      if (!triangulated) throw new Error("triangulate output missing")
      return [
        {
          pts: triangulated.pts,
          validTris: triangulated.validTris,
          concavityTolerance: instance.inputProblem.concavityTolerance,
        },
      ]
    }),
    definePipelineStep("buildRegions", BuildRegionsSolver, (instance) => {
      const merged =
        instance.getStageOutput<MergeCellsStageOutput>("mergeCells")
      if (!merged) throw new Error("mergeCells output missing")
      return [merged]
    }),
  ]

  override getConstructorParams(): [ConvexRegionsComputeInput] {
    return [this.inputProblem]
  }

  override getOutput(): ConvexRegionsComputeResult | null {
    return (
      this.getStageOutput<ConvexRegionsComputeResult>("buildRegions") ?? null
    )
  }

  override visualize(): GraphicsObject {
    const result = this.getOutput()
    if (!result) {
      return { points: [], lines: [], rects: [], circles: [], texts: [] }
    }

    return {
      points: result.pts.map((pt) => ({
        x: pt.x,
        y: pt.y,
        color: "#38b6ff",
      })),
      lines: result.regions.flatMap((region) =>
        region.map((p, i) => {
          const next = region[(i + 1) % region.length] ?? p
          return {
            points: [
              { x: p.x, y: p.y },
              { x: next.x, y: next.y },
            ],
            strokeColor: "#4ecb82",
          }
        }),
      ),
      rects: [],
      circles: (this.inputProblem.vias ?? []).map((via) => ({
        center: { x: via.center.x, y: via.center.y },
        radius: via.diameter / 2,
        stroke: "#ff6b6b",
      })),
      texts: [
        {
          x: this.inputProblem.bounds.minX + 8,
          y: this.inputProblem.bounds.minY + 16,
          text: `regions=${result.regions.length}`,
          color: "#ffffff",
        },
      ],
    }
  }
}
