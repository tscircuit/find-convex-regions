// @ts-nocheck
import { useMemo, useState } from "react"
import { ConvexRegionsSolver } from "../lib/ConvexRegionsSolver"
import { regionPath } from "../lib/regionPath"
import { createStaggeredJumpersVias } from "../tests/staggered-jumpers.shared"

const REGION_FILL = "rgba(56,182,255,0.25)"
const REGION_STROKE = "rgb(56,182,255)"
const W = 450
const H = 450
const bounds = { minX: 0, maxX: W, minY: 0, maxY: H }

export default function StaggeredViasFixture() {
  const [cl, setCl] = useState(8)
  const [useCDT, setUseCDT] = useState(false)
  const [viaSegments, setViaSegments] = useState(undefined)
  const [concavityTol, setConcavityTol] = useState(0)
  const [showTris, setShowTris] = useState(false)
  const [showRegions, setShowRegions] = useState(true)

  const vias = useMemo(() => createStaggeredJumpersVias(), [])

  const { pts, validTris, regions } = useMemo(() => {
    const solver = new ConvexRegionsSolver({
      bounds,
      vias,
      clearance: cl,
      concavityTolerance: concavityTol,
      useConstrainedDelaunay: useCDT,
      viaSegments,
    })
    solver.solve()
    return (
      solver.getOutput() ?? {
        pts: [],
        validTris: [],
        regions: [],
        hulls: [],
        depths: [],
      }
    )
  }, [vias, cl, concavityTol, useCDT, viaSegments])

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

        {vias.map((v, i) => (
          <g key={`v${i}`}>
            <circle
              cx={v.center.x}
              cy={v.center.y}
              r={v.diameter / 2 + cl}
              fill="rgba(255,60,60,0.08)"
              stroke="rgba(255,100,100,0.3)"
              strokeWidth={0.8}
              strokeDasharray="3,2"
            />
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
          width: 250,
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
          Staggered Vias
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
            Triangulation
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
            <span style={{ color: "#38b6ff" }}>
              {viaSegments ?? (useCDT ? 8 : 24)}
            </span>
            {viaSegments === undefined && (
              <span style={{ color: "#666" }}> (default)</span>
            )}
          </div>
          <input
            type="range"
            min={4}
            max={32}
            step={2}
            value={viaSegments ?? (useCDT ? 8 : 24)}
            onChange={(e) => {
              const v = +e.target.value
              const d = useCDT ? 8 : 24
              setViaSegments(v === d ? undefined : v)
            }}
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
      </div>
    </div>
  )
}
