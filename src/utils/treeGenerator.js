/**
 * PhotoTree voxel tree generator.
 *
 * Architecture: each (x,z) column may have MULTIPLE Y-segments (trunk + multiple canopy tiers).
 * This allows tiered shapes like Maple (4 disc layers) or Cedar (3 platform layers).
 *
 * Top-down constraint: the TOPMOST voxel in each column gets the exact photo pixel color.
 */

export const TREE_SHAPES = [
  { id: 'sakura', name: 'Sakura',   icon: '🌸' },
  { id: 'oak',    name: 'Grand Oak', icon: '🌳' },
  { id: 'pine',   name: 'Pine',      icon: '🌲' },
  { id: 'maple',  name: 'Maple',     icon: '🍁' },
  { id: 'cedar',  name: 'Cedar',     icon: '🌴' },
  { id: 'flower', name: 'Flower',    icon: '🌺' },
];

export function getRandomTreeShape() {
  return TREE_SHAPES[Math.floor(Math.random() * TREE_SHAPES.length)].id;
}

function sn(x, z, s) {                                       // seeded noise helper
  return Math.sin(x * 0.53 + s * 2.1) * Math.cos(z * 0.47 + s * 1.7);
}

export function generateTreeVoxels(pixelGrid, shape = 'sakura', seed = Math.random()) {
  if (!pixelGrid || pixelGrid.length === 0) return [];

  const W  = pixelGrid.length;
  const D  = pixelGrid[0].length;
  const cx = (W - 1) / 2;
  const cz = (D - 1) / 2;
  const R  = Math.min(W, D) * 0.46;
  const VS = 0.38;

  // Per-shape trunk config
  const CFG = {
    pine:   { trunkH: 4,  trunkR: 1.6 },
    oak:    { trunkH: 14, trunkR: 2.8 },
    sakura: { trunkH: 10, trunkR: 2.2 },
    maple:  { trunkH: 11, trunkR: 2.0 },
    cedar:  { trunkH: 12, trunkR: 2.8 },
    flower: { trunkH:  3, trunkR: 1.2 },
  };
  const cfg = CFG[shape] ?? CFG.sakura;

  const voxels = [];
  const SHELL  = 2;

  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      const dx   = x - cx;
      const dz   = z - cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const ang  = Math.atan2(dz, dx);
      const norm = dist / R;

      const pixel = pixelGrid[x][z];
      if (!pixel || pixel.a < 0.1) continue;

      const inTrunk  = dist <= cfg.trunkR;
      const skyBase  = cfg.trunkH;            // canopy starts at trunk top

      // ── Y-segments this column will fill ──────────────────────────
      // Each segment = { min, max }.  Trunk segment added below if applicable.
      const segs = [];

      switch (shape) {

        // ── PINE: stepped conical tiers going all the way to the ground ──
        case 'pine': {
          if (dist <= R) {
            const t    = Math.max(0, 1 - norm);
            const raw  = skyBase + Math.pow(t, 0.72) * R * 1.85;
            const STEP = 3;
            const top  = Math.ceil(raw / STEP) * STEP + Math.round(sn(x, z, seed) * 0.5);
            // Canopy nearly touches ground at outer edge
            const bot  = inTrunk ? 0 : Math.max(skyBase, top - STEP);
            segs.push({ min: bot, max: top });
          }
          break;
        }

        // ── OAK: clear lollipop – wide spreading dome high above trunk ──
        case 'oak': {
          if (dist <= R) {
            const dome  = Math.sqrt(Math.max(0, 1 - norm * norm));
            const bumps = Math.sin(ang * 5 + seed * 9) * 2.2 + Math.cos(ang * 3 + seed * 5) * 1.5;
            const top   = Math.round(skyBase + dome * R * 1.35 + bumps);
            const bot   = inTrunk ? 0 : skyBase;
            if (top > 0) segs.push({ min: bot, max: top });
          }
          break;
        }

        // ── SAKURA: three overlapping cloud puffs above trunk ──
        case 'sakura': {
          if (dist <= R) {
            const base = Math.sqrt(Math.max(0, 1 - norm * norm)) * R * 0.9;
            const p1   = (sn(dx,       dz,       seed)       + 1) * 2.8;
            const p2   = (sn(dx * 0.6, dz * 0.6, seed + 0.5) + 1) * 2.0;
            const p3   = (sn(dx * 0.35,dz * 0.35,seed + 1.2) + 1) * 1.4;
            const top  = Math.round(skyBase + base + p1 + p2 + p3);
            const floorOffset = norm < 0.5 ? base * 0.2 : 0;
            const bot  = inTrunk ? 0 : Math.round(skyBase + floorOffset);
            if (top > 0) segs.push({ min: bot, max: top });
          }
          break;
        }

        // ── MAPLE: 4 spreading horizontal tier discs ──────────────────
        // Each tier is a flat disc of foliage at a specific height.
        // Tiers get narrower going up → distinctive layered silhouette.
        case 'maple': {
          const TIERS = [
            { h: skyBase + 0,  r: R * 0.92, thick: 3 },
            { h: skyBase + 5,  r: R * 0.74, thick: 3 },
            { h: skyBase + 9,  r: R * 0.54, thick: 3 },
            { h: skyBase + 13, r: R * 0.28, thick: 3 },
          ];
          for (const tier of TIERS) {
            if (dist <= tier.r) {
              const noise  = sn(dx, dz, seed + tier.h * 0.1) * 1.2;
              const tBot   = Math.round(tier.h);
              const tTop   = Math.round(tier.h + tier.thick + noise);
              // Only include trunk in the very bottom of the first segment
              const segBot = (inTrunk && tBot === skyBase) ? 0 : tBot;
              segs.push({ min: segBot, max: tTop });
            }
          }
          break;
        }

        // ── CEDAR: 3 wide flat platform layers (umbrella / tabletop) ─
        // First platform is VERY wide, subsequent ones narrower at top.
        // Creates a flat-topped cedar/baobab silhouette.
        case 'cedar': {
          const TIERS = [
            { h: skyBase + 0,  r: R * 1.00, thick: 2.5 },  // widest, lowest
            { h: skyBase + 5,  r: R * 0.72, thick: 2.5 },  // mid
            { h: skyBase + 9,  r: R * 0.42, thick: 2.5 },  // upper
            { h: skyBase + 13, r: R * 0.18, thick: 2   },  // apex
          ];
          for (const tier of TIERS) {
            if (dist <= tier.r) {
              const noise  = sn(dx, dz, seed + tier.h * 0.12) * 0.8;
              const tBot   = Math.round(tier.h);
              const tTop   = Math.round(tier.h + tier.thick + noise);
              const segBot = (inTrunk && tBot === skyBase) ? 0 : tBot;
              segs.push({ min: segBot, max: tTop });
            }
          }
          break;
        }

        // ── FLOWER: 6-petal open bloom ────────────────────────────────
        case 'flower': {
          const PETALS = 6;
          const pw = Math.sin(ang * PETALS) * 0.38 + 0.62;
          if (dist <= R * pw) {
            const isCenter = dist < R * 0.22;
            if (isCenter) {
              segs.push({ min: inTrunk ? 0 : skyBase, max: Math.round(skyBase + R * 0.55) });
            } else {
              const t   = dist / (R * pw);
              const top = Math.round(skyBase + Math.sin(t * Math.PI) * R * 0.5);
              const bot = Math.max(1, top - 4);
              segs.push({ min: bot, max: top });
            }
          }
          break;
        }
      }

      if (segs.length === 0) continue;

      // Overall top = max of all segments
      const overallTop = Math.max(...segs.map(s => s.max));
      if (overallTop <= 0) continue;

      // Build a fast "is Y in any segment" lookup using a Set
      const activeY = new Set();
      for (const seg of segs) {
        for (let y = seg.min; y <= seg.max; y++) {
          // Shell optimization: only keep top, bottom, trunk, and every 2nd interior
          const isSegTop = y === seg.max;
          const isSegBot = y === seg.min;
          const isTr     = inTrunk && y <= cfg.trunkH;
          if (isSegTop || isSegBot || isTr || y % SHELL === 0) {
            activeY.add(y);
          }
        }
      }
      // Always include the overall top voxel (carries photo color)
      activeY.add(overallTop);

      for (const y of [...activeY].sort((a, b) => a - b)) {
        const isTop   = y === overallTop;
        const isTrunk = inTrunk && y <= cfg.trunkH;

        let color;
        if (isTop) {
          color = { r: pixel.r, g: pixel.g, b: pixel.b };
        } else if (isTrunk) {
          const bF = 0.20 + (y / (cfg.trunkH || 1)) * 0.18;
          color = { r: bF * 1.4, g: bF * 0.72, b: bF * 0.42 };
        } else {
          // Find which segment this Y belongs to, then shade by depth within it
          const seg = segs.find(s => y >= s.min && y <= s.max) ?? segs[0];
          const f = 0.28 + 0.68 * ((y - seg.min) / (seg.max - seg.min || 1));
          color = { r: pixel.r * f, g: pixel.g * f, b: pixel.b * f };
        }

        voxels.push({
          x:       (x - cx) * VS,
          y:       y * VS,
          z:       (z - cz) * VS,
          targetY: y * VS,
          gridX: x, gridZ: z,
          color, isTop, isTrunk,
        });
      }
    }
  }

  return voxels;
}
