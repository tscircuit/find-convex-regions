# find-convex-regions

Compute convex free-space regions inside a rectangular board area while avoiding circular keepouts (vias + clearance).

This module gives you:

- Region polygons (`regions`)
- Optional convex hulls and concavity depth metrics (`hulls`, `depths`)
- A helper to generate candidate ports on region edges (`computeRegionPorts`)

## Core API

Use the pure function API when you just want geometry output:

```ts
import { computeConvexRegions } from "./lib/computeConvexRegions"

const result = computeConvexRegions({
  bounds: { minX: 0, maxX: 450, minY: 0, maxY: 450 },
  vias: [
    { center: { x: 120, y: 150 }, diameter: 30 },
    { center: { x: 250, y: 100 }, diameter: 25 },
  ],
  clearance: 8,
  concavityTolerance: 0,
})

console.log(result.regions.length)
```

Types are defined in `lib/types.ts`.

## Bring Your Own Ports (BYOP)

You are not required to use auto-generated ports.

`computeRegionPorts` is just a convenience helper:

```ts
import { computeRegionPorts } from "./lib/computeRegionPorts"

const autoPorts = computeRegionPorts(regions, bounds, vias, clearance)
```

If you already have your own ports (for example from another router, hand-authored anchors, or netlist constraints), pass them through your own pipeline directly.

Recommended BYOP shape:

```ts
type RegionPort = {
  x: number
  y: number
  region: number
}
```

Typical flow:

1. Run `computeConvexRegions(...)` to get `regions`.
2. Keep your own port coordinates.
3. Assign each port to a region index (if your downstream logic needs `region`).
4. Skip `computeRegionPorts` entirely, or merge your ports with auto ports.

Example merge:

```ts
const ports = [...userPorts, ...computeRegionPorts(regions, bounds, vias, clearance)]
```

## Solver Pipeline API

If you want step-by-step debugability, use the pipeline solver:

```ts
import { ConvexRegionsSolver } from "./lib/ConvexRegionsSolver"

const solver = new ConvexRegionsSolver({
  bounds,
  vias,
  clearance: 8,
  concavityTolerance: 0,
})

solver.solve()
const output = solver.getOutput()
```

## Notes

- `concavityTolerance = 0` enforces strict convex regions.
- Increasing `concavityTolerance` allows merges with shallow concave dents.
- Ports near board boundary/vias may be filtered by the helper; BYOP lets you fully control this behavior.
