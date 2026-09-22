/** Vector hulls redrawn from Imported Artwork. Nose-up, y down. */

export const SHIP_CATALOG = [
  {
    id: "ACRP33",
    name: "ACRP33",
    hulls: [
      [0, -32, 16, -16, 10, -4, 10, 8, 6, 8, 6, 16, 8, 16, 8, 24, 6, 24, 6, 40, -6, 40, -6, 24, -8, 24, -8, 16, -6, 16, -6, 8, -10, 8, -10, -4, -16, -16],
    ],
    lines: [
      [-6, -88, -6, -28],
      [6, -88, 6, -28],
      [-30, -6, 30, -6],
    ],
    details: [
      [-4, 0, 4, 0, 4, 8, -4, 8],
      [-4, 12, 4, 12, 4, 20, -4, 20],
    ],
  },
  {
    id: "DFSB21",
    name: "DFSB21",
    hulls: [
      [
        0, -72, 5, -36, 7, -12, 8, -2, 38, -4, 40, 6, 10, 10, 9, 28, 11, 58, 6, 62, 4, 44, 0, 40, -4, 44, -6, 62, -11, 58,
        -9, 28, -10, 10, -40, 6, -38, -4, -8, -2, -7, -12, -5, -36,
      ],
    ],
    lines: [],
    details: [],
  },
  {
    id: "DSF22",
    name: "DSF22",
    hulls: [
      [
        -20, -78, -14, -78, -14, -10, -6, -22, 0, -32, 6, -22, 14, -10, 14, -78, 20, -78, 20, 58, 12, 58, 12, 30, 5, 22, 3, 40,
        -3, 40, -5, 22, -12, 30, -12, 58, -20, 58,
      ],
    ],
    lines: [
      [-40, 2, -14, 2],
      [14, 2, 40, 2],
    ],
    details: [],
  },
  {
    id: "DSF23",
    name: "DSF23",
    hulls: [
      [
        -24, -74, -12, -74, -8, -18, 0, -6, 8, -18, 12, -74, 24, -74, 30, 16, 22, 58, 10, 50, 0, 18, -10, 50, -22, 58, -30, 16,
      ],
    ],
    lines: [],
    details: [],
  },
  {
    id: "DSF23V2",
    name: "DSF23 V2",
    hulls: [
      [
        -26, -72, -14, -72, -10, -16, -2, -2, 0, -12, 2, -2, 10, -16, 14, -72, 26, -72, 32, 6, 28, 52, 14, 62, 4, 28, 0, 42,
        -4, 28, -14, 62, -28, 52, -32, 6,
      ],
    ],
    lines: [],
    details: [],
  },
  {
    id: "F13C",
    name: "F13C",
    hulls: [
      [
        0, -86, 4, -40, 6, -16, 5, 2, 7, 18, 44, 28, 46, 38, 8, 34, 7, 52, 20, 66, 18, 74, 4, 60, 0, 78, -4, 60, -18, 74,
        -20, 66, -7, 52, -8, 34, -46, 38, -44, 28, -7, 18, -5, 2, -6, -16, -4, -40,
      ],
    ],
    lines: [],
    details: [[0, -24, 5, -8, 0, -2, -5, -8]],
  },
  {
    id: "ATB30",
    name: "ATB30",
    hulls: [
      [
        0, -82, 5, -28, 7, 4, 10, 24, 20, 48, 24, 70, 8, 72, 5, 54, 0, 54, -5, 54, -8, 72, -24, 70, -20, 48, -10, 24, -7, 4,
        -5, -28,
      ],
    ],
    lines: [[-6, 54, 6, 54]],
    details: [[-2, -20, 2, -20, 2, -12, -2, -12]],
  },
  {
    id: "ATB31",
    name: "ATB31",
    hulls: [
      [
        0, -86, 4, -40, 6, -18, 18, -6, 16, 6, 8, 10, 10, 24, 24, 52, 26, 74, 8, 70, 6, 52, 0, 52, -6, 52, -8, 70, -26, 74,
        -24, 52, -10, 24, -8, 10, -16, 6, -18, -6, -6, -18, -4, -40,
      ],
    ],
    lines: [[-6, 52, 6, 52]],
    details: [[-2, -22, 2, -22, 2, -14, -2, -14]],
  },
  {
    id: "ATF10",
    name: "ATF10",
    hulls: [[0, -58, 6, -22, 10, 16, 8, 40, 0, 34, -8, 40, -10, 16, -6, -22]],
    lines: [],
    details: [],
  },
  {
    id: "ATF11",
    name: "ATF11",
    hulls: [[0, -60, 5, -28, 8, -2, 18, 30, 16, 44, 0, 34, -16, 44, -18, 30, -8, -2, -5, -28]],
    lines: [],
    details: [],
  },
  {
    id: "ATF13",
    name: "ATF13",
    hulls: [
      [
        0, -58, 4, -28, 6, -8, 20, 0, 22, 10, 6, 8, 8, 26, 18, 44, 16, 54, 4, 42, 0, 48, -4, 42, -16, 54, -18, 44, -8, 26,
        -6, 8, -22, 10, -20, 0, -6, -8, -4, -28,
      ],
    ],
    lines: [],
    details: [],
  },
];

/** Catalog art is nose-up / y-down. Game ships point +X. */
export function catalogToGameSkin(spec, target = 17) {
  const parts = [...spec.hulls, ...spec.details, ...spec.lines];
  let max = 1;
  for (const poly of parts) {
    for (let i = 0; i < poly.length; i += 2) max = Math.max(max, Math.hypot(poly[i], poly[i + 1]));
  }
  const scale = target / max;
  const convert = (poly) => {
    const out = [];
    for (let i = 0; i < poly.length; i += 2) {
      out.push(-poly[i + 1] * scale, poly[i] * scale);
    }
    return out;
  };
  return {
    id: spec.id,
    hulls: spec.hulls.map(convert),
    details: spec.details.map(convert),
    lines: spec.lines.map(convert),
  };
}

export const WEDGE_ID = "WEDGE";

export function catalogMiniSvg(spec, size = 52, color = "#66e0ff", hot = "#c8f8ff") {
  if (!spec) {
    const d = "M26 8 L40 44 L26 36 L12 44 Z";
    return `<svg class="dock-mini" width="${size}" height="${size}" viewBox="0 0 52 52" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="3.2" stroke-opacity="0.35"/><path d="${d}" fill="none" stroke="${hot}" stroke-width="1.2"/></svg>`;
  }
  const parts = [...spec.hulls, ...spec.details, ...spec.lines];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const poly of parts) {
    for (let i = 0; i < poly.length; i += 2) {
      minX = Math.min(minX, poly[i]);
      maxX = Math.max(maxX, poly[i]);
      minY = Math.min(minY, poly[i + 1]);
      maxY = Math.max(maxY, poly[i + 1]);
    }
  }
  const pad = 8;
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const path = (poly, close) => {
    let d = "";
    for (let i = 0; i < poly.length; i += 2) d += `${i === 0 ? "M" : "L"}${poly[i]} ${poly[i + 1]} `;
    return close ? `${d}Z` : d;
  };
  const hulls = spec.hulls.map((poly) => path(poly, true)).join("");
  const extras = [...spec.details.map((poly) => path(poly, true)), ...spec.lines.map((poly) => path(poly, false))].join("");
  return `<svg class="dock-mini" width="${size}" height="${size}" viewBox="${minX - pad} ${minY - pad} ${w + pad * 2} ${h + pad * 2}" aria-hidden="true"><path d="${hulls}${extras}" fill="none" stroke="${color}" stroke-width="${Math.max(2.4, w / 28)}" stroke-opacity="0.35" stroke-linejoin="round"/><path d="${hulls}${extras}" fill="none" stroke="${hot}" stroke-width="${Math.max(1, w / 70)}" stroke-linejoin="round"/></svg>`;
}
