/**
 * PhotoTree — True Recursive Branching Tree Generator
 *
 * How it works:
 *   1. Grow a trunk upward from y=0 with a subtle wiggle
 *   2. Spawn PRIMARY branches at DIFFERENT heights along the trunk (not all at the top)
 *      - Branches starting LOW on the trunk angle steeply upward (to reach canopy)
 *      - Branches starting HIGH spread more horizontally
 *   3. Each branch recurses: it spawns 1-3 CHILD branches at random points along itself
 *      - Children diverge in angle, shrink in size, and may angle differently
 *      - Recursion depth: 1 (primary) → 2 (secondary) → 3 (tertiary twig)
 *   4. Every branch endpoint gets a foliage blob (photo colors from the grid)
 *      - Terminal nodes get full-size blobs
 *      - Intermediate nodes get small blobs (natural foliage along the branch)
 *   5. Foliage overwrites bark at the same position → top view shows the photo
 *   6. Trunk base (well below canopy) always stays brown → visible from the side
 *
 *  Result: organic uneven height, visible trunk, real recursive branch structure,
 *  full top-down photo coverage through branch spread and overlapping blobs.
 */

const VS    = 0.38;
const PI2   = Math.PI * 2;

// ─── Shape Registry ─────────────────────────────────────────────────────────
export const TREE_SHAPES = [
  { id: 'sakura', name: 'Sakura',    icon: '🌸' },
  { id: 'oak',    name: 'Grand Oak', icon: '🌳' },
  { id: 'pine',   name: 'Pine',      icon: '🌲' },
  { id: 'maple',  name: 'Maple',     icon: '🍁' },
  { id: 'cedar',  name: 'Cedar',     icon: '🌴' },
  { id: 'birch',  name: 'Birch',     icon: '🪵' },
];

export function getRandomTreeShape() {
  return TREE_SHAPES[Math.floor(Math.random() * TREE_SHAPES.length)].id;
}

// ─── Main Generator ──────────────────────────────────────────────────────────
export function generateTreeVoxels(pixelGrid, shape = 'sakura') {
  if (!pixelGrid || pixelGrid.length === 0) return [];

  const R  = pixelGrid.length;
  const cx = (R - 1) / 2;
  const cz = (R - 1) / 2;

  // Voxel store — later writes overwrite earlier ones at the same position.
  // Ordering: bark first, foliage last → photo shows from top, bark from sides.
  const voxelMap = new Map();

  const place = (gx, gy, gz, color) => {
    gx = Math.round(gx); gy = Math.round(gy); gz = Math.round(gz);
    if (gy < 0) return;
    voxelMap.set(`${gx},${gy},${gz}`, {
      x:       (gx - cx) * VS,
      y:       gy,
      z:       (gz - cz) * VS,
      targetY: gy * VS,
      color,
    });
  };

  const photo = (gx, gz) => {
    const xi = Math.max(0, Math.min(R - 1, Math.round(gx)));
    const zi = Math.max(0, Math.min(R - 1, Math.round(gz)));
    const p  = pixelGrid[xi][zi];
    return { r: p.r, g: p.g, b: p.b };
  };

  const BARK_COLS = [
    { r: 0.34, g: 0.21, b: 0.11 },
    { r: 0.41, g: 0.27, b: 0.14 },
    { r: 0.28, g: 0.17, b: 0.09 },
    { r: 0.47, g: 0.32, b: 0.17 },
  ];
  const BARK_BIRCH = { r: 0.75, g: 0.71, b: 0.63 };
  const barkCol = () => shape === 'birch'
    ? BARK_BIRCH
    : BARK_COLS[Math.floor(Math.random() * BARK_COLS.length)];

  const p = shapeParams(shape, R);

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 1 — TRUNK
  // Tapered wiggling column from y=0 up to trunkH.
  // ══════════════════════════════════════════════════════════════════════
  let twx = cx, twz = cz;

  for (let y = 0; y <= p.trunkH; y++) {
    const t = y / Math.max(1, p.trunkH);
    const r = p.trunkBaseR * (1 - t) + p.trunkTopR * t;
    twx += (Math.random() - 0.5) * 0.20;  twx = cx + (twx - cx) * 0.84;
    twz += (Math.random() - 0.5) * 0.20;  twz = cz + (twz - cz) * 0.84;
    disc(twx, y, twz, r, (gx, gy, gz) => place(gx, gy, gz, barkCol()));
  }

  const tipX = twx, tipZ = twz;

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 2 — RECURSIVE BRANCH SYSTEM
  //
  // Spawn primary branches at DIFFERENT heights along the trunk.
  // Each one recursively generates sub-branches and tertiary twigs.
  // No two branches are at the same height.
  // ══════════════════════════════════════════════════════════════════════
  const numMain = p.numMain;

  for (let i = 0; i < numMain; i++) {
    // Evenly distribute angles around the trunk (with per-branch jitter)
    const baseAngle  = (i / numMain) * PI2;
    const angleJitter = (Math.random() - 0.5) * (PI2 / numMain) * 0.75;
    const angle      = baseAngle + angleJitter;

    // ── KEY: each branch starts at a DIFFERENT height on the trunk ──
    // Divide [0.30 .. 0.95] of trunkH into numMain non-uniform slots
    // so branches are well-spread vertically, not all at the same level.
    const slotSize   = 0.65 / numMain;
    const slotBase   = 0.30 + i * slotSize;
    const heightFrac = slotBase + Math.random() * slotSize; // within slot
    const oy         = p.trunkH * heightFrac;

    // Branch origin: on the trunk surface at that height
    const ox = tipX + Math.cos(angle) * p.trunkTopR * 0.70;
    const oz = tipZ + Math.sin(angle) * p.trunkTopR * 0.70;

    // Up-angle: branches starting LOWER are steeper (reach up to canopy level).
    // Branches starting near the TOP spread more horizontally.
    const radFrac   = 1 - heightFrac;
    const upAngle   = 0.15 + radFrac * 0.90 + (Math.random() - 0.5) * 0.20;

    // Length: longer for lower branches (they need to reach further out)
    // Cap at 1.30× so branches don't fly way past the disc boundary
    const lenMult   = Math.min(1.30, 0.80 + radFrac * 0.65 + Math.random() * 0.45);
    const length    = p.mainLen * lenMult;

    // Thickness scales with length (thicker for bigger branches)
    const thickness = p.branchR * (0.8 + radFrac * 0.5);

    // Recurse
    branchNode({
      ox, oy, oz,
      angle, upAngle,
      length, thickness,
      depth: 1,
      maxDepth: p.maxDepth,
      p,
      place, barkCol, photo,
    });
  }

  // ── Central crown blob: covers the trunk top with photo colors so
  //    the top-down view shows the photo at the center, not bare bark.
  const crownY = p.trunkH + p.mainLen * 0.18;
  drawFoliage(tipX, crownY, tipZ, p.blobR * 1.30, photo, place);

  // ══════════════════════════════════════════════════════════════════════
  // PHASE 3 — HEIGHT-BASED AO
  // ══════════════════════════════════════════════════════════════════════
  const voxels = [...voxelMap.values()];
  let maxY = 0;
  for (const v of voxels) if (v.y > maxY) maxY = v.y;
  if (maxY === 0) maxY = 1;
  for (const v of voxels) {
    const ao = 0.52 + 0.48 * (v.y / maxY);
    v.color = {
      r: Math.min(1, v.color.r * ao),
      g: Math.min(1, v.color.g * ao),
      b: Math.min(1, v.color.b * ao),
    };
  }

  return voxels;
}

// ─── Recursive Branch Node ────────────────────────────────────────────────────
//
// Draws one branch segment from (ox,oy,oz) in direction (angle, upAngle) for
// `length` grid units. Then recursively spawns 1-3 child branches from random
// points ALONG this segment, each diverging in direction and shrinking in size.
//
function branchNode({ ox, oy, oz, angle, upAngle, length, thickness, depth, maxDepth, p, place, barkCol, photo }) {
  // Compute endpoint
  const ex = ox + Math.cos(angle)  * Math.cos(upAngle) * length;
  const ey = oy + Math.sin(upAngle) * length;
  const ez = oz + Math.sin(angle)  * Math.cos(upAngle) * length;

  // Draw the branch segment as a tapered cylinder
  drawBranch(ox, oy, oz, ex, ey, ez, thickness, thickness * 0.38,
             (gx, gy, gz) => place(gx, gy, gz, barkCol()));

  // ── Small foliage blobs along the branch body ────────────────────────────
  // Placed every ~blobR*0.9 units along the branch, sized at ~35% of terminal blob.
  // This fills the canopy interior between branch tips (fixes top-view gaps)
  // without dominating the visual — bark placed BEFORE foliage still peeks through.
  const segLen = Math.sqrt((ex-ox)**2 + (ey-oy)**2 + (ez-oz)**2);
  const bodyStep = p.blobR * 1.0;
  const numBody  = Math.max(0, Math.floor(segLen / bodyStep) - 1);
  for (let b = 1; b <= numBody; b++) {
    const t  = b / (numBody + 1);
    const bx = ox + (ex - ox) * t;
    const by = oy + (ey - oy) * t;
    const bz = oz + (ez - oz) * t;
    // Smaller blobs for intermediate nodes — about 38% of terminal size
    drawFoliage(bx, by, bz, p.blobR * 0.38, photo, place);
  }

  // ── Foliage at this node's endpoint ──────────────────────────────────────
  // Terminal nodes get full-size blobs; intermediate nodes get small ones
  // (foliage patches along the branch — like leaves partway up a real branch).
  const isTerminal = depth >= maxDepth;
  const blobR = isTerminal
    ? p.blobR * (0.85 + Math.random() * 0.35)    // full-size at tip
    : p.blobR * (0.35 + Math.random() * 0.25);   // small intermediate cluster

  // Foliage written LAST → overwrites bark → photo shows from above
  drawFoliage(ex, ey, ez, blobR, photo, place);

  if (isTerminal) return;

  // ── Spawn child branches ──────────────────────────────────────────────────
  // Random number of children: 1-3 (weighted toward 2)
  const numChildren = Math.random() < 0.15 ? 1    // single (rare)
                    : Math.random() < 0.45 ? 2    // pair (common)
                    : 3;                           // triple (occasional)

  for (let c = 0; c < numChildren; c++) {
    // Probability of actually spawning this child decreases with depth
    const spawnProb = depth === 1 ? 0.95
                    : depth === 2 ? 0.80
                    : 0.55;
    if (Math.random() > spawnProb) continue;

    // Where along the parent does this child branch off?
    // Children branch off anywhere from 30% to 100% along the parent.
    // Multiple children spread out along the parent (not all at the same spot).
    const branchT = 0.30 + (c / Math.max(1, numChildren - 1)) * 0.50
                   + (Math.random() - 0.5) * 0.20;
    const clampedT = Math.max(0.25, Math.min(0.95, branchT));

    const sx = ox + (ex - ox) * clampedT;
    const sy = oy + (ey - oy) * clampedT;
    const sz = oz + (ez - oz) * clampedT;

    // Child direction: diverges from parent with some randomness.
    // - Angle diverges left or right (more divergence at deeper levels)
    // - Up-angle increases slightly (branches grow upward as they get smaller)
    const divergence  = 0.55 + depth * 0.25;
    const childAngle  = angle + (Math.random() - 0.5) * divergence * 2.2;
    const childUp     = upAngle + (Math.random() * 0.35) + 0.05;

    // Child length: 40-75% of parent (shrinks with depth)
    const childLen    = length * (0.38 + Math.random() * 0.38);

    // Child thickness: 40-60% of parent (tapering)
    const childThick  = thickness * (0.40 + Math.random() * 0.22);

    branchNode({
      ox: sx, oy: sy, oz: sz,
      angle: childAngle,
      upAngle: childUp,
      length: childLen,
      thickness: childThick,
      depth: depth + 1,
      maxDepth,
      p,
      place, barkCol, photo,
    });
  }
}

// ─── Geometry Helpers ────────────────────────────────────────────────────────

function disc(cx, y, cz, r, fn) {
  const ri = Math.ceil(r);
  const iy = Math.round(y);
  for (let dx = -ri; dx <= ri; dx++) {
    for (let dz = -ri; dz <= ri; dz++) {
      if (dx * dx + dz * dz <= r * r + 0.5)
        fn(Math.round(cx) + dx, iy, Math.round(cz) + dz);
    }
  }
}

function drawBranch(x1, y1, z1, x2, y2, z2, r1, r2, fn) {
  const dx   = x2 - x1, dy = y2 - y1, dz = z2 - z1;
  const len  = Math.sqrt(dx*dx + dy*dy + dz*dz);
  if (len < 0.1) return;
  const steps = Math.max(3, Math.ceil(len * 1.8));

  for (let s = 0; s <= steps; s++) {
    const t  = s / steps;
    const px = x1 + dx * t, py = y1 + dy * t, pz = z1 + dz * t;
    const r  = r1 + (r2 - r1) * t;
    const ri = Math.ceil(r);
    const iy = Math.round(py);
    for (let ddx = -ri; ddx <= ri; ddx++) {
      for (let ddz = -ri; ddz <= ri; ddz++) {
        if (ddx*ddx + ddz*ddz <= r*r + 0.5)
          fn(Math.round(px + ddx), iy, Math.round(pz + ddz));
      }
    }
  }
}

function drawFoliage(cx, cy, cz, radius, photoFn, placeFn) {
  const rX  = radius;
  const rY  = radius * 0.68;
  const rXi = Math.ceil(rX);
  const rYi = Math.ceil(rY);
  const DENSITY = 0.72;

  for (let dx = -rXi; dx <= rXi; dx++) {
    for (let dy = -rYi; dy <= rYi; dy++) {
      for (let dz = -rXi; dz <= rXi; dz++) {
        const noise = 0.82 + Math.random() * 0.36;
        const dist  = (dx*dx)/(rX*rX) + (dy*dy)/(rY*rY) + (dz*dz)/(rX*rX);
        if (dist < noise && Math.random() < DENSITY) {
          const gx = Math.round(cx + dx);
          const gy = Math.round(cy + dy);
          const gz = Math.round(cz + dz);
          placeFn(gx, gy, gz, photoFn(gx, gz));
        }
      }
    }
  }
}

// ─── Per-shape Parameters ────────────────────────────────────────────────────

function shapeParams(shape, R) {
  switch (shape) {

    case 'sakura': return {
      trunkH:     Math.round(R * 0.62),   // tall visible trunk
      trunkBaseR: R * 0.078,              // thick at base
      trunkTopR:  R * 0.028,
      numMain:    7 + Math.floor(Math.random() * 3),  // 7-9
      maxDepth:   3,
      mainLen:    R * 0.48,               // long spreading branches
      branchR:    R * 0.042,              // substantial thickness
      blobR:      R * 0.200,             // large fluffy sakura clouds
    };

    case 'oak': return {
      trunkH:     Math.round(R * 0.72),
      trunkBaseR: R * 0.090,
      trunkTopR:  R * 0.034,
      numMain:    8 + Math.floor(Math.random() * 3),
      maxDepth:   3,
      mainLen:    R * 0.44,
      branchR:    R * 0.050,
      blobR:      R * 0.175,
    };

    case 'pine': return {
      trunkH:     Math.round(R * 0.95),   // very tall pine
      trunkBaseR: R * 0.058,
      trunkTopR:  R * 0.016,
      numMain:    11 + Math.floor(Math.random() * 4),
      maxDepth:   2,
      mainLen:    R * 0.32,
      branchR:    R * 0.028,
      blobR:      R * 0.115,
    };

    case 'maple': return {
      trunkH:     Math.round(R * 0.65),
      trunkBaseR: R * 0.082,
      trunkTopR:  R * 0.030,
      numMain:    8 + Math.floor(Math.random() * 3),
      maxDepth:   3,
      mainLen:    R * 0.46,
      branchR:    R * 0.044,
      blobR:      R * 0.190,
    };

    case 'cedar': return {
      trunkH:     Math.round(R * 0.85),
      trunkBaseR: R * 0.068,
      trunkTopR:  R * 0.020,
      numMain:    10 + Math.floor(Math.random() * 4),
      maxDepth:   2,
      mainLen:    R * 0.44,
      branchR:    R * 0.032,
      blobR:      R * 0.140,
    };

    case 'birch': return {
      trunkH:     Math.round(R * 0.80),
      trunkBaseR: R * 0.050,
      trunkTopR:  R * 0.016,
      numMain:    6 + Math.floor(Math.random() * 3),
      maxDepth:   3,
      mainLen:    R * 0.36,
      branchR:    R * 0.026,
      blobR:      R * 0.155,
    };

    default: return shapeParams('oak', R);
  }
}
