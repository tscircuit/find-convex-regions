import type { Point, Rect } from "./types"

export const rotatePoint = (params: {
  localX: number
  localY: number
  rect: Rect
}): Point => {
  const { localX, localY, rect } = params
  const cosTheta = Math.cos(rect.ccwRotation)
  const sinTheta = Math.sin(rect.ccwRotation)

  return {
    x: rect.center.x + localX * cosTheta - localY * sinTheta,
    y: rect.center.y + localX * sinTheta + localY * cosTheta,
  }
}
