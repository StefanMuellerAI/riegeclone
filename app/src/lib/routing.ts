import { NODE_BY_CODE } from "@/lib/ports";

/**
 * Maritime & air routing.
 * - Air: great-circle (geoInterpolate), looks naturally curved on Natural Earth.
 * - Ocean: multi-waypoint through real choke points (Suez, Malacca, Panama, Gibraltar, Cape, Hormuz).
 */

export type LngLat = [number, number];

const WP: Record<string, LngLat> = {
  malacca: [103.5, 2.0],        // Strait of Malacca
  bab: [43.3, 12.6],            // Bab-el-Mandeb
  suez_south: [32.6, 29.9],     // Suez South entry
  suez_north: [32.3, 31.3],     // Port Said
  gibraltar: [-5.6, 35.95],
  english_channel: [1.0, 50.5],
  panama_pac: [-79.9, 8.9],
  panama_car: [-79.6, 9.4],
  hormuz: [56.3, 26.6],
  cape: [19.3, -34.8],           // Cape of Good Hope
  cape_horn: [-67.3, -55.9],
  singapore: [103.85, 1.26],     // Port handles
  north_sea_in: [3.0, 52.0],
  bay_biscay: [-6.0, 46.0],
  med_east: [30.0, 33.0],        // East Med off Egypt
  med_west: [3.0, 38.0],         // West Med off Spain
  n_atlantic: [-30.0, 42.0],
  s_china_sea_n: [118.0, 20.0],
  indian_ocean_nw: [62.0, 13.0],
  pacific_central: [180, 35],
  pacific_south: [-160, 25],
};

type Region = "ASIA_E" | "ASIA_SE" | "ME" | "EU_N" | "EU_S" | "US_E" | "US_W" | "AF_E" | "AF_W" | "SA" | "OC" | "AIR";

const REGION_OF: Record<string, Region> = {
  // Ocean ports
  CNSHA: "ASIA_E", CNNGB: "ASIA_E",
  SGSIN: "ASIA_SE",
  AEJEA: "ME",
  DEHAM: "EU_N", DEBRV: "EU_N", NLRTM: "EU_N", BEANR: "EU_N",
  USNYC: "US_E", USLAX: "US_W",
  // Air (we don't route air through waypoints, but kept for consistency)
  PVG: "ASIA_E", HKG: "ASIA_E", NRT: "ASIA_E",
  SIN: "ASIA_SE",
  DXB: "ME",
  FRA: "EU_N", MUC: "EU_N", AMS: "EU_N",
  JFK: "US_E", ORD: "US_E",
};

function regionOf(code: string): Region | undefined {
  return REGION_OF[code];
}

// Route tables — waypoint sequences between regions (ocean).
// Direction matters (east→west is stored; west→east uses reverse).
type Route = LngLat[];
const OCEAN_ROUTES: Record<string, Route> = {
  "ASIA_E>EU_N":  [WP.s_china_sea_n, WP.singapore, WP.malacca, WP.indian_ocean_nw, WP.bab, WP.suez_south, WP.suez_north, WP.med_east, WP.med_west, WP.gibraltar, WP.bay_biscay, WP.english_channel, WP.north_sea_in],
  "ASIA_SE>EU_N":[WP.malacca, WP.indian_ocean_nw, WP.bab, WP.suez_south, WP.suez_north, WP.med_east, WP.med_west, WP.gibraltar, WP.bay_biscay, WP.english_channel, WP.north_sea_in],
  "ME>EU_N":     [WP.hormuz, WP.bab, WP.suez_south, WP.suez_north, WP.med_east, WP.med_west, WP.gibraltar, WP.bay_biscay, WP.english_channel, WP.north_sea_in],

  "ASIA_E>US_W": [WP.s_china_sea_n, WP.pacific_central, WP.pacific_south],
  "ASIA_E>US_E": [WP.s_china_sea_n, WP.singapore, WP.malacca, WP.indian_ocean_nw, WP.bab, WP.suez_south, WP.suez_north, WP.med_east, WP.med_west, WP.gibraltar, WP.n_atlantic],
  "ASIA_SE>US_W":[WP.malacca, WP.pacific_south],
  "ASIA_SE>US_E":[WP.malacca, WP.indian_ocean_nw, WP.bab, WP.suez_south, WP.suez_north, WP.med_east, WP.gibraltar, WP.n_atlantic],

  "EU_N>US_E":   [WP.english_channel, WP.bay_biscay, WP.n_atlantic],
  "EU_N>US_W":   [WP.english_channel, WP.bay_biscay, WP.n_atlantic, [-75, 25], WP.panama_car, WP.panama_pac],

  "ME>US_E":     [WP.hormuz, WP.bab, WP.suez_south, WP.suez_north, WP.med_east, WP.gibraltar, WP.n_atlantic],
  "ME>US_W":     [WP.hormuz, WP.bab, WP.suez_south, WP.suez_north, WP.med_east, WP.gibraltar, WP.n_atlantic, WP.panama_car, WP.panama_pac],

  "ASIA_E>ME":   [WP.s_china_sea_n, WP.singapore, WP.malacca, WP.indian_ocean_nw, WP.bab, WP.hormuz],
  "EU_N>ME":     [WP.english_channel, WP.bay_biscay, WP.gibraltar, WP.med_west, WP.med_east, WP.suez_north, WP.suez_south, WP.bab, WP.hormuz],
};

function reverse(r: Route): Route {
  return r.slice().reverse();
}

export function oceanRouteWaypoints(originCode: string, destCode: string): LngLat[] | null {
  const o = NODE_BY_CODE[originCode];
  const d = NODE_BY_CODE[destCode];
  if (!o || !d) return null;
  const oR = regionOf(originCode);
  const dR = regionOf(destCode);
  if (!oR || !dR || oR === dR) return null; // Same region → no choke-point routing needed
  const key = `${oR}>${dR}`;
  const rev = `${dR}>${oR}`;
  if (OCEAN_ROUTES[key]) return OCEAN_ROUTES[key];
  if (OCEAN_ROUTES[rev]) return reverse(OCEAN_ROUTES[rev]);
  return null;
}

/**
 * Great-circle interpolation: return N+1 points along the sphere great circle from a to b.
 * Uses slerp.
 */
export function greatCircle(a: LngLat, b: LngLat, segments = 48): LngLat[] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const [lon1, lat1] = a.map(toRad) as [number, number];
  const [lon2, lat2] = b.map(toRad) as [number, number];
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
      )
    );
  if (d === 0) return [a, b];
  const points: LngLat[] = [];
  for (let i = 0; i <= segments; i++) {
    const f = i / segments;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    points.push([toDeg(lon), toDeg(lat)]);
  }
  return points;
}

/**
 * Build full polyline for an arc.
 * - AIR: great circle origin → dest (many points, naturally curved on Natural Earth).
 * - OCEAN: waypoint sequence; between each pair use a *short* rhumb-like interpolation (straight in lon/lat) because
 *   maritime lanes follow coastlines, not great circles. If no route found, fall back to a shallow arc.
 */
export function buildRoutePoints(mode: "AIR" | "OCEAN", originCode: string, destCode: string): LngLat[] {
  const o = NODE_BY_CODE[originCode];
  const d = NODE_BY_CODE[destCode];
  if (!o || !d) return [];
  const origin: LngLat = [o.lon, o.lat];
  const dest: LngLat = [d.lon, d.lat];

  if (mode === "AIR") {
    return greatCircle(origin, dest, 64);
  }

  const route = oceanRouteWaypoints(originCode, destCode);
  const waypoints: LngLat[] = route ? [origin, ...route, dest] : [origin, dest];

  // Densify: between each pair, use rhumb-line with enough samples for a smooth curve on Natural Earth.
  const out: LngLat[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const [ax, ay] = waypoints[i], [bx, by] = waypoints[i + 1];
    const steps = 22;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  out.push(waypoints[waypoints.length - 1]);
  return out;
}

/**
 * Given a polyline and a progress 0..1, return the interpolated point [lng,lat].
 */
export function pointAtProgress(points: LngLat[], progress: number): LngLat {
  if (points.length < 2) return points[0] ?? [0, 0];
  // compute cumulative distance in degree-space (approximation; looks fine visually)
  const cum: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    cum.push(cum[i - 1] + Math.hypot(bx - ax, by - ay));
  }
  const total = cum[cum.length - 1];
  if (total === 0) return points[0];
  const target = Math.max(0, Math.min(1, progress)) * total;
  let lo = 0, hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < target) lo = mid; else hi = mid;
  }
  const seg = cum[hi] - cum[lo];
  const f = seg === 0 ? 0 : (target - cum[lo]) / seg;
  const [ax, ay] = points[lo], [bx, by] = points[hi];
  return [ax + (bx - ax) * f, ay + (by - ay) * f];
}
