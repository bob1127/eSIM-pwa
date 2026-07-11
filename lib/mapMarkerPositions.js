/**
 * Marker positions calibrated to world-map-dark.jpg (1136×936).
 * Pixels sampled on the Robinson-style Vecteezy map — not raw equirectangular.
 */
const MAP_W = 1136;
const MAP_H = 936;

const PIXEL_MARKERS = [
  { key: "china", label: "中國", x: 638, y: 352, accent: 1 },
  { key: "japan", label: "日本", x: 768, y: 322, accent: 2 },
  { key: "korea", label: "韓國", x: 726, y: 315, accent: 1 },
  { key: "na", label: "美加", x: 268, y: 282, accent: 2 },
  { key: "my-sg", label: "馬新", x: 670, y: 476, accent: 1 },
  { key: "vietnam", label: "越南", x: 692, y: 432, accent: 2 },
  { key: "thailand", label: "泰國", x: 654, y: 446, accent: 1 },
];

export const REGION_MARKERS = PIXEL_MARKERS.map((m) => ({
  ...m,
  left: `${(m.x / MAP_W) * 100}%`,
  top: `${(m.y / MAP_H) * 100}%`,
}));

export const MAP_ASPECT = MAP_W / MAP_H;
