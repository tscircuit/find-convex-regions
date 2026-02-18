export type Point = {
  x: number
  y: number
}

export type Via = {
  center: Point
  diameter: number
}

export type Rect = {
  center: Point
  width: number
  height: number
  ccwRotation: number
}

export type Polygon = {
  points: Point[]
}

export type Bounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type Triangle = [number, number, number]

export type ConvexRegionsComputeInput = {
  bounds: Bounds
  vias?: Via[]
  rects?: Rect[]
  polygons?: Polygon[]
  clearance: number
  concavityTolerance: number
}

export type ConvexRegionsComputeResult = {
  pts: Point[]
  validTris: Triangle[]
  regions: Point[][]
  hulls: Point[][]
  depths: number[]
}

export type RegionPort = {
  x: number
  y: number
  region: number
}

export type GeneratePointsStageOutput = {
  pts: Point[]
}

export type TriangulateStageInput = GeneratePointsStageOutput & {
  bounds: Bounds
  vias?: Via[]
  rects?: Rect[]
  polygons?: Polygon[]
  clearance: number
}

export type TriangulateStageOutput = GeneratePointsStageOutput & {
  validTris: Triangle[]
}

export type MergeCellsStageInput = TriangulateStageOutput & {
  concavityTolerance: number
}

export type MergeCellsStageOutput = TriangulateStageOutput & {
  cells: number[][]
  depths: number[]
}
