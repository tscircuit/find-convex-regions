// @ts-nocheck
import { useCallback, useMemo, useRef, useState } from "react"
import { ConvexRegionsSolver } from "../lib/ConvexRegionsSolver"
import { computeRegionPorts } from "../lib/computeRegionPorts"
import { DEMO_CONSTANTS } from "../lib/demoConstants"
import { polyArea } from "../lib/polyArea"
import { regionPath } from "../lib/regionPath"

const { INIT_VIAS, PALETTE_FILL, PALETTE_STROKE } = DEMO_CONSTANTS

export default function App() {
  const W = 450
  const H = 450
  const bounds = { minX: 0, maxX: W, minY: 0, maxY: H }

  const [vias, setVias] = useState(INIT_VIAS)
  const [cl, setCl] = useState(8)
  const [concavityTol, setConcavityTol] = useState(0)
  const [showTris, setShowTris] = useState(false)
  const [showRegions, setShowRegions] = useState(true)
  const [showHull, setShowHull] = useState(false)
  const [showPorts, setShowPorts] = useState(true)
  const [useCDT, setUseCDT] = useState(true)
  const [viaSegments, setViaSegments] = useState<number | undefined>(undefined)
  const [dragIdx, setDragIdx] = useState(null)
  const [hoverRegion, setHoverRegion] = useState(null)
  const svgRef = useRef(null)

  const { pts, validTris, regions, hulls, depths } = useMemo(() => {
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
  }, [bounds, vias, cl, concavityTol, useCDT, viaSegments])

  const getSvgPt = useCallback((e) => {
    const svg = svgRef.current
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * (W + 40) - 20,
      y: ((e.clientY - rect.top) / rect.height) * (H + 40) - 20,
    }
  }, [])

  const onDown = useCallback((e, idx) => {
    e.stopPropagation()
    setDragIdx(idx)
  }, [])

  const onMove = useCallback(
    (e) => {
      if (dragIdx === null) return
      const p = getSvgPt(e)
      if (!p) return
      setVias((currentVias) =>
        currentVias.map((via, i) =>
          i === dragIdx
            ? {
                ...via,
                center: {
                  x: Math.max(0, Math.min(W, p.x)),
                  y: Math.max(0, Math.min(H, p.y)),
                },
              }
            : via,
        ),
      )
    },
    [dragIdx, getSvgPt],
  )

  const onUp = useCallback(() => setDragIdx(null), [])

  const addVia = useCallback(
    (e) => {
      if (dragIdx !== null) return
      const p = getSvgPt(e)
      if (!p || p.x < 0 || p.x > W || p.y < 0 || p.y > H) return
      setVias((currentVias) => [
        ...currentVias,
        { center: { x: p.x, y: p.y }, diameter: 20 + Math.random() * 20 },
      ])
    },
    [dragIdx, getSvgPt],
  )

  const removeVia = useCallback(
    (idx) => setVias((currentVias) => currentVias.filter((_, i) => i !== idx)),
    [],
  )

  const ports = useMemo(
    () => computeRegionPorts({ regions, bounds, vias, clearance: cl }),
    [regions, bounds, vias, cl],
  )

  const maxDepth = depths.length ? Math.max(...depths) : 0

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f6f8fc",
        color: "#1d2430",
        fontFamily: "system-ui, sans-serif",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #d6dde8",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <h2
          style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#1d2430" }}
        >
          Hypergraph Region Constructor
        </h2>
        <span style={{ fontSize: 12, color: "#5d6878" }}>
          Click to add vias - Drag to move - Right-click to remove
        </span>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <svg
          ref={svgRef}
          viewBox={`-20 -20 ${W + 40} ${H + 40}`}
          style={{
            flex: 1,
            minWidth: 0,
            cursor: dragIdx !== null ? "grabbing" : "crosshair",
            background: "#ffffff",
          }}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          onClick={addVia}
        >
          {Array.from({ length: 10 }, (_, i) => {
            const x = ((i + 1) * W) / 10
            const y = ((i + 1) * H) / 10
            return (
              <g key={i} opacity={0.1}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={H}
                  stroke="#555"
                  strokeWidth={0.5}
                />
                <line
                  x1={0}
                  y1={y}
                  x2={W}
                  y2={y}
                  stroke="#555"
                  strokeWidth={0.5}
                />
              </g>
            )
          })}

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
            regions.map((r, i) => (
              <path
                key={`r${i}`}
                d={regionPath(r)}
                fill={
                  hoverRegion === i
                    ? PALETTE_FILL[i % PALETTE_FILL.length].replace(
                        "0.3",
                        "0.5",
                      )
                    : PALETTE_FILL[i % PALETTE_FILL.length]
                }
                stroke={PALETTE_STROKE[i % PALETTE_STROKE.length]}
                strokeWidth={hoverRegion === i ? 2 : 1.2}
                onMouseEnter={() => setHoverRegion(i)}
                onMouseLeave={() => setHoverRegion(null)}
                style={{ transition: "fill 0.15s" }}
              />
            ))}

          {showHull &&
            hoverRegion !== null &&
            hulls[hoverRegion] &&
            depths[hoverRegion] > 0.01 && (
              <path
                d={regionPath(hulls[hoverRegion])}
                fill="rgba(255,255,255,0.06)"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.2}
                strokeDasharray="4,3"
                pointerEvents="none"
              />
            )}

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
                strokeWidth={1.5}
                style={{ cursor: "grab" }}
                onMouseDown={(e) => onDown(e, i)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  removeVia(i)
                }}
              />
              <circle
                cx={v.center.x}
                cy={v.center.y}
                r={2}
                fill="#fff"
                pointerEvents="none"
              />
            </g>
          ))}

          {showPorts &&
            ports.map((p, i) => (
              <g key={`p${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={3.5}
                  fill="none"
                  stroke={PALETTE_STROKE[p.region % PALETTE_STROKE.length]}
                  strokeWidth={1.2}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={1.5}
                  fill={PALETTE_STROKE[p.region % PALETTE_STROKE.length]}
                />
              </g>
            ))}
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
              ["Hull overlay on hover", showHull, setShowHull],
              ["Ports", showPorts, setShowPorts],
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
              Concavity Margin:{" "}
              <span
                style={{ color: concavityTol === 0 ? "#4ecb82" : "#ffb84d" }}
              >
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
                ? "Strict convexity - all regions fully convex"
                : `Allows concave dents up to ${concavityTol.toFixed(1)}px deep`}
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
                const defaultVal = useCDT ? 8 : 24
                setViaSegments(v === defaultVal ? undefined : v)
              }}
              style={{ width: "100%" }}
            />
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
              {useCDT
                ? "CDT enforces obstacle boundaries as edges. filterTris is skipped unless obstacles overlap."
                : "Unconstrained Bowyer-Watson. filterTris removes obstacle-crossing triangles."}
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
              Actions
            </div>
            {[
              ["Reset", () => setVias(INIT_VIAS)],
              ["Clear All", () => setVias([])],
              [
                "Randomize",
                () => {
                  const nextVias = []
                  for (let k = 0; k < 6 + Math.floor(Math.random() * 6); k++) {
                    nextVias.push({
                      center: {
                        x: 40 + Math.random() * (W - 80),
                        y: 40 + Math.random() * (H - 80),
                      },
                      diameter: 15 + Math.random() * 30,
                    })
                  }
                  setVias(nextVias)
                },
              ],
            ].map(([label, fn]) => (
              <button
                key={label}
                onClick={fn}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  background: "#eef3fb",
                  color: "#1d2430",
                  border: "1px solid #cfd8e6",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                  marginBottom: 6,
                }}
              >
                {label}
              </button>
            ))}
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
              <div>
                Max concavity:{" "}
                <span
                  style={{ color: maxDepth > 0.01 ? "#ffb84d" : "#4ecb82" }}
                >
                  {maxDepth.toFixed(1)}px
                </span>
              </div>
            </div>
          </div>

          {hoverRegion !== null && regions[hoverRegion] && (
            <div
              style={{ background: "#edf2fa", borderRadius: 8, padding: 12 }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#999",
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Region {hoverRegion}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div>Vertices: {regions[hoverRegion].length}</div>
                <div>Area: {polyArea(regions[hoverRegion]).toFixed(0)} px2</div>
                <div>
                  Concavity:{" "}
                  <span
                    style={{
                      color: depths[hoverRegion] > 0.01 ? "#ffb84d" : "#4ecb82",
                    }}
                  >
                    {depths[hoverRegion].toFixed(1)}px
                  </span>
                </div>
                <div>
                  Ports: {ports.filter((p) => p.region === hoverRegion).length}
                </div>
              </div>
            </div>
          )}

          <div
            style={{
              fontSize: 11,
              color: "#666",
              lineHeight: 1.6,
              marginTop: "auto",
            }}
          >
            <strong style={{ color: "#888" }}>Concavity depth</strong> = max
            distance any polygon vertex deviates inward from the convex hull. At
            0, all regions are strictly convex. Increasing allows larger merged
            regions with shallow concave dents. Enable "Hull overlay on hover"
            to see the gap.
          </div>
        </div>
      </div>
    </div>
  )
}
