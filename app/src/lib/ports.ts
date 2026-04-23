// A curated selection of ports/airports used across the demo. lat/lon for the map.
export type NodeKind = "AIR" | "OCEAN";
export type LocationNode = {
  code: string;
  name: string;
  country: string;
  kind: NodeKind;
  lat: number;
  lon: number;
};

export const NODES: LocationNode[] = [
  // Airports
  { code: "FRA", name: "Frankfurt Airport", country: "DE", kind: "AIR", lat: 50.0379, lon: 8.5622 },
  { code: "MUC", name: "München Airport", country: "DE", kind: "AIR", lat: 48.3537, lon: 11.7750 },
  { code: "AMS", name: "Amsterdam Schiphol", country: "NL", kind: "AIR", lat: 52.3105, lon: 4.7683 },
  { code: "JFK", name: "New York JFK", country: "US", kind: "AIR", lat: 40.6413, lon: -73.7781 },
  { code: "ORD", name: "Chicago O'Hare", country: "US", kind: "AIR", lat: 41.9742, lon: -87.9073 },
  { code: "PVG", name: "Shanghai Pudong", country: "CN", kind: "AIR", lat: 31.1443, lon: 121.8083 },
  { code: "HKG", name: "Hong Kong Intl", country: "HK", kind: "AIR", lat: 22.3080, lon: 113.9185 },
  { code: "SIN", name: "Singapore Changi", country: "SG", kind: "AIR", lat: 1.3644, lon: 103.9915 },
  { code: "DXB", name: "Dubai Intl", country: "AE", kind: "AIR", lat: 25.2532, lon: 55.3657 },
  { code: "NRT", name: "Tokyo Narita", country: "JP", kind: "AIR", lat: 35.772, lon: 140.3929 },
  // Sea ports
  { code: "DEHAM", name: "Hamburg", country: "DE", kind: "OCEAN", lat: 53.5407, lon: 9.9847 },
  { code: "DEBRV", name: "Bremerhaven", country: "DE", kind: "OCEAN", lat: 53.5396, lon: 8.5810 },
  { code: "NLRTM", name: "Rotterdam", country: "NL", kind: "OCEAN", lat: 51.9496, lon: 4.1453 },
  { code: "BEANR", name: "Antwerpen", country: "BE", kind: "OCEAN", lat: 51.2993, lon: 4.4014 },
  { code: "CNSHA", name: "Shanghai", country: "CN", kind: "OCEAN", lat: 31.3389, lon: 121.6147 },
  { code: "CNNGB", name: "Ningbo", country: "CN", kind: "OCEAN", lat: 29.8683, lon: 121.8408 },
  { code: "SGSIN", name: "Singapore Port", country: "SG", kind: "OCEAN", lat: 1.2644, lon: 103.8400 },
  { code: "USNYC", name: "New York Port", country: "US", kind: "OCEAN", lat: 40.6843, lon: -74.0440 },
  { code: "USLAX", name: "Los Angeles Port", country: "US", kind: "OCEAN", lat: 33.7292, lon: -118.2620 },
  { code: "AEJEA", name: "Jebel Ali", country: "AE", kind: "OCEAN", lat: 25.0167, lon: 55.0611 },
];

export const NODE_BY_CODE = Object.fromEntries(NODES.map((n) => [n.code, n]));
