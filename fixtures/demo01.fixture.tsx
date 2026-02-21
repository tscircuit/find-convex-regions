// @ts-nocheck
import { useCallback, useMemo, useRef, useState } from "react"

// ===== GEOMETRY =====
const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2

function ptSegDist(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y
  const l2 = dx * dx + dy * dy
  if (l2 < 1e-10) return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2
  t = Math.max(0, Math.min(1, t))
  return Math.sqrt((p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2)
}

function polyArea(ring) {
  let s = 0
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length
    s += ring[i].x * ring[j].y - ring[j].x * ring[i].y
  }
  return Math.abs(s) / 2
}

function hullIdx(idxs, pts) {
  const t = [...new Set(idxs)].map((i) => ({ i, x: pts[i].x, y: pts[i].y }))
  t.sort((a, b) => a.x - b.x || a.y - b.y)
  if (t.length <= 2) return t.map((v) => v.i)
  const lo = [],
    hi = []
  for (const p of t) {
    while (
      lo.length >= 2 &&
      cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 1e-10
    )
      lo.pop()
    lo.push(p)
  }
  for (let k = t.length - 1; k >= 0; k--) {
    const p = t[k]
    while (
      hi.length >= 2 &&
      cross(hi[hi.length - 2], hi[hi.length - 1], p) <= 1e-10
    )
      hi.pop()
    hi.push(p)
  }
  lo.pop()
  hi.pop()
  return lo.concat(hi).map((v) => v.i)
}

// Concavity depth: max distance from any non-hull vertex to the hull boundary
function concavityDepth(ring, pts) {
  if (ring.length <= 3) return 0
  const h = hullIdx(ring, pts)
  const hSet = new Set(h)
  const hPts = h.map((i) => pts[i])
  let maxD = 0
  for (const idx of ring) {
    if (hSet.has(idx)) continue
    const p = pts[idx]
    let minD = Infinity
    for (let i = 0; i < hPts.length; i++) {
      minD = Math.min(minD, ptSegDist(p, hPts[i], hPts[(i + 1) % hPts.length]))
    }
    maxD = Math.max(maxD, minD)
  }
  return maxD
}

// ===== DELAUNAY (Bowyer-Watson) =====
function circumcircle(a, b, c) {
  const D = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  if (Math.abs(D) < 1e-10) return { x: 0, y: 0, r2: 1e18 }
  const a2 = a.x * a.x + a.y * a.y,
    b2 = b.x * b.x + b.y * b.y,
    c2 = c.x * c.x + c.y * c.y
  const ux = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / D
  const uy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / D
  return { x: ux, y: uy, r2: (a.x - ux) ** 2 + (a.y - uy) ** 2 }
}

function delaunay(rawPts) {
  const pts = rawPts.map((p, i) => ({ ...p, i }))
  if (pts.length < 3) return []
  let mnX = Infinity,
    mnY = Infinity,
    mxX = -Infinity,
    mxY = -Infinity
  for (const p of pts) {
    mnX = Math.min(mnX, p.x)
    mnY = Math.min(mnY, p.y)
    mxX = Math.max(mxX, p.x)
    mxY = Math.max(mxY, p.y)
  }
  const dm = Math.max(mxX - mnX, mxY - mnY) || 1
  const mx = (mnX + mxX) / 2,
    my = (mnY + mxY) / 2
  const s0 = { x: mx - 30 * dm, y: my - dm, i: -1 }
  const s1 = { x: mx, y: my + 30 * dm, i: -2 }
  const s2 = { x: mx + 30 * dm, y: my - dm, i: -3 }
  let tris = [{ a: s0, b: s1, c: s2, cc: circumcircle(s0, s1, s2) }]
  for (const p of pts) {
    const bad = tris.filter((t) => {
      const dx = p.x - t.cc.x,
        dy = p.y - t.cc.y
      return dx * dx + dy * dy < t.cc.r2 + 1e-6
    })
    const badSet = new Set(bad)
    const edges = []
    for (const t of bad) {
      for (const [ea, eb] of [
        [t.a, t.b],
        [t.b, t.c],
        [t.c, t.a],
      ]) {
        let shared = false
        for (const t2 of bad) {
          if (t2 === t) continue
          if (
            [t2.a, t2.b, t2.c].includes(ea) &&
            [t2.a, t2.b, t2.c].includes(eb)
          ) {
            shared = true
            break
          }
        }
        if (!shared) edges.push([ea, eb])
      }
    }
    tris = tris.filter((t) => !badSet.has(t))
    for (const [ea, eb] of edges) {
      const nt = { a: ea, b: eb, c: p, cc: circumcircle(ea, eb, p) }
      tris.push(nt)
    }
  }
  return tris
    .filter((t) => t.a.i >= 0 && t.b.i >= 0 && t.c.i >= 0)
    .map((t) => [t.a.i, t.b.i, t.c.i])
}

// ===== POINT GENERATION =====
function genPoints(bounds, vias, cl) {
  const pts = []
  const { minX: x0, maxX: x1, minY: y0, maxY: y1 } = bounds
  pts.push(
    { x: x0, y: y0 },
    { x: x1, y: y0 },
    { x: x1, y: y1 },
    { x: x0, y: y1 },
  )
  const eSeg = 10
  for (let i = 1; i < eSeg; i++) {
    const t = i / eSeg
    pts.push({ x: x0 + t * (x1 - x0), y: y0 })
    pts.push({ x: x1, y: y0 + t * (y1 - y0) })
    pts.push({ x: x1 - t * (x1 - x0), y: y1 })
    pts.push({ x: x0, y: y1 - t * (y1 - y0) })
  }
  const nSeg = 24
  for (const v of vias) {
    const r = v.diameter / 2 + cl
    for (let i = 0; i < nSeg; i++) {
      const a = (2 * Math.PI * i) / nSeg
      pts.push({
        x: v.center.x + r * Math.cos(a),
        y: v.center.y + r * Math.sin(a),
      })
    }
  }
  return pts.map((p, i) => ({
    x: p.x + ((i % 7) - 3) * 1e-6,
    y: p.y + ((i % 5) - 2) * 1e-6,
  }))
}

function inFreeSpace(px, py, bounds, vias, cl) {
  const { minX, maxX, minY, maxY } = bounds
  if (px < minX - 0.1 || px > maxX + 0.1 || py < minY - 0.1 || py > maxY + 0.1)
    return false
  for (const v of vias) {
    const r = v.diameter / 2 + cl
    if ((px - v.center.x) ** 2 + (py - v.center.y) ** 2 < r * r - 0.1)
      return false
  }
  return true
}

function filterTris(tris, pts, bounds, vias, cl) {
  return tris.filter(([a, b, c]) => {
    const cx = (pts[a].x + pts[b].x + pts[c].x) / 3
    const cy = (pts[a].y + pts[b].y + pts[c].y) / 3
    return inFreeSpace(cx, cy, bounds, vias, cl)
  })
}

// ===== MERGE WITH CONCAVITY TOLERANCE =====
const eKey = (a, b) => (a < b ? a * 100000 + b : b * 100000 + a)

// Merge two adjacent polygon rings along shared edges into one ring
function stitchRings(ringA, ringB) {
  // Build directed edge sets
  const edgeA = ringA.map((v, i) => [v, ringA[(i + 1) % ringA.length]])
  const edgeB = ringB.map((v, i) => [v, ringB[(i + 1) % ringB.length]])

  const sharedKeys = new Set()
  for (const [a1, a2] of edgeA) {
    for (const [b1, b2] of edgeB) {
      if (a1 === b2 && a2 === b1) sharedKeys.add(eKey(a1, a2))
    }
  }
  if (sharedKeys.size === 0) return null

  // Keep non-shared directed edges, chain into ring
  const remain = []
  for (const [a1, a2] of edgeA)
    if (!sharedKeys.has(eKey(a1, a2))) remain.push([a1, a2])
  for (const [b1, b2] of edgeB)
    if (!sharedKeys.has(eKey(b1, b2))) remain.push([b1, b2])

  if (remain.length === 0) return null
  const adj = new Map()
  for (const [f, t] of remain) adj.set(f, t)

  const start = remain[0][0]
  const chain = [start]
  let cur = adj.get(start)
  let safety = 0
  while (cur !== undefined && cur !== start && safety++ < remain.length + 5) {
    chain.push(cur)
    cur = adj.get(cur)
  }
  if (cur !== start || chain.length !== remain.length) return null // couldn't close
  return chain
}

function mergeCells(tris, pts, concavityTol) {
  if (!tris.length) return { cells: [], depths: [] }
  const cells = tris.map(([a, b, c]) =>
    cross(pts[a], pts[b], pts[c]) < 0 ? [a, c, b] : [a, b, c],
  )

  let changed = true,
    iter = 0
  while (changed && iter++ < 800) {
    changed = false
    const eMap = new Map()
    const adj = cells.map(() => new Set())
    for (let ci = 0; ci < cells.length; ci++) {
      const r = cells[ci]
      for (let i = 0; i < r.length; i++) {
        const ek = eKey(r[i], r[(i + 1) % r.length])
        if (eMap.has(ek)) {
          const o = eMap.get(ek)
          adj[ci].add(o)
          adj[o].add(ci)
        } else eMap.set(ek, ci)
      }
    }

    let bestI = -1,
      bestJ = -1,
      bestR = null,
      bestD = Infinity
    for (let i = 0; i < cells.length; i++) {
      for (const j of adj[i]) {
        if (j <= i) continue
        const merged = stitchRings(cells[i], cells[j])
        if (!merged) continue
        const d = concavityDepth(merged, pts)
        if (d <= concavityTol + 1e-6 && d < bestD) {
          bestD = d
          bestI = i
          bestJ = j
          bestR = merged
        }
      }
    }

    // If no merge under bestD (smallest concavity) found, also try area-priority
    if (bestI < 0) break

    cells[bestI] = bestR
    cells.splice(bestJ, 1)
    changed = true
  }

  const depths = cells.map((c) => concavityDepth(c, pts))
  return { cells, depths }
}

// ===== ORCHESTRATOR =====
function compute(bounds, vias, cl, concavityTol) {
  const pts = genPoints(bounds, vias, cl)
  const all = delaunay(pts)
  const valid = filterTris(all, pts, bounds, vias, cl)
  const { cells, depths } = mergeCells(valid, pts, concavityTol)
  const regions = cells.map((c) => c.map((i) => pts[i]))
  const hulls = cells.map((c) => hullIdx(c, pts).map((i) => pts[i]))
  return { pts, validTris: valid, regions, hulls, depths }
}

// ===== COLORS =====
const PAL = [
  "rgba(56,182,255,0.3)",
  "rgba(255,107,107,0.3)",
  "rgba(78,205,130,0.3)",
  "rgba(255,193,69,0.3)",
  "rgba(168,130,255,0.3)",
  "rgba(255,140,200,0.3)",
  "rgba(100,220,200,0.3)",
  "rgba(220,180,100,0.3)",
  "rgba(130,160,255,0.3)",
  "rgba(255,160,100,0.3)",
  "rgba(160,255,160,0.3)",
  "rgba(200,130,180,0.3)",
  "rgba(100,200,255,0.3)",
  "rgba(255,220,130,0.3)",
  "rgba(180,130,100,0.3)",
  "rgba(130,255,220,0.3)",
  "rgba(255,130,130,0.3)",
  "rgba(130,180,130,0.3)",
]
const PAL_S = [
  "rgb(56,182,255)",
  "rgb(255,107,107)",
  "rgb(78,205,130)",
  "rgb(255,193,69)",
  "rgb(168,130,255)",
  "rgb(255,140,200)",
  "rgb(100,220,200)",
  "rgb(220,180,100)",
  "rgb(130,160,255)",
  "rgb(255,160,100)",
  "rgb(160,255,160)",
  "rgb(200,130,180)",
  "rgb(100,200,255)",
  "rgb(255,220,130)",
  "rgb(180,130,100)",
  "rgb(130,255,220)",
  "rgb(255,130,130)",
  "rgb(130,180,130)",
]

const INIT_VIAS = [
  { center: { x: 120, y: 150 }, diameter: 30 },
  { center: { x: 250, y: 100 }, diameter: 25 },
  { center: { x: 200, y: 280 }, diameter: 35 },
  { center: { x: 350, y: 200 }, diameter: 28 },
  { center: { x: 100, y: 350 }, diameter: 22 },
]

export default function App() {
  const W = 450,
    H = 450
  const bounds = { minX: 0, maxX: W, minY: 0, maxY: H }

  const [vias, setVias] = useState(INIT_VIAS)
  const [cl, setCl] = useState(8)
  const [concavityTol, setConcavityTol] = useState(0)
  const [showTris, setShowTris] = useState(false)
  const [showRegions, setShowRegions] = useState(true)
  const [showHull, setShowHull] = useState(false)
  const [showPorts, setShowPorts] = useState(true)
  const [dragIdx, setDragIdx] = useState(null)
  const [hoverRegion, setHoverRegion] = useState(null)
  const svgRef = useRef(null)

  const { pts, validTris, regions, hulls, depths } = useMemo(
    () => compute(bounds, vias, cl, concavityTol),
    [vias, cl, concavityTol],
  )

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
      setVias((v) =>
        v.map((vi, i) =>
          i === dragIdx
            ? {
                ...vi,
                center: {
                  x: Math.max(0, Math.min(W, p.x)),
                  y: Math.max(0, Math.min(H, p.y)),
                },
              }
            : vi,
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
      setVias((v) => [
        ...v,
        { center: { x: p.x, y: p.y }, diameter: 20 + Math.random() * 20 },
      ])
    },
    [dragIdx, getSvgPt],
  )

  const removeVia = useCallback(
    (idx) => setVias((v) => v.filter((_, i) => i !== idx)),
    [],
  )

  const ports = useMemo(() => {
    const result = []
    for (let ri = 0; ri < regions.length; ri++) {
      const r = regions[ri]
      for (let i = 0; i < r.length; i++) {
        const a = r[i],
          b = r[(i + 1) % r.length]
        const mx = (a.x + b.x) / 2,
          my = (a.y + b.y) / 2
        const onB =
          Math.abs(mx - bounds.minX) < 1 ||
          Math.abs(mx - bounds.maxX) < 1 ||
          Math.abs(my - bounds.minY) < 1 ||
          Math.abs(my - bounds.maxY) < 1
        const nearV = vias.some(
          (v) =>
            dist2(v.center, { x: mx, y: my }) < (v.diameter / 2 + cl + 2) ** 2,
        )
        if (!onB || nearV) {
          const len = Math.sqrt(dist2(a, b))
          const nP = Math.max(1, Math.floor(len / 40))
          for (let k = 0; k < nP; k++) {
            const t = (k + 1) / (nP + 1)
            result.push({
              x: a.x + t * (b.x - a.x),
              y: a.y + t * (b.y - a.y),
              region: ri,
            })
          }
        }
      }
    }
    return result
  }, [regions, vias, cl])

  const maxDepth = depths.length ? Math.max(...depths) : 0

  const rp = (r) =>
    r
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`,
      )
      .join(" ") + " Z"

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
          Click to add vias · Drag to move · Right-click to remove
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
            const x = ((i + 1) * W) / 10,
              y = ((i + 1) * H) / 10
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
                d={rp(r)}
                fill={
                  hoverRegion === i
                    ? PAL[i % PAL.length].replace("0.3", "0.5")
                    : PAL[i % PAL.length]
                }
                stroke={PAL_S[i % PAL_S.length]}
                strokeWidth={hoverRegion === i ? 2 : 1.2}
                onMouseEnter={() => setHoverRegion(i)}
                onMouseLeave={() => setHoverRegion(null)}
                style={{ transition: "fill 0.15s" }}
              />
            ))}

          {/* Convex hull overlay on hover */}
          {showHull &&
            hoverRegion !== null &&
            hulls[hoverRegion] &&
            depths[hoverRegion] > 0.01 && (
              <path
                d={rp(hulls[hoverRegion])}
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
                  stroke={PAL_S[p.region % PAL_S.length]}
                  strokeWidth={1.2}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={1.5}
                  fill={PAL_S[p.region % PAL_S.length]}
                />
              </g>
            ))}
        </svg>

        {/* Sidebar */}
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
            ].map(([l, v, s]) => (
              <label
                key={l}
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
                  checked={v}
                  onChange={(e) => s(e.target.checked)}
                />
                {l}
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
                ? "Strict convexity — all regions fully convex"
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
              Actions
            </div>
            {[
              ["Reset", () => setVias(INIT_VIAS)],
              ["Clear All", () => setVias([])],
              [
                "Randomize",
                () => {
                  const nv = []
                  for (let k = 0; k < 6 + Math.floor(Math.random() * 6); k++)
                    nv.push({
                      center: {
                        x: 40 + Math.random() * (W - 80),
                        y: 40 + Math.random() * (H - 80),
                      },
                      diameter: 15 + Math.random() * 30,
                    })
                  setVias(nv)
                },
              ],
            ].map(([l, fn]) => (
              <button
                key={l}
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
                {l}
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
                <div>Area: {polyArea(regions[hoverRegion]).toFixed(0)} px²</div>
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
