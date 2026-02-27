// @ts-nocheck
import { useMemo, useState } from "react"
import { ConvexRegionsSolver } from "../lib/ConvexRegionsSolver"
import { regionPath } from "../lib/regionPath"
import { rotatePoint } from "../lib/rotatePoint"
import type { Point, Rect, Via } from "../lib/types"

const REGION_FILL = "rgba(56,182,255,0.25)"
const REGION_STROKE = "rgb(56,182,255)"
const W = 500
const H = 500
const bounds = { minX: 0, maxX: W, minY: 0, maxY: H }

const getRectCorners = (rect: Rect, inflate = 0): Point[] => {
  const hw = rect.width / 2 + inflate
  const hh = rect.height / 2 + inflate
  return [
    rotatePoint({ localX: -hw, localY: -hh, rect }),
    rotatePoint({ localX: hw, localY: -hh, rect }),
    rotatePoint({ localX: hw, localY: hh, rect }),
    rotatePoint({ localX: -hw, localY: hh, rect }),
  ]
}

const polyPoints = (points: Point[]): string =>
  points.map((p) => `${p.x},${p.y}`).join(" ")

type Preset = {
  label: string
  description: string
  vias: Via[]
  rects: Rect[]
}

const presets: Preset[] = [
  {
    label: "Via overlaps rect",
    description: "A circular via overlapping a rectangular obstacle",
    vias: [{ center: { x: 230, y: 250 }, diameter: 60 }],
    rects: [
      {
        center: { x: 290, y: 250 },
        width: 80,
        height: 40,
        ccwRotation: 0,
      },
    ],
  },
  {
    label: "Via inside rect",
    description: "A small via fully contained within a large rect",
    vias: [{ center: { x: 250, y: 250 }, diameter: 30 }],
    rects: [
      {
        center: { x: 250, y: 250 },
        width: 120,
        height: 80,
        ccwRotation: 0,
      },
    ],
  },
  {
    label: "Rotated rects overlap",
    description: "Two rotated rects with crossing edges",
    vias: [],
    rects: [
      {
        center: { x: 240, y: 250 },
        width: 100,
        height: 40,
        ccwRotation: Math.PI / 6,
      },
      {
        center: { x: 280, y: 250 },
        width: 100,
        height: 40,
        ccwRotation: -Math.PI / 6,
      },
    ],
  },
  {
    label: "Cross pattern",
    description: "Two perpendicular rects forming a cross shape",
    vias: [],
    rects: [
      {
        center: { x: 250, y: 250 },
        width: 160,
        height: 40,
        ccwRotation: 0,
      },
      {
        center: { x: 250, y: 250 },
        width: 40,
        height: 160,
        ccwRotation: 0,
      },
    ],
  },
  {
    label: "Dense cluster",
    description: "Mixed vias and rects in a tight cluster",
    vias: [
      { center: { x: 230, y: 220 }, diameter: 50 },
      { center: { x: 280, y: 270 }, diameter: 40 },
    ],
    rects: [
      {
        center: { x: 260, y: 240 },
        width: 70,
        height: 30,
        ccwRotation: Math.PI / 8,
      },
      {
        center: { x: 240, y: 280 },
        width: 60,
        height: 25,
        ccwRotation: -Math.PI / 10,
      },
    ],
  },
]

export default function OverlappingMixedFixture() {
  const [presetIdx, setPresetIdx] = useState(0)
  const [cl, setCl] = useState(10)
  const [viaSegments, setViaSegments] = useState(8)
  const [showTris, setShowTris] = useState(false)
  const [showRegions, setShowRegions] = useState(true)
  const [showClearance, setShowClearance] = useState(true)

  const preset = presets[presetIdx]!
  const { vias, rects } = preset

  const computed = useMemo(() => {
    const t0 = performance.now()
    const solver = new ConvexRegionsSolver({
      bounds,
      vias,
      rects,
      clearance: cl,
      concavityTolerance: 0,
      useConstrainedDelaunay: true,
      usePolyanyaMerge: true,
      viaSegments,
    })
    solver.solve()
    const ms = performance.now() - t0
    const out = solver.getOutput() ?? {
      pts: [],
      validTris: [],
      regions: [],
      hulls: [],
      depths: [],
    }
    return { ...out, ms }
  }, [vias, rects, cl, viaSegments])

  const { pts, validTris, regions, ms } = computed

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

        {/* Render rects */}
        {rects.map((rect, i) => {
          const clOutline = getRectCorners(rect, cl)
          const body = getRectCorners(rect)
          return (
            <g key={`rect-${i}`}>
              {showClearance && (
                <polygon
                  points={polyPoints(clOutline)}
                  fill="rgba(255,60,60,0.06)"
                  stroke="rgba(255,100,100,0.3)"
                  strokeWidth={0.8}
                  strokeDasharray="3,2"
                />
              )}
              <polygon
                points={polyPoints(body)}
                fill="rgba(200,80,80,0.55)"
                stroke="#ff6b6b"
                strokeWidth={1.2}
              />
            </g>
          )
        })}

        {/* Render vias */}
        {vias.map((v, i) => (
          <g key={`v${i}`}>
            {showClearance && (
              <circle
                cx={v.center.x}
                cy={v.center.y}
                r={v.diameter / 2 + cl}
                fill="rgba(255,60,60,0.06)"
                stroke="rgba(255,100,100,0.3)"
                strokeWidth={0.8}
                strokeDasharray="3,2"
              />
            )}
            <circle
              cx={v.center.x}
              cy={v.center.y}
              r={v.diameter / 2}
              fill="rgba(200,80,80,0.6)"
              stroke="#ff6b6b"
              strokeWidth={1.2}
            />
          </g>
        ))}
      </svg>

      <div
        style={{
          width: 260,
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
          Overlapping Mixed
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
            Preset
          </div>
          {presets.map((p, i) => (
            <label
              key={p.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                cursor: "pointer",
                marginBottom: 4,
                color: i === presetIdx ? "#2563eb" : "#1d2430",
                fontWeight: i === presetIdx ? 600 : 400,
              }}
            >
              <input
                type="radio"
                name="preset"
                checked={i === presetIdx}
                onChange={() => setPresetIdx(i)}
              />
              {p.label}
            </label>
          ))}
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            {preset.description}
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
            Display
          </div>
          {[
            ["Convex regions", showRegions, setShowRegions],
            ["Triangulation", showTris, setShowTris],
            ["Clearance zones", showClearance, setShowClearance],
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
            Clearance: {cl}px
          </div>
          <input
            type="range"
            min={0}
            max={60}
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
            Via segments:{" "}
            <span style={{ color: "#38b6ff" }}>{viaSegments}</span>
          </div>
          <input
            type="range"
            min={4}
            max={32}
            step={2}
            value={viaSegments}
            onChange={(e) => setViaSegments(+e.target.value)}
            style={{ width: "100%" }}
          />
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
              Vias: <span style={{ color: "#ff6b6b" }}>{vias.length}</span>
              {" / "}
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
            <div>
              Time:{" "}
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  color: ms > 100 ? "#ff6b6b" : ms > 30 ? "#ffb84d" : "#4ecb82",
                }}
              >
                {ms < 1 ? `${(ms * 1000).toFixed(0)}us` : `${ms.toFixed(1)}ms`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
