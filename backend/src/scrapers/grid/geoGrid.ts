import { GridBoundingBox, GridCell } from '../types';

export class GeoGrid {
  private static readonly KM_PER_DEGREE_LAT = 111.32;
  private static readonly MIN_COS_LATITUDE = 1e-6;

  private static readonly KNOWN_CITY_BBOX: Record<string, GridBoundingBox> = {
    dubai: { minLat: 24.95, minLon: 55.05, maxLat: 25.35, maxLon: 55.45 },
    abu_dhabi: { minLat: 24.35, minLon: 54.30, maxLat: 24.55, maxLon: 54.70 },
    sharjah: { minLat: 25.25, minLon: 55.35, maxLat: 25.42, maxLon: 55.55 },
    ajman: { minLat: 25.35, minLon: 55.45, maxLat: 25.48, maxLon: 55.60 },
    ras_al_khaimah: { minLat: 25.65, minLon: 55.85, maxLat: 25.85, maxLon: 56.05 },
    riyadh: { minLat: 24.55, minLon: 46.55, maxLat: 24.85, maxLon: 46.85 },
    jeddah: { minLat: 21.40, minLon: 39.10, maxLat: 21.75, maxLon: 39.30 },
    dammam: { minLat: 26.35, minLon: 49.95, maxLat: 26.50, maxLon: 50.20 },
    doha: { minLat: 25.20, minLon: 51.40, maxLat: 25.40, maxLon: 51.60 },
    kuwait: { minLat: 29.25, minLon: 47.90, maxLat: 29.45, maxLon: 48.10 },
    manama: { minLat: 26.18, minLon: 50.50, maxLat: 26.26, maxLon: 50.62 },
    muscat: { minLat: 23.55, minLon: 58.35, maxLat: 23.65, maxLon: 58.55 },
    london: { minLat: 51.35, minLon: -0.35, maxLat: 51.65, maxLon: 0.15 },
    manchester: { minLat: 53.40, minLon: -2.35, maxLat: 53.55, maxLon: -2.15 },
    birmingham: { minLat: 52.40, minLon: -2.00, maxLat: 52.55, maxLon: -1.80 },
    new_york: { minLat: 40.55, minLon: -74.15, maxLat: 40.90, maxLon: -73.75 },
    los_angeles: { minLat: 33.70, minLon: -118.65, maxLat: 34.30, maxLon: -118.15 },
    chicago: { minLat: 41.65, minLon: -87.85, maxLat: 42.05, maxLon: -87.55 },
    houston: { minLat: 29.55, minLon: -95.65, maxLat: 30.10, maxLon: -95.10 },
    miami: { minLat: 25.70, minLon: -80.35, maxLat: 25.88, maxLon: -80.12 },
    san_francisco: { minLat: 37.70, minLon: -122.52, maxLat: 37.82, maxLon: -122.35 },
    toronto: { minLat: 43.60, minLon: -79.55, maxLat: 43.85, maxLon: -79.20 },
    vancouver: { minLat: 49.20, minLon: -123.25, maxLat: 49.32, maxLon: -123.02 },
    paris: { minLat: 48.80, minLon: 2.22, maxLat: 48.92, maxLon: 2.45 },
    berlin: { minLat: 52.38, minLon: 13.15, maxLat: 52.65, maxLon: 13.65 },
    madrid: { minLat: 40.35, minLon: -3.80, maxLat: 40.52, maxLon: -3.55 },
    rome: { minLat: 41.80, minLon: 12.40, maxLat: 41.98, maxLon: 12.60 },
    amsterdam: { minLat: 52.30, minLon: 4.80, maxLat: 52.42, maxLon: 5.00 },
    sydney: { minLat: -33.95, minLon: 151.05, maxLat: -33.75, maxLon: 151.30 },
    melbourne: { minLat: -37.95, minLon: 144.85, maxLat: -37.70, maxLon: 145.10 },
    singapore: { minLat: 1.22, minLon: 103.60, maxLat: 1.47, maxLon: 104.05 },
    tokyo: { minLat: 35.55, minLon: 139.55, maxLat: 35.80, maxLon: 139.90 },
    mumbai: { minLat: 18.90, minLon: 72.75, maxLat: 19.30, maxLon: 73.00 },
    delhi: { minLat: 28.45, minLon: 76.90, maxLat: 28.85, maxLon: 77.35 },
    bengaluru: { minLat: 12.85, minLon: 77.45, maxLat: 13.15, maxLon: 77.75 }
  };

  public static getBoundingBoxForCity(cityName: string): GridBoundingBox | null {
    const key = cityName.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (this.KNOWN_CITY_BBOX[key]) {
      return this.KNOWN_CITY_BBOX[key];
    }
    for (const [k, box] of Object.entries(this.KNOWN_CITY_BBOX)) {
      if (key.includes(k) || k.includes(key)) {
        return box;
      }
    }
    return null;
  }

  public static async resolveCityBoundingBox(cityName: string): Promise<GridBoundingBox | null> {
    const known = this.getBoundingBoxForCity(cityName);
    if (known) return known;

    const key = cityName.toLowerCase().trim().replace(/[\s-]+/g, '_');
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName.trim())}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'DashMinLeadScraper/1.0' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data[0]?.boundingbox) {
          const [south, north, west, east] = data[0].boundingbox.map(Number);
          const bbox: GridBoundingBox = {
            minLat: south,
            maxLat: north,
            minLon: west,
            maxLon: east
          };
          this.KNOWN_CITY_BBOX[key] = bbox;
          return bbox;
        }
      }
    } catch {}

    return null;
  }

  public static getBoundingBoxFromCenter(lat: number, lon: number, radiusKm: number): GridBoundingBox {
    const latDelta = radiusKm / this.KM_PER_DEGREE_LAT;
    const midLatRad = (lat * Math.PI) / 180;
    const cosLat = Math.max(Math.abs(Math.cos(midLatRad)), this.MIN_COS_LATITUDE);
    const lonDelta = radiusKm / (this.KM_PER_DEGREE_LAT * cosLat);

    return {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLon: lon - lonDelta,
      maxLon: lon + lonDelta
    };
  }

  public static generateCells(bbox: GridBoundingBox, cellSizeKm = 3.0): GridCell[] {
    const normalizedCellSize = cellSizeKm <= 0 ? 3.0 : cellSizeKm;
    const latStep = normalizedCellSize / this.KM_PER_DEGREE_LAT;

    const midLat = (bbox.minLat + bbox.maxLat) / 2;
    const cosMidLat = Math.cos((midLat * Math.PI) / 180);
    const safeCos = Math.abs(cosMidLat) < this.MIN_COS_LATITUDE ? this.MIN_COS_LATITUDE : cosMidLat;
    const lonStep = normalizedCellSize / (this.KM_PER_DEGREE_LAT * safeCos);

    const cells: GridCell[] = [];

    for (let lat = bbox.minLat + latStep / 2; lat < bbox.maxLat; lat += latStep) {
      for (let lon = bbox.minLon + lonStep / 2; lon < bbox.maxLon; lon += lonStep) {
        cells.push({
          lat: Number(lat.toFixed(6)),
          lon: Number(lon.toFixed(6))
        });
      }
    }

    const midLon = (bbox.minLon + bbox.maxLon) / 2;

    cells.sort((a, b) => {
      const distA = Math.hypot(a.lat - midLat, (a.lon - midLon) * safeCos);
      const distB = Math.hypot(b.lat - midLat, (b.lon - midLon) * safeCos);
      return distA - distB;
    });

    return cells.length > 0 ? cells : [{ lat: midLat, lon: midLon }];
  }
}
