/**
 * Kerchunk house plan — First Floor Plan 'A-Reversed'
 * Units: feet. Origin is the exterior front-left corner of Bdrm 3
 * (street / south). +X toward the garage (east). +Z toward the
 * back patio / primary suite (north). +Y up.
 *
 * This is the one file to edit if a room, wall, window, or AP moves.
 * Rooms are axis-aligned rectangles [x, z, w, d]. Interior walls are
 * generated wherever two rooms share an edge; exterior walls wherever
 * a room edge is exposed. Openings punch doors and windows in those
 * walls. Ceiling height is 9'-0" throughout, per the plan.
 */
export const F = (ft, inch = 0) => ft + inch / 12;

export const PLAN = {
  title: "The Kerchunk house",
  subtitle: "Whole-home Wi-Fi, mapped.",
  width: F(50),
  depth: F(67, 9),
  wallH: F(9),
  wainscotH: F(2, 10),
  wallExt: 0.5,
  wallInt: 0.375,
  eaveOverhang: 1.0,
  roofPitch: 5 / 12, // 5:12, low hip / front gable as in front.jpg
};

// ---------------------------------------------------------------------------
// Rooms. Coordinates are to the outside face of exterior walls, and to
// the mid-line of shared interior walls, so adjacent rooms share edges
// exactly. Widths at the front: Bdrm 3 11'-7 1/2" + Bdrm 2 11'-4 1/2"
// = 23'-0", porch 7'-8", garage 19'-4" = 50'-0".
// ---------------------------------------------------------------------------
const X = {
  left: 0,
  bdrm32: F(11, 7.5),
  porchL: F(23),
  garageL: F(23) + F(7, 8), // 30'-8"
  patioL: F(14, 1.5),
  patioR: F(14, 1.5) + F(18), // 32'-1 1/2"  (primary / patio)
  right: F(50),
};

const Z = {
  front: 0,
  porch: F(8),
  bdrmN: F(13),
  wicN: F(18),
  ba2N: F(26),
  garageN: F(29),
  denN: F(38, 6),
  wicPriN: F(45, 6),
  kitS: F(40, 3.5), // 13 + 5 + 8 + 14'-3 1/2"
  kitN: F(40, 3.5) + F(13, 1),
  priS: F(67, 9) - F(13, 4),
  patioS: F(67, 9) - F(10),
  back: F(67, 9),
};

export const ROOMS = [
  { id: "bdrm3", name: "Bdrm 3", x: X.left, z: Z.front, w: X.bdrm32 - X.left, d: Z.bdrmN - Z.front },
  { id: "bdrm2", name: "Bdrm 2", x: X.bdrm32, z: Z.front, w: X.porchL - X.bdrm32, d: Z.bdrmN - Z.front },
  { id: "wic3", name: "W.I.C.", x: X.left, z: Z.bdrmN, w: F(6, 3.5), d: Z.wicN - Z.bdrmN },
  { id: "hall-front", name: "Hall", x: F(6, 3.5), z: Z.bdrmN, w: F(16, 8) - F(6, 3.5), d: Z.wicN - Z.bdrmN },
  { id: "wic2", name: "W.I.C.", x: F(16, 8), z: Z.bdrmN, w: X.porchL - F(16, 8), d: Z.wicN - Z.bdrmN },
  { id: "ba2", name: "Ba 2", x: X.left, z: Z.wicN, w: F(8, 6), d: Z.ba2N - Z.wicN },
  { id: "hall-mid", name: "Hall", x: F(8, 6), z: Z.wicN, w: F(16, 8) - F(8, 6), d: Z.ba2N - Z.wicN },
  { id: "laundry", name: "Laundry", x: F(16, 8), z: Z.wicN, w: X.porchL - F(16, 8), d: Z.ba2N - Z.wicN },
  { id: "bdrm4", name: "Bdrm 4", x: X.left, z: Z.ba2N, w: F(12, 11), d: Z.kitS - Z.ba2N },
  { id: "hall-north", name: "Hall", x: F(12, 11), z: Z.ba2N, w: X.porchL - F(12, 11), d: Z.kitS - Z.ba2N },
  { id: "porch", name: "Porch", x: X.porchL, z: Z.front, w: X.garageL - X.porchL, d: Z.porch - Z.front, open: ["s"] },
  { id: "entry", name: "Entry", x: X.porchL, z: Z.porch, w: X.garageL - X.porchL, d: Z.kitS - Z.porch },
  { id: "garage", name: "Garage", x: X.garageL, z: Z.front, w: X.right - X.garageL, d: Z.garageN - Z.front },
  { id: "den", name: "Den / Bdrm 5", x: X.garageL, z: Z.garageN, w: X.right - X.garageL, d: Z.denN - Z.garageN },
  { id: "wic-pri", name: "W.I.C.", x: X.patioR + F(2), z: Z.denN, w: X.right - (X.patioR + F(2)), d: Z.wicPriN - Z.denN },
  { id: "vestibule", name: "Hall", x: X.patioR, z: Z.denN, w: F(2), d: Z.priS - Z.denN },
  { id: "pbath", name: "P. Bath", x: X.patioR + F(2), z: Z.wicPriN, w: X.right - (X.patioR + F(2)), d: Z.priS - Z.wicPriN },
  { id: "kitchen", name: "Kitchen", x: X.left, z: Z.kitS, w: X.patioL - X.left, d: Z.kitN - Z.kitS },
  { id: "dining", name: "Dining", x: X.left, z: Z.kitN, w: X.patioL - X.left, d: Z.back - Z.kitN },
  { id: "living", name: "Living", x: X.patioL, z: Z.kitS, w: X.patioR - X.patioL, d: Z.patioS - Z.kitS },
  { id: "primary", name: "Primary Bdrm", x: X.patioR, z: Z.priS, w: X.right - X.patioR, d: Z.back - Z.priS },
  { id: "patio", name: "Covered Patio", x: X.patioL, z: Z.patioS, w: X.patioR - X.patioL, d: Z.back - Z.patioS, open: ["n"] },
  { id: "stoop", name: "Stoop", x: X.right, z: Z.garageN - F(3), w: F(3), d: F(3), open: ["e", "s", "n"] },
];

// Low kitchen island (particles + edges, 3' high)
export const FURNITURE = [
  { id: "island", name: "Island", x: F(7, 6), z: F(43, 6), w: F(3, 4), d: F(8, 2), h: F(3) },
];

// ---------------------------------------------------------------------------
// Openings. `room` + `side` (n/e/s/w, looking at the room) and `along`
// is the distance from the side's start (west end of an n/s wall, south
// end of an e/w wall) to the start of the opening. Or `from`/`to` for
// a door between two named rooms (centered on the shared edge if along
// is omitted).
// ---------------------------------------------------------------------------
export const OPENINGS = [
  // Front facade — matches front.jpg
  { room: "bdrm3", side: "s", type: "window", along: F(3, 10), width: F(4), sill: F(2, 6), height: F(4, 6) },
  { room: "bdrm2", side: "s", type: "window", along: F(3, 8), width: F(4), sill: F(2, 6), height: F(4, 6) },
  { room: "porch", side: "s", type: "arch", along: F(0, 8), width: F(6, 4), height: F(8, 6) },
  { room: "garage", side: "s", type: "garage", along: F(0, 11.5), width: F(16, 1), height: F(7) },

  // Porch / entry / house flow
  { from: "porch", to: "entry", type: "door", width: F(3), along: F(2, 2) },
  { from: "entry", to: "living", type: "open", width: F(6, 4) },
  { from: "entry", to: "laundry", type: "door", width: F(2, 8) },
  { from: "hall-front", to: "bdrm3", type: "door", width: F(2, 8) },
  { from: "hall-front", to: "bdrm2", type: "door", width: F(2, 8) },
  { from: "hall-front", to: "wic3", type: "door", width: F(2, 6) },
  { from: "hall-front", to: "wic2", type: "door", width: F(2, 6) },
  { from: "hall-front", to: "hall-mid", type: "open", width: F(3, 6) },
  { from: "hall-mid", to: "ba2", type: "door", width: F(2, 8) },
  { from: "hall-mid", to: "laundry", type: "door", width: F(2, 6) },
  { from: "hall-mid", to: "hall-north", type: "open", width: F(3, 6) },
  { from: "hall-north", to: "bdrm4", type: "door", width: F(2, 8) },
  { from: "hall-north", to: "entry", type: "open", width: F(3, 4) },
  { from: "hall-north", to: "kitchen", type: "open", width: F(4) },
  { from: "kitchen", to: "dining", type: "open", width: F(10) },
  { from: "kitchen", to: "living", type: "open", width: F(8) },
  { from: "living", to: "patio", type: "slider", width: F(12), along: F(3) },
  { from: "living", to: "vestibule", type: "door", width: F(2, 8) },
  { from: "vestibule", to: "primary", type: "door", width: F(2, 8) },
  { from: "vestibule", to: "pbath", type: "door", width: F(2, 8) },
  { from: "vestibule", to: "wic-pri", type: "door", width: F(2, 8) },
  { from: "den", to: "vestibule", type: "door", width: F(2, 8) },
  { from: "garage", to: "den", type: "door", width: F(2, 8), along: F(1) },
  { from: "garage", to: "stoop", type: "door", width: F(2, 8) },

  // Side / back windows (plausible, from the plan's window ticks)
  { room: "bdrm3", side: "w", type: "window", along: F(3), width: F(4), sill: F(2, 6), height: F(4, 6) },
  { room: "ba2", side: "w", type: "window", along: F(2), width: F(2, 6), sill: F(4), height: F(3) },
  { room: "bdrm4", side: "w", type: "window", along: F(4), width: F(4), sill: F(2, 6), height: F(4, 6) },
  { room: "kitchen", side: "w", type: "window", along: F(3), width: F(3, 6), sill: F(3, 6), height: F(3, 6) },
  { room: "dining", side: "w", type: "window", along: F(4), width: F(4, 6), sill: F(2, 6), height: F(4, 6) },
  { room: "dining", side: "n", type: "window", along: F(4), width: F(5), sill: F(2, 6), height: F(4, 6) },
  { room: "primary", side: "n", type: "window", along: F(2, 11.5), width: F(5), sill: F(2, 6), height: F(4, 6) },
  { room: "primary", side: "n", type: "window", along: F(11), width: F(4), sill: F(2, 6), height: F(4, 6) },
  { room: "primary", side: "e", type: "window", along: F(4), width: F(4), sill: F(2, 6), height: F(4, 6) },
  { room: "den", side: "e", type: "window", along: F(2, 6), width: F(4), sill: F(2, 6), height: F(4, 6) },
  { room: "pbath", side: "e", type: "window", along: F(2), width: F(2, 6), sill: F(4), height: F(3) },
];

// ---------------------------------------------------------------------------
// Access points and attic Cat6A run. No cameras, no rack.
// ---------------------------------------------------------------------------
export const APS = [
  {
    id: "hall",
    label: "U7 Pro XG · Hallway",
    // Ceiling of the front hall, between the two WICs, just south of Bath 2 / laundry
    // Position traced from the UniFi Design Center 5 GHz heatmap.
    x: F(13, 5),
    y: F(8, 10),
    z: F(15, 3),
    kind: "ceiling",
    radius: 44,
  },
  {
    id: "living",
    label: "U7 Pro Wall · Living room",
    // In-wall on the south living wall, just east of the kitchen
    // (the solid stretch between the kitchen corner and the entry opening).
    x: F(18, 3),
    y: F(4, 6),
    z: Z.kitS + 0.22,
    kind: "inwall",
    radius: 38,
  },
];

// Attic Cat6A run linking the two APs. Starts at the hallway AP — no rack marker.
export const CABLE = [
  { x: F(13, 5), y: F(9, 4), z: F(15, 3) },
  { x: F(13, 5), y: F(9, 4), z: Z.ba2N },
  { x: F(16, 6), y: F(9, 4), z: Z.kitS - F(1) },
  { x: F(18, 3), y: F(9, 4), z: Z.kitS - F(1) },
  { x: F(18, 3), y: F(9, 4), z: Z.kitS + F(0, 6) },
];
export const CABLE_DROPS = [
  {
    from: { x: F(13, 5), y: F(9, 4), z: F(15, 3) },
    to:   { x: F(13, 5), y: F(8, 10), z: F(15, 3) },
  },
  {
    from: { x: F(18, 3), y: F(9, 4), z: Z.kitS + F(0, 6) },
    to:   { x: F(18, 3), y: F(4, 6),  z: Z.kitS + F(0, 6) },
  },
];

// ---------------------------------------------------------------------------
// Covered patio — exposed beams, as in the backyard framing clip.
// ---------------------------------------------------------------------------
export const PATIO = {
  x: X.patioL,
  z: Z.patioS,
  w: X.patioR - X.patioL,
  d: Z.back - Z.patioS,
  beamH: F(8, 6),
  beamSize: 0.4, // 5x5-ish
  joistCount: 8,
  posts: [
    [X.patioL + 0.35, Z.back - 0.35],
    [X.patioR - 0.35, Z.back - 0.35],
  ],
};

// Front gable covers the 23' bedroom wing (front-left mass in front.jpg).
export const GABLE = {
  x: 0,
  z: 0,
  w: F(23),
  d: Z.wicN, // over bedrooms + closets
};

export const XREF = { X, Z };
