import type { Bounds, ConvexRegionsComputeInput, Polygon } from "../lib/types"

export const POLYGON_OBSTACLES_BOUNDS: Bounds = {
  minX: 0,
  maxX: 400,
  minY: 0,
  maxY: 400,
}

/**
 * Creates a triangle polygon obstacle
 */
export const createTrianglePolygon = (
  centerX: number,
  centerY: number,
  size: number,
): Polygon => ({
  points: [
    { x: centerX, y: centerY - size },
    { x: centerX + size * 0.866, y: centerY + size * 0.5 },
    { x: centerX - size * 0.866, y: centerY + size * 0.5 },
  ],
})

/**
 * Creates a pentagon polygon obstacle
 */
export const createPentagonPolygon = (
  centerX: number,
  centerY: number,
  radius: number,
): Polygon => {
  const points = []
  for (let i = 0; i < 5; i++) {
    const angle = (2 * Math.PI * i) / 5 - Math.PI / 2
    points.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    })
  }
  return { points }
}

/**
 * Creates an L-shaped polygon obstacle
 */
export const createLShapedPolygon = (
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
): Polygon => ({
  points: [
    { x, y },
    { x: x + thickness, y },
    { x: x + thickness, y: y + height - thickness },
    { x: x + width, y: y + height - thickness },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ],
})

/**
 * Creates a star polygon obstacle
 */
export const createStarPolygon = (
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  points = 5,
): Polygon => {
  const vertices = []
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2
    const radius = i % 2 === 0 ? outerRadius : innerRadius
    vertices.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    })
  }
  return { points: vertices }
}

export const createPolygonObstaclesInput = (): ConvexRegionsComputeInput => ({
  bounds: POLYGON_OBSTACLES_BOUNDS,
  polygons: [
    // Triangle in upper left
    createTrianglePolygon(100, 100, 40),
    // Pentagon in upper right
    createPentagonPolygon(300, 100, 35),
    // L-shape in lower left
    createLShapedPolygon(50, 250, 80, 100, 25),
    // Star in lower right
    createStarPolygon(300, 300, 45, 20, 5),
  ],
  clearance: 8,
  concavityTolerance: 0,
})

export const createMixedObstaclesInput = (): ConvexRegionsComputeInput => ({
  bounds: POLYGON_OBSTACLES_BOUNDS,
  vias: [{ center: { x: 200, y: 200 }, diameter: 30 }],
  rects: [
    { center: { x: 200, y: 100 }, width: 50, height: 25, ccwRotation: 0 },
  ],
  polygons: [
    createTrianglePolygon(100, 300, 35),
    createPentagonPolygon(300, 300, 30),
  ],
  clearance: 8,
  concavityTolerance: 0,
})
