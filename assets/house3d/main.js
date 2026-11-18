import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { PLAN, ROOMS, FURNITURE, OPENINGS, APS, CABLE, CABLE_DROPS, PATIO, GABLE, F } from "./plan.js";

const CREAM = new THREE.Color("#F4ECDD");
const GOLD = new THREE.Color("#D4A441");
const GOLD_LT = new THREE.Color("#E8C877");
const BG = 0x0a0708;
const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (REDUCED) document.documentElement.classList.add("reduced");

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(0x4b4e43);

const roomById = (id) => ROOMS.find((r) => r.id === id);

function roomEdges(r) {
  return {
    s: { x1: r.x, z1: r.z, x2: r.x + r.w, z2: r.z, side: "s", len: r.w },
    n: { x1: r.x, z1: r.z + r.d, x2: r.x + r.w, z2: r.z + r.d, side: "n", len: r.w },
    w: { x1: r.x, z1: r.z, x2: r.x, z2: r.z + r.d, side: "w", len: r.d },
    e: { x1: r.x + r.w, z1: r.z, x2: r.x + r.w, z2: r.z + r.d, side: "e", len: r.d },
  };
}

function canon(x1, z1, x2, z2) {
  if (x1 > x2 + 1e-9 || (Math.abs(x1 - x2) < 1e-9 && z1 > z2)) return [x2, z2, x1, z1];
  return [x1, z1, x2, z2];
}

function overlap1D(a0, a1, b0, b1) {
  const lo = Math.max(Math.min(a0, a1), Math.min(b0, b1));
  const hi = Math.min(Math.max(a0, a1), Math.max(b0, b1));
  return hi - lo > 0.05 ? [lo, hi] : null;
}

function sharedEdge(a, b) {
  const ea = roomEdges(a), eb = roomEdges(b);
  const pairs = [
    ["n", "s"], ["s", "n"], ["e", "w"], ["w", "e"],
  ];
  for (const [sa, sb] of pairs) {
    const A = ea[sa], B = eb[sb];
    const horiz = Math.abs(A.z1 - A.z2) < 1e-6 && Math.abs(B.z1 - B.z2) < 1e-6 && Math.abs(A.z1 - B.z1) < 0.08;
    const vert = Math.abs(A.x1 - A.x2) < 1e-6 && Math.abs(B.x1 - B.x2) < 1e-6 && Math.abs(A.x1 - B.x1) < 0.08;
    if (horiz) {
      const ov = overlap1D(A.x1, A.x2, B.x1, B.x2);
      if (ov) return { x1: ov[0], z1: A.z1, x2: ov[1], z2: A.z1, len: ov[1] - ov[0], axis: "x" };
    }
    if (vert) {
      const ov = overlap1D(A.z1, A.z2, B.z1, B.z2);
      if (ov) return { x1: A.x1, z1: ov[0], x2: A.x1, z2: ov[1], len: ov[1] - ov[0], axis: "z" };
    }
  }
  return null;
}

function alongOnSeg(seg, along, width) {
  const dx = seg.x2 - seg.x1, dz = seg.z2 - seg.z1;
  const len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  const t0 = Math.max(0, along);
  const t1 = Math.min(len, along + width);
  return {
    x1: seg.x1 + ux * t0, z1: seg.z1 + uz * t0,
    x2: seg.x1 + ux * t1, z2: seg.z1 + uz * t1,
    t0, t1, len, ux, uz,
  };
}

function resolveOpenings() {
  const list = [];
  for (const op of OPENINGS) {
    if (op.from && op.to) {
      const a = roomById(op.from), b = roomById(op.to);
      if (!a || !b) continue;
      const seg = sharedEdge(a, b);
      if (!seg) continue;
      const width = op.width ?? Math.max(2.5, seg.len - 0.8);
      const along = op.along ?? Math.max(0, (seg.len - width) / 2);
      const iv = alongOnSeg(seg, along, width);
      list.push({ ...op, ...iv, seg, y0: 0, y1: op.type === "open" || op.type === "slider" ? PLAN.wallH : (op.height ?? F(6, 8)) });
    } else if (op.room) {
      const r = roomById(op.room);
      if (!r) continue;
      const seg = roomEdges(r)[op.side];
      const iv = alongOnSeg(seg, op.along ?? 0, op.width);
      const y0 = op.sill ?? 0;
      const y1 = (op.sill ?? 0) + (op.height ?? PLAN.wallH);
      list.push({ ...op, ...iv, seg, y0, y1 });
    }
  }
  return list;
}

const OPEN = resolveOpenings();

function openingsOnSeg(x1, z1, x2, z2) {
  const [cx1, cz1, cx2, cz2] = canon(x1, z1, x2, z2);
  const horiz = Math.abs(cz1 - cz2) < 1e-6;
  const hits = [];
  for (const op of OPEN) {
    const [ox1, oz1, ox2, oz2] = canon(op.x1, op.z1, op.x2, op.z2);
    if (horiz) {
      if (Math.abs(oz1 - cz1) > 0.12) continue;
      const ov = overlap1D(cx1, cx2, ox1, ox2);
      if (ov) hits.push({ ...op, a: ov[0], b: ov[1] });
    } else {
      if (Math.abs(ox1 - cx1) > 0.12) continue;
      const ov = overlap1D(cz1, cz2, oz1, oz2);
      if (ov) hits.push({ ...op, a: ov[0], b: ov[1] });
    }
  }
  hits.sort((p, q) => p.a - q.a);
  return hits;
}

// Unique wall segments (interior merged, open sides skipped)
function buildWalls() {
  const raw = [];
  for (const r of ROOMS) {
    const e = roomEdges(r);
    for (const side of ["n", "e", "s", "w"]) {
      if (r.open?.includes(side)) continue;
      const s = e[side];
      raw.push({ ...s, room: r, side, interior: false });
    }
  }
  // split at T-junctions
  const pts = [];
  for (const s of raw) {
    pts.push([s.x1, s.z1], [s.x2, s.z2]);
  }
  const uniq = [];
  const keyp = (x, z) => `${x.toFixed(2)},${z.toFixed(2)}`;
  const seenp = new Set();
  for (const [x, z] of pts) {
    const k = keyp(x, z);
    if (!seenp.has(k)) { seenp.add(k); uniq.push([x, z]); }
  }
  const split = [];
  for (const s of raw) {
    const horiz = Math.abs(s.z1 - s.z2) < 1e-6;
    const cuts = [0, Math.hypot(s.x2 - s.x1, s.z2 - s.z1)];
    const len = cuts[1] || 1;
    const ux = (s.x2 - s.x1) / len, uz = (s.z2 - s.z1) / len;
    for (const [x, z] of uniq) {
      if (horiz) {
        if (Math.abs(z - s.z1) < 0.08 && x > Math.min(s.x1, s.x2) + 0.05 && x < Math.max(s.x1, s.x2) - 0.05)
          cuts.push(Math.abs(x - s.x1));
      } else if (Math.abs(x - s.x1) < 0.08 && z > Math.min(s.z1, s.z2) + 0.05 && z < Math.max(s.z1, s.z2) - 0.05) {
        cuts.push(Math.abs(z - s.z1));
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      if (cuts[i + 1] - cuts[i] < 0.08) continue;
      split.push({
        x1: s.x1 + ux * cuts[i], z1: s.z1 + uz * cuts[i],
        x2: s.x1 + ux * cuts[i + 1], z2: s.z1 + uz * cuts[i + 1],
        room: s.room, side: s.side,
      });
    }
  }
  // dedupe overlapping segments (shared interior walls)
  const used = new Array(split.length).fill(false);
  const walls = [];
  for (let i = 0; i < split.length; i++) {
    if (used[i]) continue;
    const A = split[i];
    const [ax1, az1, ax2, az2] = canon(A.x1, A.z1, A.x2, A.z2);
    let interior = false;
    for (let j = i + 1; j < split.length; j++) {
      if (used[j]) continue;
      const B = split[j];
      const [bx1, bz1, bx2, bz2] = canon(B.x1, B.z1, B.x2, B.z2);
      const sameH = Math.abs(az1 - az2) < 1e-6 && Math.abs(bz1 - bz2) < 1e-6 && Math.abs(az1 - bz1) < 0.08;
      const sameV = Math.abs(ax1 - ax2) < 1e-6 && Math.abs(bx1 - bx2) < 1e-6 && Math.abs(ax1 - bx1) < 0.08;
      if ((sameH && Math.abs(ax1 - bx1) < 0.08 && Math.abs(ax2 - bx2) < 0.08) ||
          (sameV && Math.abs(az1 - bz1) < 0.08 && Math.abs(az2 - bz2) < 0.08)) {
        used[j] = true;
        interior = true;
      }
    }
    used[i] = true;
    walls.push({ x1: ax1, z1: az1, x2: ax2, z2: az2, interior });
  }
  return walls;
}

const WALLS = buildWalls();

// -------------------------- particle / line buffers --------------------------
const pos = [], col = [], siz = [];
const lpos = [], lcol = [];

function addPt(x, y, z, color, size = 1) {
  pos.push(x, y, z);
  col.push(color.r, color.g, color.b);
  siz.push(size);
}
function addLn(x1, y1, z1, x2, y2, z2, color) {
  lpos.push(x1, y1, z1, x2, y2, z2);
  lcol.push(color.r, color.g, color.b, color.r, color.g, color.b);
}

function lerpColor(a, b, t) {
  const c = a.clone().lerp(b, Math.min(1, Math.max(0, t)));
  return c;
}

function segIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const rx = bx - ax, rz = bz - az;
  const sx = dx - cx, sz = dz - cz;
  const den = rx * sz - rz * sx;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((cx - ax) * sz - (cz - az) * sx) / den;
  const u = ((cx - ax) * rz - (cz - az) * rx) / den;
  if (t <= 0.008 || t >= 0.992 || u <= 0.0 || u >= 1.0) return null;
  return { x: ax + t * rx, z: az + t * rz, t };
}

function wallsCrossed(x0, z0, x1, z1) {
  let interior = 0, exterior = 0, openings = 0, windows = 0;
  for (const w of WALLS) {
    const hit = segIntersect(x0, z0, x1, z1, w.x1, w.z1, w.x2, w.z2);
    if (!hit) continue;
    // Ignore the wall an in-wall AP is mounted on.
    if (Math.hypot(hit.x - x0, hit.z - z0) < 0.85) continue;
    const op = holeAt(hit.x, hit.z, F(4, 6), w.x1, w.z1, w.x2, w.z2);
    if (op) {
      if (op.type === "window" || op.type === "garage") windows++;
      else openings++;
    } else if (w.interior) {
      interior++;
    } else {
      exterior++;
    }
  }
  return { interior, exterior, openings, windows };
}

function inHouse(x, z) {
  return pointInPoly(x, z, EAVE);
}

function inPorch(x, z) {
  return x > F(23) - 0.4 && x < F(30, 8) + 0.4 && z > -0.4 && z < F(8) + 0.4;
}

function coverageAt(x, y, z) {
  let s = 0;
  for (const ap of APS) {
    const d = Math.hypot(x - ap.x, (y - ap.y) * 0.25, z - ap.z);
    const w = wallsCrossed(ap.x, ap.z, x, z);
    const atten = Math.pow(0.84, w.interior)
      * Math.pow(0.64, w.exterior)
      * Math.pow(0.93, w.windows)
      * Math.pow(0.97, w.openings);
    const raw = Math.max(0, 1 - Math.pow(Math.min(1, d / (ap.radius * 1.2)), 1.12));
    s = Math.max(s, raw * atten);
  }
  if (inHouse(x, z)) {
    // Almost uniform strong interior, matching the UniFi 5 GHz map.
    s = 0.80 + 0.20 * Math.min(1, s);
    // Garage's far right edge is a touch weaker, as in the heatmap.
    if (x > 42 && z < 26) s *= 0.84;
  } else if (inPatio(x, z) || inPorch(x, z)) {
    s = 0.58 + 0.32 * Math.min(1, s);
  } else {
    s *= 1.08;
  }
  return Math.pow(Math.min(1, Math.max(0, s)), 0.9);
}

function coverageColor(cov, out = new THREE.Color()) {
  if (cov <= 0.02) return out.set("#5B1A22").multiplyScalar(0);
  if (cov < 0.28) {
    const t = cov / 0.28;
    out.set("#5B1A22").lerp(new THREE.Color("#8A3A28"), t);
    return out;
  }
  if (cov < 0.55) {
    const t = (cov - 0.28) / 0.27;
    out.set("#8A3A28").lerp(GOLD, t);
    return out;
  }
  const t = (cov - 0.55) / 0.45;
  return out.set(GOLD).lerp(GOLD_LT, t);
}

function holeAt(x, z, y, x1, z1, x2, z2) {
  const horiz = Math.abs(z1 - z2) < 1e-6;
  const ops = openingsOnSeg(x1, z1, x2, z2);
  const u = horiz ? x : z;
  for (const op of ops) {
    if (u < op.a - 0.02 || u > op.b + 0.02) continue;
    if (op.type === "arch") {
      const mid = (op.a + op.b) / 2;
      const rad = (op.b - op.a) / 2;
      const spring = (op.y1 ?? F(8, 6)) - rad;
      const dx = u - mid;
      const archY = spring + Math.sqrt(Math.max(0, rad * rad - dx * dx));
      if (y <= archY + 0.05) return op;
    } else if (y >= (op.y0 ?? 0) - 0.02 && y <= (op.y1 ?? PLAN.wallH) + 0.02) {
      return op;
    }
  }
  return null;
}

function fillWall(x1, z1, x2, z2, interior) {
  const len = Math.hypot(x2 - x1, z2 - z1);
  if (len < 0.08) return;
  const ux = (x2 - x1) / len, uz = (z2 - z1) / len;
  const sp = interior ? 0.28 : 0.22;
  const base = interior ? CREAM.clone().multiplyScalar(0.72) : CREAM.clone();
  const wainscot = CREAM.clone().lerp(new THREE.Color("#8a6a4a"), 0.45).multiplyScalar(0.7);
  for (let s = 0; s <= len + 1e-6; s += sp) {
    for (let y = 0; y <= PLAN.wallH + 1e-6; y += sp) {
      if (holeAt((x1 + ux * s), (z1 + uz * s), y, x1, z1, x2, z2)) continue;
      const jx = (rand() - 0.5) * sp * 0.28;
      const jy = (rand() - 0.5) * sp * 0.28;
      const jz = (rand() - 0.5) * sp * 0.28;
      const x = x1 + ux * s + jx, yy = y + jy, z = z1 + uz * s + jz;
      const tint = coverageAt(x, yy, z) * (interior ? 0.35 : 0.12);
      let c = lerpColor(base, GOLD, tint);
      if (!interior && y < PLAN.wainscotH) c = lerpColor(wainscot, GOLD, tint * 0.5);
      const edge = s < sp * 0.6 || s > len - sp * 0.6 || y < sp * 0.6 || y > PLAN.wallH - sp * 0.6;
      addPt(x, yy, z, c, edge ? 1.25 : 1);
    }
  }
  // plate / corner lines
  const lc = interior ? CREAM.clone().multiplyScalar(0.35) : CREAM.clone().multiplyScalar(0.55);
  addLn(x1, 0, z1, x2, 0, z2, lc);
  addLn(x1, PLAN.wallH, z1, x2, PLAN.wallH, z2, lc);
  addLn(x1, 0, z1, x1, PLAN.wallH, z1, lc);
  addLn(x2, 0, z2, x2, PLAN.wallH, z2, lc);
  // opening frames
  const ops = openingsOnSeg(x1, z1, x2, z2);
  const horiz = Math.abs(z1 - z2) < 1e-6;
  for (const op of ops) {
    const frame = (op.type === 'arch' || op.type === 'garage') ? GOLD.clone() : GOLD_LT.clone().multiplyScalar(0.55);
    const p = (u, y) => horiz ? [u, y, z1] : [x1, y, u];
    const [ax, ay, az] = p(op.a, op.y0 ?? 0);
    const [bx, by, bz] = p(op.b, op.y0 ?? 0);
    const [cx, cy, cz] = p(op.b, op.y1 ?? PLAN.wallH);
    const [dx, dy, dz] = p(op.a, op.y1 ?? PLAN.wallH);
    if (op.type !== "arch" && op.type !== "open" && (op.y0 ?? 0) > 0.1) addLn(ax, ay, az, bx, by, bz, frame);
    if (op.type !== "open") {
      addLn(bx, by, bz, cx, cy, cz, frame);
      addLn(dx, dy, dz, ax, ay, az, frame);
      if (op.type !== "arch") addLn(dx, dy, dz, cx, cy, cz, frame);
    }
    if (op.type === "arch") {
      const mid = (op.a + op.b) / 2, rad = (op.b - op.a) / 2;
      const spring = (op.y1 ?? F(8, 6)) - rad;
      let px, py, pz;
      for (let i = 0; i <= 16; i++) {
        const ang = Math.PI - (i / 16) * Math.PI;
        const u = mid + Math.cos(ang) * rad;
        const y = spring + Math.sin(ang) * rad;
        const q = p(u, y);
        if (i) addLn(px, py, pz, q[0], q[1], q[2], frame);
        [px, py, pz] = q;
      }
    }
  }
}

function fillFloor(r) {
  const sp = 0.32;
  const inset = 0.15;
  for (let x = r.x + inset; x <= r.x + r.w - inset + 1e-6; x += sp) {
    for (let z = r.z + inset; z <= r.z + r.d - inset + 1e-6; z += sp) {
      const jx = (rand() - 0.5) * sp * 0.3, jz = (rand() - 0.5) * sp * 0.3;
      const cov = coverageAt(x, 0.05, z);
      const base = r.id === "patio" || r.id === "porch" || r.id === "stoop" || r.id === "garage"
        ? CREAM.clone().multiplyScalar(0.45)
        : CREAM.clone().multiplyScalar(0.55);
      addPt(x + jx, 0.04, z + jz, lerpColor(base, GOLD_LT, cov * 0.72), 0.95);
    }
  }
  // room floor grid, every 2'
  const gc = CREAM.clone().multiplyScalar(0.16);
  const x0 = r.x + inset, x1 = r.x + r.w - inset, z0 = r.z + inset, z1 = r.z + r.d - inset;
  for (let x = Math.ceil(x0); x <= x1; x += 2) addLn(x, 0.03, z0, x, 0.03, z1, gc);
  for (let z = Math.ceil(z0); z <= z1; z += 2) addLn(x0, 0.03, z, x1, 0.03, z, gc);
}

function fillBox(x, y0, z, w, h, d, color, sp = 0.22) {
  for (let px = x; px <= x + w + 1e-6; px += sp) {
    for (let py = y0; py <= y0 + h + 1e-6; py += sp) {
      for (const [qx, qz, face] of [[px, z, true], [px, z + d, true]]) {
        if (!face) continue;
        addPt(qx + (rand() - 0.5) * 0.04, py, qz + (rand() - 0.5) * 0.04, color, 1);
      }
    }
  }
  for (let pz = z; pz <= z + d + 1e-6; pz += sp) {
    for (let py = y0; py <= y0 + h + 1e-6; py += sp) {
      addPt(x + (rand() - 0.5) * 0.04, py, pz, color, 1);
      addPt(x + w + (rand() - 0.5) * 0.04, py, pz, color, 1);
    }
  }
  for (let px = x; px <= x + w + 1e-6; px += sp) {
    for (let pz = z; pz <= z + d + 1e-6; pz += sp) {
      addPt(px, y0 + h, pz, color, 1);
    }
  }
  const lc = color.clone().multiplyScalar(0.8);
  const cnr = [
    [x, y0, z], [x + w, y0, z], [x + w, y0, z + d], [x, y0, z + d],
    [x, y0 + h, z], [x + w, y0 + h, z], [x + w, y0 + h, z + d], [x, y0 + h, z + d],
  ];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  for (const [i, j] of edges) addLn(...cnr[i], ...cnr[j], lc);
}

function pointInPoly(x, z, poly) {
  let n = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    const hit = (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi + 1e-12) + xi;
    if (hit) n++;
  }
  return n % 2 === 1;
}

function distToSeg(px, pz, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1;
  const l2 = dx * dx + dz * dz || 1;
  let t = ((px - x1) * dx + (pz - z1) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), pz - (z1 + t * dz));
}

function distToPoly(x, z, poly) {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    d = Math.min(d, distToSeg(x, z, poly[j][0], poly[j][1], poly[i][0], poly[i][1]));
  }
  return d;
}

const EAVE = [
  [0, 0], [F(23), 0],
  [F(23), F(8)], [F(30, 8), F(8)],
  [F(30, 8), 0], [F(50), 0],
  [F(50), F(67, 9)],
  [F(32, 1.5), F(67, 9)], [F(32, 1.5), F(57, 9)],
  [F(14, 1.5), F(57, 9)], [F(14, 1.5), F(67, 9)],
  [0, F(67, 9)],
];

function inPatio(x, z) {
  return x > F(14, 1.5) + 0.2 && x < F(32, 1.5) - 0.2 && z > F(57, 9) + 0.2 && z < F(67, 9) + 0.2;
}
function inGable(x, z) {
  return x >= -0.2 && x <= F(23) + 0.2 && z >= -0.2 && z <= F(18) + 0.2;
}

function roofY(x, z) {
  if (inPatio(x, z)) return PATIO.beamH + 0.35;
  if (inGable(x, z)) {
    const run = Math.abs(x - F(11, 6));
    return PLAN.wallH + Math.max(0, F(11, 6) - run) * PLAN.roofPitch;
  }
  if (!pointInPoly(x, z, EAVE) && distToPoly(x, z, EAVE) > PLAN.eaveOverhang + 0.2) return null;
  const d = pointInPoly(x, z, EAVE) ? distToPoly(x, z, EAVE) : 0;
  return PLAN.wallH + d * (4 / 12);
}

function fillGableFace(zFace) {
  const x0 = 0, x1 = F(23), ridge = F(11, 6);
  const sp = 0.2;
  const c = CREAM.clone();
  for (let x = x0; x <= x1 + 1e-6; x += sp) {
    const yTop = PLAN.wallH + Math.max(0, ridge - Math.abs(x - ridge)) * PLAN.roofPitch;
    for (let y = PLAN.wallH; y <= yTop + 1e-6; y += sp) {
      // two small attic vents near the peak, as in front.jpg
      const dx = Math.abs(x - ridge);
      if (y > yTop - 1.4 && y < yTop - 0.45 && dx > 0.7 && dx < 1.6) continue;
      addPt(x + (rand() - 0.5) * 0.05, y, zFace + (rand() - 0.5) * 0.03, c, 1.15);
    }
  }
  const ev = CREAM.clone().multiplyScalar(0.7);
  const peak = PLAN.wallH + ridge * PLAN.roofPitch;
  addLn(x0, PLAN.wallH, zFace, ridge, peak, zFace, ev);
  addLn(x1, PLAN.wallH, zFace, ridge, peak, zFace, ev);
  addLn(x0, PLAN.wallH, zFace, x1, PLAN.wallH, zFace, ev);
}

function fillRoof() {
  const sp = 0.38;
  const c = CREAM.clone().multiplyScalar(0.7);
  const xmin = -PLAN.eaveOverhang, xmax = PLAN.width + PLAN.eaveOverhang;
  const zmin = -PLAN.eaveOverhang, zmax = PLAN.depth + PLAN.eaveOverhang;
  for (let x = xmin; x <= xmax; x += sp) {
    for (let z = zmin; z <= zmax; z += sp) {
      const y = roofY(x, z);
      if (y == null) continue;
      if (inPatio(x, z)) continue;
      const j = (rand() - 0.5) * sp * 0.25;
      addPt(x + j, y + (rand() - 0.5) * 0.04, z + j, c, 0.85);
    }
  }
  const ev = CREAM.clone().multiplyScalar(0.55);
  // eave line at wallH
  for (let i = 0, j = EAVE.length - 1; i < EAVE.length; j = i++) {
    const a = EAVE[j], b = EAVE[i];
    addLn(a[0], PLAN.wallH, a[1], b[0], PLAN.wallH, b[1], ev);
  }
  // gable ridge + rakes
  const gy = PLAN.wallH + F(11, 6) * PLAN.roofPitch;
  addLn(F(11, 6), gy, 0, F(11, 6), gy, F(18), GOLD.clone().multiplyScalar(0.45));
  addLn(0, PLAN.wallH, 0, F(11, 6), gy, 0, ev);
  addLn(F(23), PLAN.wallH, 0, F(11, 6), gy, 0, ev);
  // a few faint truss outlines in the attic, every 4' along the gable and main spine
  const tc = CREAM.clone().multiplyScalar(0.18);
  for (let z = 2; z < F(18); z += 4) {
    addLn(0, PLAN.wallH, z, F(11, 6), gy, z, tc);
    addLn(F(23), PLAN.wallH, z, F(11, 6), gy, z, tc);
    addLn(0, PLAN.wallH, z, F(23), PLAN.wallH, z, tc);
  }
}

function fillPatio() {
  const { x, z, w, d, beamH, beamSize: bs, joistCount, posts } = PATIO;
  const beam = GOLD.clone().lerp(CREAM, 0.35);
  // header at the north opening
  fillBox(x, beamH - bs, z + d - bs, w, bs, bs, beam, 0.18);
  // ledger on the living (south) wall
  fillBox(x, beamH - bs, z, w, bs, bs, beam, 0.18);
  // joists spanning south to north
  for (let i = 1; i < joistCount - 1; i++) {
    const px = x + (w * i) / (joistCount - 1) - bs / 2;
    fillBox(px, beamH - bs * 0.7, z, bs * 0.7, bs * 0.7, d, beam, 0.2);
  }
  // posts
  for (const [px, pz] of posts) {
    fillBox(px - 0.2, 0, pz - 0.2, 0.4, beamH, 0.4, beam, 0.16);
  }
}

function fillGround() {
  const gc = new THREE.Color("#3E1116").lerp(CREAM, 0.14);
  const major = gc.clone().multiplyScalar(1.25);
  const pad = 24;
  for (let x = -pad; x <= PLAN.width + pad; x += 1) {
    const c = x % 5 === 0 ? major : gc.clone().multiplyScalar(0.55);
    addLn(x, -0.01, -pad, x, -0.01, PLAN.depth + pad, c);
  }
  for (let z = -pad; z <= PLAN.depth + pad; z += 1) {
    const c = z % 5 === 0 ? major : gc.clone().multiplyScalar(0.55);
    addLn(-pad, -0.01, z, PLAN.width + pad, -0.01, z, c);
  }
  // driveway in front of the garage
  const dc = CREAM.clone().multiplyScalar(0.2);
  const gx0 = F(30, 8) - 0.5, gx1 = F(50) + 2, gz0 = -16, gz1 = 0;
  for (let x = gx0; x <= gx1; x += 0.5) addLn(x, 0.01, gz0, x, 0.01, gz1, dc);
  for (let z = gz0; z <= gz1; z += 0.5) addLn(gx0, 0.01, z, gx1, 0.01, z, dc);
}

function fillCable() {
  const c = GOLD.clone();
  for (let i = 0; i < CABLE.length - 1; i++) {
    const a = CABLE[i], b = CABLE[i + 1];
    addLn(a.x, a.y, a.z, b.x, b.y, b.z, c);
    addLn(a.x, a.y + 0.04, a.z, b.x, b.y + 0.04, b.z, GOLD_LT);
  }
  for (const drop of CABLE_DROPS) {
    addLn(drop.from.x, drop.from.y, drop.from.z, drop.to.x, drop.to.y, drop.to.z, c);
    addLn(drop.from.x, drop.from.y + 0.04, drop.from.z, drop.to.x, drop.to.y + 0.04, drop.to.z, GOLD_LT);
  }
}


function makeCoverageTexture() {
  const pad = 26;
  const xmin = -pad, xmax = PLAN.width + pad;
  const zmin = -pad, zmax = PLAN.depth + pad;
  const worldW = xmax - xmin, worldD = zmax - zmin;
  const W = 640, H = 640;
  const src = document.createElement("canvas");
  src.width = W; src.height = H;
  const img = src.getContext("2d").createImageData(W, H);
  const data = img.data;
  const gold = [0xE8, 0xC8, 0x77];
  const goldD = [0xD4, 0xA4, 0x41];
  const maroon = [0x5B, 0x1A, 0x22];
  const mid = [0x8A, 0x3A, 0x28];
  function lerp(a, b, t) {
    t = Math.min(1, Math.max(0, t));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }
  for (let j = 0; j < H; j++) {
    const z = zmax - (j + 0.5) / H * worldD;
    for (let i = 0; i < W; i++) {
      const x = xmin + (i + 0.5) / W * worldW;
      const cov = coverageAt(x, 3.0, z);
      let rgb, a;
      if (cov < 0.05) {
        rgb = maroon; a = cov / 0.05 * 28;
      } else if (cov < 0.22) {
        const t = (cov - 0.05) / 0.17;
        rgb = lerp(maroon, mid, t);
        a = 36 + t * 55;
      } else if (cov < 0.50) {
        const t = (cov - 0.22) / 0.28;
        rgb = lerp(mid, goldD, t);
        a = 91 + t * 70;
      } else {
        const t = (cov - 0.50) / 0.50;
        rgb = lerp(goldD, gold, t);
        a = 161 + t * 50;
      }
      const o = (j * W + i) * 4;
      data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = Math.min(200, a);
    }
  }
  src.getContext("2d").putImageData(img, 0, 0);
  // Soft blur for contour-like bands, UniFi-style but in gold/maroon.
  const out = document.createElement("canvas");
  out.width = W; out.height = H;
  const ctx = out.getContext("2d");
  ctx.filter = "blur(6px)";
  ctx.drawImage(src, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return { tex, xmin, xmax, zmin, zmax, worldW, worldD };
}

function addCoverageField(scene) {
  const { tex, xmin, xmax, zmin, zmax, worldW, worldD } = makeCoverageTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldW, worldD), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((xmin + xmax) / 2, 0.02, (zmin + zmax) / 2);
  mesh.renderOrder = -1;
  scene.add(mesh);
  return mesh;
}

// Build house
for (const w of WALLS) fillWall(w.x1, w.z1, w.x2, w.z2, w.interior);
for (const r of ROOMS) fillFloor(r);
for (const f of FURNITURE) fillBox(f.x, 0, f.z, f.w, f.h, f.d, CREAM.clone().multiplyScalar(0.8), 0.2);
fillGableFace(0);
fillRoof();
fillPatio();
fillGround();
fillCable();

// -------------------------- renderer / scene --------------------------
const canvas = document.getElementById("house-canvas");
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: false, preserveDrawingBuffer: false,
});
const stage = canvas.parentElement;
const dprCap = 1.5;
function stageSize() {
  const r = stage.getBoundingClientRect();
  return { w: Math.max(1, Math.round(r.width)), h: Math.max(1, Math.round(r.height)) };
}
const pr0 = Math.min(devicePixelRatio || 1, dprCap);
renderer.setPixelRatio(pr0);
renderer.setSize(stageSize().w, stageSize().h, false);
renderer.setClearColor(BG, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(BG, 0.0075);

const camera = new THREE.PerspectiveCamera(38, stageSize().w / stageSize().h, 0.3, 400);
const target = new THREE.Vector3(25, 2.2, 32);
const hero = { az: 0.40, pol: 1.10, dist: 88 };
let az = hero.az, pol = hero.pol, dist = hero.dist;

function applyCam() {
  camera.position.set(
    target.x + dist * Math.sin(pol) * Math.sin(az),
    target.y + dist * Math.cos(pol),
    target.z - dist * Math.sin(pol) * Math.cos(az)
  );
  camera.lookAt(target);
}
applyCam();

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = !REDUCED;
controls.dampingFactor = 0.08;
controls.target.copy(target);
controls.autoRotate = false;
controls.autoRotateSpeed = 0.28;
controls.enableRotate = false;
controls.enableZoom = false;
controls.enablePan = false;
controls.enableDamping = !REDUCED;

const pointGeo = new THREE.BufferGeometry();
pointGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
pointGeo.setAttribute("aColor", new THREE.Float32BufferAttribute(col, 3));
pointGeo.setAttribute("aSize", new THREE.Float32BufferAttribute(siz, 1));

const uniforms = {
  uPixelRatio: { value: pr0 },
  uSize: { value: 8.0 },
  uTime: { value: 0 },
  uScanZ: { value: -10 },
  uScanAmp: { value: REDUCED ? 0 : 1 },
};
const points = new THREE.Points(pointGeo, new THREE.ShaderMaterial({
  uniforms,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: /* glsl */`
    attribute vec3 aColor;
    attribute float aSize;
    uniform float uPixelRatio, uSize, uScanZ, uScanAmp;
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vColor = aColor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      float scan = smoothstep(1.4, 0.0, abs(position.z - uScanZ)) * uScanAmp;
      vColor *= 1.0 + scan * 1.2;
      vAlpha = 0.72 + scan * 0.28;
      gl_PointSize = clamp(aSize * uSize * uPixelRatio * (45.0 / -mv.z), 0.6, 5.0);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vColor;
    varying float vAlpha;
    void main() {
      vec2 uv = gl_PointCoord * 2.0 - 1.0;
      float d = dot(uv, uv);
      if (d > 1.0) discard;
      float a = pow(1.0 - d, 1.55) * vAlpha;
      if (a < 0.035) discard;
      gl_FragColor = vec4(vColor, a);
    }`,
}));
scene.add(points);

const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lpos, 3));
lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(lcol, 3));
const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
  vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false,
}));
scene.add(lines);
addCoverageField(scene);

// -------------------------- hotspots --------------------------
function makeGlowTex() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(232,200,119,1)");
  grd.addColorStop(0.25, "rgba(212,164,65,0.7)");
  grd.addColorStop(0.55, "rgba(212,164,65,0.18)");
  grd.addColorStop(1, "rgba(212,164,65,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowTex = makeGlowTex();
const hotspotGroup = new THREE.Group();
scene.add(hotspotGroup);
const ripples = [];

for (const ap of APS) {
  const g = new THREE.Group();
  g.position.set(ap.x, ap.y, ap.z);
  g.userData.ap = ap;
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xe8c877, transparent: true, opacity: 0.95 })
  );
  g.add(core);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, color: 0xd4a441, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sprite.scale.set(4.6, 4.6, 1);
  g.add(sprite);
  // Tight glow sphere — the yard field carries the coverage story.
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 28, 20),
    new THREE.MeshBasicMaterial({
      color: 0xd4a441, transparent: true, opacity: 0.07,
      depthWrite: false, side: THREE.DoubleSide,
    })
  );
  g.add(sphere);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 1.72, 64),
    new THREE.MeshBasicMaterial({ color: 0xd4a441, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  g.add(ring);
  for (let i = 0; i < 2; i++) {
    const rip = new THREE.Mesh(
      new THREE.RingGeometry(0.4, 0.48, 64),
      new THREE.MeshBasicMaterial({ color: 0xe8c877, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false })
    );
    rip.rotation.x = -Math.PI / 2;
    rip.userData.phase = i * 0.5;
    rip.userData.max = 7;
    g.add(rip);
    ripples.push(rip);
  }
  hotspotGroup.add(g);
}

// -------------------------- labels --------------------------
const labelRoot = document.getElementById("house-labels");
const apLabels = APS.map((ap) => {
  const el = document.createElement("div");
  el.className = "label label-ap";
  el.innerHTML = `<span class="led"></span><span>${ap.label}</span>`;
  labelRoot.appendChild(el);
  return { el, ap, offset: ap.id === "hall" ? [0, 2.2] : [0, 1.8] };
});
const roomLabels = ROOMS.filter((r) => !["hall-front", "hall-mid", "hall-north", "wic3", "wic2", "wic-pri", "vestibule", "stoop"].includes(r.id)).map((r) => {
  const el = document.createElement("div");
  el.className = "label label-room";
  el.textContent = r.name;
  labelRoot.appendChild(el);
  return { el, r, cx: r.x + r.w / 2, cy: 0.4, cz: r.z + r.d / 2 };
});
const cableLabel = document.createElement("div");
cableLabel.className = "label label-cable";
cableLabel.textContent = "Cat6A run · attic";
labelRoot.appendChild(cableLabel);
const cableMid = CABLE[2];

const v = new THREE.Vector3();
function project(x, y, z) {
  v.set(x, y, z).project(camera);
  const visible = v.z < 1 && v.x > -1.15 && v.x < 1.15 && v.y > -1.2 && v.y < 1.2;
  return {
    x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-v.y * 0.5 + 0.5) * canvas.clientHeight,
    visible,
  };
}
function placeLabel(el, x, y, z, ox = 0, oy = 0) {
  const p = project(x, y, z);
  el.style.display = p.visible ? "flex" : "none";
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const hw = (el.offsetWidth || 120) / 2, hh = 16;
  const lx = Math.max(hw + 8, Math.min(w - hw - 8, p.x + ox));
  const ly = Math.max(hh + 8, Math.min(h - 24, p.y + oy));
  el.style.left = lx + "px";
  el.style.top = ly + "px";
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const floorMeshes = ROOMS.map((r) => {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(r.w, r.d),
    new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(r.x + r.w / 2, 0.1, r.z + r.d / 2);
  m.userData.roomId = r.id;
  scene.add(m);
  return m;
});

let hoverId = null;
const yawEl = document.getElementById("yaw");
const pitchEl = document.getElementById("pitch");
const scanEl = document.getElementById("scan");

function hud() {
  for (const L of apLabels) {
    const ox = L.ap.id === "living" ? 2.8 : -2.2;
    const oz = L.ap.id === "living" ? 4.2 : -3.6;
    placeLabel(L.el, L.ap.x + ox, L.ap.y + 1.2, L.ap.z + oz, 0, 0);
  }
  for (const L of roomLabels) {
    L.el.classList.toggle("on", hoverId === L.r.id);
    placeLabel(L.el, L.cx, L.cy, L.cz, 0, 18);
  }
  placeLabel(cableLabel, cableMid.x, cableMid.y + 0.4, cableMid.z, 0, -8);
  const showCable = ["entry","living","laundry","kitchen","hall-front","hall-mid","hall-north","bdrm2"].includes(hoverId);
  cableLabel.style.opacity = showCable ? "0.9" : "0.0";
}

let start = performance.now();
let frozen = REDUCED ? 1.6 : null;
let playing = true;

function setTime(t) {
  uniforms.uTime.value = t;
  const scanZ = (t * 6) % (PLAN.depth + 16) - 8;
  uniforms.uScanZ.value = REDUCED ? PLAN.depth * 0.35 : scanZ;
  if (!REDUCED) {
    const pulse = 1 + Math.sin(t * 2.2) * 0.12;
    hotspotGroup.children.forEach((g) => {
      const spr = g.children[1];
      if (spr) spr.scale.setScalar(4.6 * pulse);
    });
    for (const rip of ripples) {
      const u = ((t * 0.22 + rip.userData.phase) % 1);
      const rad = 0.6 + u * rip.userData.max;
      rip.scale.setScalar(rad / 0.44);
      rip.material.opacity = (1 - u) * 0.32;
    }
  } else {
    for (const rip of ripples) rip.material.opacity = 0.08;
  }
}

function setView(v) {
  if (v.az != null) az = v.az;
  if (v.pol != null) pol = v.pol;
  if (v.dist != null) dist = v.dist;
  if (v.target) target.set(v.target.x, v.target.y, v.target.z);
  controls.autoRotate = false;
  controls.enableDamping = false;
  controls.target.copy(target);
  applyCam();
}

function frame() {
  renderer.render(scene, camera);
  hud();
}

let onScreen = true;
const io = new IntersectionObserver((entries) => {
  onScreen = entries.some((e) => e.isIntersecting);
}, { threshold: 0.02 });
io.observe(stage);

function loop(now) {
  if (!playing || document.hidden || !onScreen) {
    requestAnimationFrame(loop);
    return;
  }
  const t = frozen != null ? frozen : (now - start) / 1000;
  if (frozen == null && !REDUCED) controls.update();
  setTime(t);
  frame();
  requestAnimationFrame(loop);
}

function resize() {
  const { w, h } = stageSize();
  camera.aspect = w / h;
  // Keep the plan on the open side of the hero so the headline stays clear.
  const shift = Math.round(w * 0.18);
  camera.setViewOffset(w, h, -shift, 0, w, h);
  camera.updateProjectionMatrix();
  const pr = Math.min(devicePixelRatio || 1, dprCap);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  uniforms.uPixelRatio.value = pr;
}
new ResizeObserver(() => resize()).observe(stage);

window.__house = {
  ready: false,
  setTime,
  setView,
  render: frame,
  freeze(t) { frozen = t; controls.autoRotate = false; controls.enableDamping = false; setTime(t); applyCam(); frame(); },
  hero() { setView(hero); frozen = 4.6; setTime(4.6); frame(); },
  pose() {
    return { az, pol, dist, target: { x: target.x, y: target.y, z: target.z },
      cam: { x: camera.position.x, y: camera.position.y, z: camera.position.z } };
  },
};

document.fonts.ready.then(() => {
  resize();
  applyCam();
  controls.target.copy(target);
  setTime(REDUCED ? 4.6 : 1.8);
  frame();
  window.__house.ready = true;
  stage.classList.add("is-live");
  if (!REDUCED) controls.autoRotate = true;
  requestAnimationFrame(loop);
});
