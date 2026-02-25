// @ts-nocheck
import { useMemo, useState } from "react"
import { constrainedDelaunay } from "../lib/constrainedDelaunay"
import { delaunay } from "../lib/delaunay"
import { filterTris } from "../lib/filterTris"
import { generateBoundaryPoints } from "../lib/generateBoundaryPoints"
import { generateBoundaryPointsWithEdges } from "../lib/generateBoundaryPointsWithEdges"
import { hullIdx } from "../lib/hullIdx"
import { mergeCells } from "../lib/mergeCells"
import { mergeCellsPolyanya } from "../lib/mergeCellsPolyanya"
import { regionPath } from "../lib/regionPath"
import type { Point, Rect } from "../lib/types"

const REGION_FILL = "rgba(56,182,255,0.25)"
const REGION_STROKE = "rgb(56,182,255)"

const getRectCorners = (rect: Rect, inflate = 0): Point[] => {
  const hw = rect.width / 2 + inflate
  const hh = rect.height / 2 + inflate
  const cos = Math.cos(rect.ccwRotation)
  const sin = Math.sin(rect.ccwRotation)
  const tw = (x: number, y: number): Point => ({
    x: rect.center.x + x * cos - y * sin,
    y: rect.center.y + x * sin + y * cos,
  })
  return [tw(-hw, -hh), tw(hw, -hh), tw(hw, hh), tw(-hw, hh)]
}

const polyPoints = (points: Point[]): string =>
  points.map((p) => `${p.x},${p.y}`).join(" ")

function generateRects(rows: number, columns: number, W: number, H: number): Rect[] {
  const xSpacing = (W - 80) / Math.max(columns - 1, 1)
  const ySpacing = (H - 80) / Math.max(rows - 1, 1)
  const originX = 40
  const originY = 40
  const baseWidth = Math.min(34, xSpacing * 0.45)
  const baseHeight = Math.min(18, ySpacing * 0.22)

  const rects: Rect[] = []
  for (let row = 0; row < rows; row++) {
    const rowOffset = row % 2 === 1 ? xSpacing / 2 : 0
    for (let col = 0; col < columns; col++) {
      rects.push({
        center: {
          x: originX + col * xSpacing + rowOffset,
          y: originY + row * ySpacing,
        },
        width: baseWidth * (0.7 + 0.6 * Math.abs(Math.sin(row * 3.7 + col * 2.1))),
        height: baseHeight * (0.7 + 0.6 * Math.abs(Math.cos(row * 1.3 + col * 4.9))),
        ccwRotation: ((row + col) % 2 === 0 ? 1 : -1) * (Math.PI / 12) *
          (0.5 + Math.abs(Math.sin(row * 2.3 + col * 1.7))),
      })
    }
  }
  return rects
}

function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`
  if (ms < 100) return `${ms.toFixed(1)}ms`
  return `${ms.toFixed(0)}ms`
}

export default function StaggeredRectsFixture() {
  const [rows, setRows] = useState(12)
  const [cols, setCols] = useState(12)
  const [cl, setCl] = useState(4)
  const [useCDT, setUseCDT] = useState(true)
  const [usePolyanyaMerge, setUsePolyanyaMerge] = useState(false)
  const [concavityTol, setConcavityTol] = useState(0)
  const [showTris, setShowTris] = useState(false)
  const [showRegions, setShowRegions] = useState(true)

  const W = Math.max(450, cols * 50)
  const H = Math.max(450, rows * 50)
  const bounds = useMemo(() => ({ minX: 0, maxX: W, minY: 0, maxY: H }), [W, H])

  const rects = useMemo(() => generateRects(rows, cols, W, H), [rows, cols, W, H])

  const computed = useMemo(() => {
    const isDefinedPoint = <T,>(v: T | undefined): v is T => v !== undefined

    // Phase 1: Generate points
    let t = performance.now()
    let pts: Point[]
    let validTris: [number, number, number][]

    if (useCDT) {
      const result = generateBoundaryPointsWithEdges({
        bounds, vias: [], clearance: cl, rects, polygons: [],
      })
      pts = result.pts
      const genMs = performance.now() - t

      // Phase 2: Triangulate
      t = performance.now()
      const cdtTris = constrainedDelaunay(pts, result.constraintEdges)
      validTris = result.hadCrossings
        ? filterTris({ triangles: cdtTris, pts, bounds, vias: [], clearance: cl, rects, polygons: [] })
        : cdtTris
      const triMs = performance.now() - t

      // Phase 3: Merge
      t = performance.now()
      const { cells, depths } = usePolyanyaMerge
        ? mergeCellsPolyanya({ triangles: validTris, pts })
        : mergeCells({ triangles: validTris, pts, concavityTolerance: concavityTol })
      const mergeMs = performance.now() - t

      // Phase 4: Build regions
      t = performance.now()
      const regions = cells.map((cell) => cell.map((i) => pts[i]).filter(isDefinedPoint))
      const hulls = cells.map((cell) => hullIdx(cell, pts).map((i) => pts[i]).filter(isDefinedPoint))
      const buildMs = performance.now() - t

      return { pts, validTris, regions, hulls, depths, genMs, triMs, mergeMs, buildMs, totalMs: genMs + triMs + mergeMs + buildMs }
    } else {
      pts = generateBoundaryPoints({
        bounds, vias: [], clearance: cl, rects, polygons: [],
      })
      const genMs = performance.now() - t

      t = performance.now()
      const allTris = delaunay(pts)
      validTris = filterTris({ triangles: allTris, pts, bounds, vias: [], clearance: cl, rects, polygons: [] })
      const triMs = performance.now() - t

      t = performance.now()
      const { cells, depths } = usePolyanyaMerge
        ? mergeCellsPolyanya({ triangles: validTris, pts })
        : mergeCells({ triangles: validTris, pts, concavityTolerance: concavityTol })
      const mergeMs = performance.now() - t

      t = performance.now()
      const regions = cells.map((cell) => cell.map((i) => pts[i]).filter(isDefinedPoint))
      const hulls = cells.map((cell) => hullIdx(cell, pts).map((i) => pts[i]).filter(isDefinedPoint))
      const buildMs = performance.now() - t

      return { pts, validTris, regions, hulls, depths, genMs, triMs, mergeMs, buildMs, totalMs: genMs + triMs + mergeMs + buildMs }
    }
  }, [bounds, rects, cl, concavityTol, useCDT, usePolyanyaMerge])

  const { pts, validTris, regions, genMs, triMs, mergeMs, buildMs, totalMs } = computed

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        background: "#f6f8fc",
        fontFamily: "system-ui, sans-serif",
        color: "#1d2430",
      }}
    >
      <svg
        viewBox={`-20 -20 ${W + 40} ${H + 40}`}
        style={{ flex: 1, minWidth: 0, background: "#ffffff" }}
      >
        <rect
          x={0}
          y={0}
          width={W}
          height={H}
          fill="none"
          stroke="#555"
          strokeWidth={1.5}
          strokeDasharray="6,3"
        />

        {showRegions &&
          regions.map((region, i) => (
            <path
              key={`r${i}`}
              d={regionPath(region)}
              fill={REGION_FILL}
              stroke={REGION_STROKE}
              strokeWidth={1.2}
            />
          ))}

        {showTris &&
          validTris.map(([a, b, c], i) => (
            <polygon
              key={`t${i}`}
              points={`${pts[a].x},${pts[a].y} ${pts[b].x},${pts[b].y} ${pts[c].x},${pts[c].y}`}
              fill="none"
              stroke="rgba(100,116,139,0.35)"
              strokeWidth={0.5}
            />
          ))}

        {rects.map((rect, i) => {
          const clOutline = getRectCorners(rect, cl)
          const body = getRectCorners(rect)
          return (
            <g key={`rect-${i}`}>
              <polygon
                points={polyPoints(clOutline)}
                fill="rgba(255,60,60,0.08)"
                stroke="rgba(255,100,100,0.3)"
                strokeWidth={0.8}
                strokeDasharray="3,2"
              />
              <polygon
                points={polyPoints(body)}
                fill="rgba(200,80,80,0.55)"
                stroke="#ff6b6b"
                strokeWidth={1.2}
              />
            </g>
          )
        })}
      </svg>

      <div
        style={{
          width: 270,
          padding: 16,
          borderLeft: "1px solid #d6dde8",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
          flexShrink: 0,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
          Staggered Rects
        </h3>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Display
          </div>
          {[
            ["Convex regions", showRegions, setShowRegions],
            ["Triangulation", showTris, setShowTris],
          ].map(([label, value, setter]) => (
            <label
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 5,
              }}
            >
              <input
                type="checkbox"
                checked={value}
                onChange={(e) => setter(e.target.checked)}
              />
              {label}
            </label>
          ))}
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Grid: {rows} x {cols} = {rects.length} rects
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, color: "#999", width: 36 }}>Rows</span>
            <input
              type="range"
              min={2}
              max={30}
              value={rows}
              onChange={(e) => setRows(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 12, width: 24, textAlign: "right" }}>{rows}</span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#999", width: 36 }}>Cols</span>
            <input
              type="range"
              min={2}
              max={30}
              value={cols}
              onChange={(e) => setCols(+e.target.value)}
              style={{ flex: 1 }}
            />
            <span style={{ fontSize: 12, width: 24, textAlign: "right" }}>{cols}</span>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Clearance: {cl}px
          </div>
          <input
            type="range"
            min={0}
            max={40}
            value={cl}
            onChange={(e) => setCl(+e.target.value)}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginBottom: 4,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Concavity Margin:{" "}
            <span style={{ color: concavityTol === 0 ? "#4ecb82" : "#ffb84d" }}>
              {concavityTol.toFixed(1)} px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={0.5}
            value={concavityTol}
            onChange={(e) => setConcavityTol(+e.target.value)}
            style={{ width: "100%" }}
          />
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            {concavityTol === 0
              ? "Strict convexity"
              : `Allows dents up to ${concavityTol.toFixed(1)}px`}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Algorithm
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={useCDT}
              onChange={(e) => setUseCDT(e.target.checked)}
            />
            Constrained Delaunay (CDT)
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              cursor: "pointer",
              marginBottom: 8,
            }}
          >
            <input
              type="checkbox"
              checked={usePolyanyaMerge}
              onChange={(e) => setUsePolyanyaMerge(e.target.checked)}
            />
            Polyanya merge (strictly convex)
          </label>
          <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
            {usePolyanyaMerge
              ? "Dead-end elimination + max-area priority queue. Ignores concavity slider."
              : useCDT
                ? "CDT enforces obstacle boundaries as edges."
                : "Unconstrained Bowyer-Watson with centroid filter."}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Stats
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <div>
              Rects: <span style={{ color: "#ff6b6b" }}>{rects.length}</span>
            </div>
            <div>
              Points: <span style={{ color: "#aaa" }}>{pts.length}</span>
            </div>
            <div>
              Triangles:{" "}
              <span style={{ color: "#aaa" }}>{validTris.length}</span>
            </div>
            <div>
              Regions:{" "}
              <span style={{ color: "#38b6ff" }}>{regions.length}</span>
            </div>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Timing
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            {[
              ["Point gen", genMs],
              [useCDT ? "CDT" : "Delaunay", triMs],
              [usePolyanyaMerge ? "Polyanya merge" : "Greedy merge", mergeMs],
              ["Build regions", buildMs],
            ].map(([label, ms]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#666" }}>{label}</span>
                <span style={{
                  fontVariantNumeric: "tabular-nums",
                  color: ms > 500 ? "#ff6b6b" : ms > 100 ? "#ffb84d" : "#4ecb82",
                }}>
                  {fmtMs(ms)}
                </span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #d6dde8", marginTop: 4, paddingTop: 4 }}>
              <span style={{ fontWeight: 600 }}>Total</span>
              <span style={{
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                color: totalMs > 500 ? "#ff6b6b" : totalMs > 100 ? "#ffb84d" : "#4ecb82",
              }}>
                {fmtMs(totalMs)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
