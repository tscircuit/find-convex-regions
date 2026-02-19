import { delaunay } from "./delaunay"
import { filterTris } from "./filterTris"
import { generateBoundaryPoints } from "./generateBoundaryPoints"
import { hullIdx } from "./hullIdx"
import { mergeCells } from "./mergeCells"
import type {
  ConvexRegionsComputeInput,
  ConvexRegionsComputeResult,
} from "./types"

const isDefinedPoint = <T>(value: T | undefined): value is T =>
  value !== undefined

export const computeConvexRegions = (
  input: ConvexRegionsComputeInput,
): ConvexRegionsComputeResult => {
  const { bounds, clearance, concavityTolerance } = input
  const vias = input.vias ?? []
  const rects = input.rects ?? []
  const polygons = input.polygons ?? []

  const pts = generateBoundaryPoints({
    bounds,
    vias,
    clearance,
    rects,
    polygons,
  })
  const allTriangles = delaunay(pts)
  const validTris = filterTris({
    triangles: allTriangles,
    pts,
    bounds,
    vias,
    clearance,
    rects,
    polygons,
  })
  const { cells, depths } = mergeCells({
    triangles: validTris,
    pts,
    concavityTolerance,
  })

  const regions = cells.map((cell) =>
    cell.map((i) => pts[i]).filter(isDefinedPoint),
  )
  const hulls = cells.map((cell) =>
    hullIdx(cell, pts)
      .map((i) => pts[i])
      .filter(isDefinedPoint),
  )

  return {
    pts,
    validTris,
    regions,
    hulls,
    depths,
  }
}
