import { GridBoundingBox, GridCell } from '../types';

export class GeoGrid {
  private static readonly KM_PER_DEGREE_LAT = 111.32;
  private static readonly MIN_COS_LATITUDE = 1e-6;

  private static readonly KNOWN_CITY_BBOX: Record<string, GridBoundingBox> = {
    // UAE & GCC (Expanded Metropolitan Boundaries)
    dubai: { minLat: 24.75, minLon: 54.90, maxLat: 25.45, maxLon: 55.65 },
    abu_dhabi: { minLat: 24.20, minLon: 54.20, maxLat: 24.65, maxLon: 54.85 },
    sharjah: { minLat: 25.20, minLon: 55.30, maxLat: 25.48, maxLon: 55.65 },
    ajman: { minLat: 25.32, minLon: 55.40, maxLat: 25.52, maxLon: 55.68 },
    ras_al_khaimah: { minLat: 25.55, minLon: 55.80, maxLat: 25.90, maxLon: 56.12 },
    fujairah: { minLat: 25.05, minLon: 56.25, maxLat: 25.25, maxLon: 56.40 },
    umm_al_quwain: { minLat: 25.48, minLon: 55.50, maxLat: 25.62, maxLon: 55.75 },
    al_ain: { minLat: 24.10, minLon: 55.65, maxLat: 24.30, maxLon: 55.85 },
    riyadh: { minLat: 24.45, minLon: 46.45, maxLat: 24.95, maxLon: 46.95 },
    jeddah: { minLat: 21.30, minLon: 39.05, maxLat: 21.85, maxLon: 39.38 },
    dammam: { minLat: 26.25, minLon: 49.90, maxLat: 26.55, maxLon: 50.25 },
    khobar: { minLat: 26.15, minLon: 50.12, maxLat: 26.35, maxLon: 50.28 },
    mecca: { minLat: 21.32, minLon: 39.72, maxLat: 21.48, maxLon: 39.92 },
    medina: { minLat: 24.40, minLon: 39.50, maxLat: 24.58, maxLon: 39.70 },
    doha: { minLat: 25.15, minLon: 51.35, maxLat: 25.45, maxLon: 51.65 },
    kuwait: { minLat: 29.20, minLon: 47.85, maxLat: 29.50, maxLon: 48.18 },
    manama: { minLat: 26.15, minLon: 50.48, maxLat: 26.28, maxLon: 50.65 },
    muscat: { minLat: 23.50, minLon: 58.25, maxLat: 23.70, maxLon: 58.65 },

    // India (Metros, Tier 1 & Key Business Hubs)
    jaipur: { minLat: 26.70, minLon: 75.60, maxLat: 27.08, maxLon: 76.02 },
    delhi: { minLat: 28.40, minLon: 76.85, maxLat: 28.88, maxLon: 77.38 },
    new_delhi: { minLat: 28.48, minLon: 77.08, maxLat: 28.70, maxLon: 77.30 },
    mumbai: { minLat: 18.85, minLon: 72.70, maxLat: 19.35, maxLon: 73.10 },
    navi_mumbai: { minLat: 18.95, minLon: 72.95, maxLat: 19.18, maxLon: 73.12 },
    bengaluru: { minLat: 12.80, minLon: 77.40, maxLat: 13.20, maxLon: 77.80 },
    bangalore: { minLat: 12.80, minLon: 77.40, maxLat: 13.20, maxLon: 77.80 },
    hyderabad: { minLat: 17.25, minLon: 78.30, maxLat: 17.58, maxLon: 78.65 },
    chennai: { minLat: 12.90, minLon: 80.10, maxLat: 13.25, maxLon: 80.35 },
    kolkata: { minLat: 22.40, minLon: 88.25, maxLat: 22.70, maxLon: 88.48 },
    pune: { minLat: 18.40, minLon: 73.72, maxLat: 18.68, maxLon: 74.02 },
    ahmedabad: { minLat: 22.92, minLon: 72.45, maxLat: 23.15, maxLon: 72.70 },
    gurgaon: { minLat: 28.35, minLon: 76.92, maxLat: 28.55, maxLon: 77.15 },
    gurugram: { minLat: 28.35, minLon: 76.92, maxLat: 28.55, maxLon: 77.15 },
    noida: { minLat: 28.48, minLon: 77.28, maxLat: 28.65, maxLon: 77.45 },
    greater_noida: { minLat: 28.40, minLon: 77.42, maxLat: 28.58, maxLon: 77.58 },
    faridabad: { minLat: 28.32, minLon: 77.25, maxLat: 28.48, maxLon: 77.38 },
    ghaziabad: { minLat: 28.60, minLon: 77.35, maxLat: 28.75, maxLon: 77.50 },
    chandigarh: { minLat: 30.68, minLon: 76.70, maxLat: 30.79, maxLon: 76.85 },
    surat: { minLat: 21.10, minLon: 72.75, maxLat: 21.28, maxLon: 72.92 },
    lucknow: { minLat: 26.75, minLon: 80.85, maxLat: 26.95, maxLon: 81.05 },
    indore: { minLat: 22.65, minLon: 75.80, maxLat: 22.78, maxLon: 75.95 },
    kanpur: { minLat: 26.40, minLon: 80.25, maxLat: 26.55, maxLon: 80.40 },
    nagpur: { minLat: 21.08, minLon: 79.00, maxLat: 21.22, maxLon: 79.15 },
    patna: { minLat: 25.55, minLon: 85.05, maxLat: 25.68, maxLon: 85.22 },
    bhopal: { minLat: 23.18, minLon: 77.32, maxLat: 23.32, maxLon: 77.48 },
    vadodara: { minLat: 22.25, minLon: 73.12, maxLat: 22.38, maxLon: 73.25 },
    ludhiana: { minLat: 30.85, minLon: 75.78, maxLat: 30.98, maxLon: 75.92 },
    agra: { minLat: 27.12, minLon: 77.95, maxLat: 27.24, maxLon: 78.08 },
    nashik: { minLat: 19.92, minLon: 73.72, maxLat: 20.05, maxLon: 73.85 },
    varanasi: { minLat: 25.28, minLon: 82.92, maxLat: 25.38, maxLon: 83.05 },
    amritsar: { minLat: 31.58, minLon: 74.82, maxLat: 31.68, maxLon: 74.95 },
    coimbatore: { minLat: 10.95, minLon: 76.90, maxLat: 11.08, maxLon: 77.05 },
    kochi: { minLat: 9.90, minLon: 76.22, maxLat: 10.05, maxLon: 76.35 },
    jodhpur: { minLat: 26.22, minLon: 72.98, maxLat: 26.35, maxLon: 73.10 },
    udaipur: { minLat: 24.52, minLon: 73.65, maxLat: 24.64, maxLon: 73.75 },

    // UK & Europe
    london: { minLat: 51.28, minLon: -0.50, maxLat: 51.70, maxLon: 0.30 },
    manchester: { minLat: 53.35, minLon: -2.40, maxLat: 53.60, maxLon: -2.10 },
    birmingham: { minLat: 52.35, minLon: -2.05, maxLat: 52.60, maxLon: -1.75 },
    leeds: { minLat: 53.75, minLon: -1.65, maxLat: 53.88, maxLon: -1.45 },
    glasgow: { minLat: 55.80, minLon: -4.35, maxLat: 55.92, maxLon: -4.15 },
    paris: { minLat: 48.75, minLon: 2.15, maxLat: 48.98, maxLon: 2.52 },
    berlin: { minLat: 52.35, minLon: 13.10, maxLat: 52.68, maxLon: 13.70 },
    madrid: { minLat: 40.30, minLon: -3.85, maxLat: 40.55, maxLon: -3.50 },
    barcelona: { minLat: 41.32, minLon: 2.05, maxLat: 41.48, maxLon: 2.25 },
    rome: { minLat: 41.75, minLon: 12.35, maxLat: 42.02, maxLon: 12.65 },
    milan: { minLat: 45.40, minLon: 9.10, maxLat: 45.52, maxLon: 9.28 },
    amsterdam: { minLat: 52.28, minLon: 4.75, maxLat: 52.45, maxLon: 5.05 },
    dublin: { minLat: 53.28, minLon: -6.40, maxLat: 53.42, maxLon: -6.15 },

    // North America & Rest of World
    new_york: { minLat: 40.50, minLon: -74.25, maxLat: 40.95, maxLon: -73.68 },
    los_angeles: { minLat: 33.65, minLon: -118.70, maxLat: 34.35, maxLon: -118.10 },
    chicago: { minLat: 41.60, minLon: -87.90, maxLat: 42.10, maxLon: -87.50 },
    houston: { minLat: 29.50, minLon: -95.70, maxLat: 30.15, maxLon: -95.05 },
    miami: { minLat: 25.65, minLon: -80.40, maxLat: 25.92, maxLon: -80.10 },
    san_francisco: { minLat: 37.65, minLon: -122.55, maxLat: 37.85, maxLon: -122.32 },
    dallas: { minLat: 32.65, minLon: -96.95, maxLat: 33.02, maxLon: -96.60 },
    austin: { minLat: 30.15, minLon: -97.90, maxLat: 30.45, maxLon: -97.60 },
    toronto: { minLat: 43.55, minLon: -79.62, maxLat: 43.88, maxLon: -79.15 },
    vancouver: { minLat: 49.18, minLon: -123.30, maxLat: 49.35, maxLon: -123.00 },
    sydney: { minLat: -34.00, minLon: 151.00, maxLat: -33.70, maxLon: 151.35 },
    melbourne: { minLat: -38.00, minLon: 144.80, maxLat: -37.65, maxLon: 145.15 },
    singapore: { minLat: 1.20, minLon: 103.60, maxLat: 1.48, maxLon: 104.05 },
    tokyo: { minLat: 35.50, minLon: 139.50, maxLat: 35.85, maxLon: 139.95 }
  };

  /** Exact city-name match only (no "dubai_marina" -> "dubai" style widening). */
  public static getKnownCityExact(cityName: string): GridBoundingBox | null {
    const key = cityName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    return key ? this.KNOWN_CITY_BBOX[key] || null : null;
  }

  public static getBoundingBoxForCity(cityName: string): GridBoundingBox | null {
    const key = cityName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!key) return null;
    if (this.KNOWN_CITY_BBOX[key]) {
      return this.KNOWN_CITY_BBOX[key];
    }
    // Allow "dubai_uae" / "greater_london" style variants, but never partial words
    // (previously "in" matched "berlin" and "al" matched "al_ain").
    let best: string | null = null;
    for (const k of Object.keys(this.KNOWN_CITY_BBOX)) {
      if (k.length < 4) continue;
      if (key.startsWith(`${k}_`) || key.endsWith(`_${k}`) || key.includes(`_${k}_`)) {
        if (!best || k.length > best.length) best = k;
      }
    }
    return best ? this.KNOWN_CITY_BBOX[best] : null;
  }

  public static async resolveCityBoundingBox(cityName: string): Promise<GridBoundingBox | null> {
    const known = this.getBoundingBoxForCity(cityName);
    if (known) return known;

    const key = cityName.toLowerCase().trim().replace(/[\s-]+/g, '_');
    const cleanName = cityName.trim();

    // Provider 1: Open-Meteo Geocoding API (Ultra-fast, sub-100ms, zero rate limits)
    try {
      const omController = new AbortController();
      const omTimeout = setTimeout(() => omController.abort(), 2500);
      const omUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanName)}&count=1&language=en&format=json`;
      const omRes = await fetch(omUrl, { signal: omController.signal });
      clearTimeout(omTimeout);
      if (omRes.ok) {
        const omData = (await omRes.json()) as any;
        if (omData?.results && omData.results.length > 0) {
          const first = omData.results[0];
          const lat = Number(first.latitude);
          const lon = Number(first.longitude);
          if (!isNaN(lat) && !isNaN(lon)) {
            const bbox = this.getBoundingBoxFromCenter(lat, lon, 18.0);
            this.KNOWN_CITY_BBOX[key] = bbox;
            return bbox;
          }
        }
      }
    } catch {}

    // Provider 2: Photon / Komoot API (High-speed OpenStreetMap extent search)
    try {
      const phController = new AbortController();
      const phTimeout = setTimeout(() => phController.abort(), 2500);
      const phUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanName)}&limit=1`;
      const phRes = await fetch(phUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 7StrokesLeads/2.0' },
        signal: phController.signal
      });
      clearTimeout(phTimeout);
      if (phRes.ok) {
        const phData = (await phRes.json()) as any;
        if (phData?.features && phData.features.length > 0) {
          const feat = phData.features[0];
          if (feat.extent && feat.extent.length === 4) {
            const [minLon, maxLat, maxLon, minLat] = feat.extent;
            const bbox: GridBoundingBox = { minLat, maxLat, minLon, maxLon };
            this.KNOWN_CITY_BBOX[key] = bbox;
            return bbox;
          } else if (feat.geometry?.coordinates) {
            const [lon, lat] = feat.geometry.coordinates;
            const bbox = this.getBoundingBoxFromCenter(lat, lon, 18.0);
            this.KNOWN_CITY_BBOX[key] = bbox;
            return bbox;
          }
        }
      }
    } catch {}

    // Provider 3: Nominatim OpenStreetMap (Final fallback)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanName)}&format=json&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 7StrokesLeads/2.0' },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = (await res.json()) as any;
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
