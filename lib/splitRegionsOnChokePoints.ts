import { concavityDepth } from "./concavityDepth"
import { dist2 } from "./dist2"
import { hullIdx } from "./hullIdx"
import { isDefined } from "./isDefined"
import { polyArea } from "./polyArea"
import type { ChokePointPreventionConfig, Point } from "./types"

type ChokeCandidate = {
  i: number
  j: number
  widthRatio: number
  balance: number
}

const EPS = 1e-10

const orient = (a: Point, b: Point, c: Point): number =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)

const onSegment = (a: Point, b: Point, p: Point): boolean =>
  Math.min(a.x, b.x) - EPS <= p.x &&
  p.x <= Math.max(a.x, b.x) + EPS &&
  Math.min(a.y, b.y) - EPS <= p.y &&
  p.y <= Math.max(a.y, b.y) + EPS

const segmentsIntersect = (a: Point, b: Point, c: Point, d: Point): boolean => {
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)

  if (Math.abs(o1) < EPS && onSegment(a, b, c)) return true
  if (Math.abs(o2) < EPS && onSegment(a, b, d)) return true
  if (Math.abs(o3) < EPS && onSegment(c, d, a)) return true
  if (Math.abs(o4) < EPS && onSegment(c, d, b)) return true

  return o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0
}

const pointInPolygon = (p: Point, ring: Point[]): boolean => {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]
    const b = ring[j]
    if (!a || !b) continue
    const crosses = a.y > p.y !== b.y > p.y
    if (!crosses) continue
    const xAtY = ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y + EPS) + a.x
    if (p.x < xAtY) inside = !inside
  }
  return inside
}

const splitByChord = (
  ring: Point[],
  i: number,
  j: number,
): [Point[], Point[]] | null => {
  if (ring.length < 4 || i === j) return null

  const walk = (start: number, end: number): Point[] => {
    const out: Point[] = []
    let cursor = start
    while (true) {
      const point = ring[cursor]
      if (point) out.push(point)
      if (cursor === end) break
      cursor = (cursor + 1) % ring.length
    }
    return out
  }

  const p1 = walk(i, j)
  const p2 = walk(j, i)
  if (p1.length < 3 || p2.length < 3) return null
  return [p1, p2]
}

const isChordInside = (ring: Point[], i: number, j: number): boolean => {
  const a = ring[i]
  const b = ring[j]
  if (!a || !b) return false

  for (let k = 0; k < ring.length; k++) {
    const c = ring[k]
    const d = ring[(k + 1) % ring.length]
    if (!c || !d) continue
    if (k === i || (k + 1) % ring.length === i) continue
    if (k === j || (k + 1) % ring.length === j) continue
    if (segmentsIntersect(a, b, c, d)) return false
  }

  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  return pointInPolygon(mid, ring)
}

const findBestChokeCandidate = (
  ring: Point[],
  config: Required<ChokePointPreventionConfig>,
): ChokeCandidate | null => {
  if (ring.length < 4) return null

  const totalArea = Math.max(polyArea(ring), EPS)
  const scale = Math.sqrt(totalArea)
  let best: ChokeCandidate | null = null

  for (let i = 0; i < ring.length; i++) {
    for (let j = i + 1; j < ring.length; j++) {
      const adjacent = j === i + 1 || (i === 0 && j === ring.length - 1)
      if (adjacent) continue
      if (!isChordInside(ring, i, j)) continue

      const split = splitByChord(ring, i, j)
      if (!split) continue
      const [left, right] = split
      const leftArea = polyArea(left)
      const rightArea = polyArea(right)
      if (leftArea <= EPS || rightArea <= EPS) continue

      const balance = Math.min(leftArea, rightArea) / (leftArea + rightArea)
      if (balance < config.minLobeAreaRatio) continue

      const pi = ring[i]
      const pj = ring[j]
      if (!pi || !pj) continue
      const widthRatio = Math.sqrt(dist2(pi, pj)) / scale
      if (widthRatio > config.maxNarrowWidthRatio) continue

      if (
        !best ||
        widthRatio < best.widthRatio ||
        (Math.abs(widthRatio - best.widthRatio) < EPS && balance > best.balance)
      ) {
        best = { i, j, widthRatio, balance }
      }
    }
  }

  return best
}

const getHull = (ring: Point[]): Point[] => {
  const hull = hullIdx(
    ring.map((_, i) => i),
    ring,
  )
  return hull.map((i) => ring[i]).filter(isDefined)
}

const toDepth = (ring: Point[]): number =>
  concavityDepth(
    ring.map((_, i) => i),
    ring,
  )

export const splitRegionsOnChokePoints = ({
  regions,
  depths,
  config,
}: {
  regions: Point[][]
  depths: number[]
  config?: ChokePointPreventionConfig
}): { regions: Point[][]; hulls: Point[][]; depths: number[] } => {
  if (!config?.enabled) {
    return { regions, hulls: regions.map(getHull), depths }
  }

  const normalized: Required<ChokePointPreventionConfig> = {
    enabled: true,
    maxNarrowWidthRatio: config.maxNarrowWidthRatio,
    minLobeAreaRatio: config.minLobeAreaRatio,
    maxRecursiveSplits: config.maxRecursiveSplits ?? 12,
  }

  const output: Point[][] = []

  for (const region of regions) {
    const queue = [region]
    let splitsLeft = normalized.maxRecursiveSplits

    while (queue.length > 0) {
      const current = queue.pop()
      if (!current) continue

      const candidate = findBestChokeCandidate(current, normalized)
      if (!candidate || splitsLeft <= 0) {
        output.push(current)
        continue
      }

      const split = splitByChord(current, candidate.i, candidate.j)
      if (!split) {
        output.push(current)
        continue
      }

      splitsLeft -= 1
      queue.push(split[0], split[1])
    }
  }

  return {
    regions: output,
    hulls: output.map(getHull),
    depths: output.map(toDepth),
  }
}
