import { GridBoundingBox, GridCell } from '../types';

export class GeoGrid {
  private static readonly KM_PER_DEGREE_LAT = 111.32;
  private static readonly MIN_COS_LATITUDE = 1e-6;

  private static readonly KNOWN_CITY_BBOX: Record<string, GridBoundingBox> = {
    dubai: { minLat: 24.95, minLon: 55.05, maxLat: 25.35, maxLon: 55.45 },
    abu_dhabi: { minLat: 24.35, minLon: 54.30, maxLat: 24.55, maxLon: 54.70 },
    riyadh: { minLat: 24.55, minLon: 46.55, maxLat: 24.85, maxLon: 46.85 },
    jeddah: { minLat: 21.40, minLon: 39.10, maxLat: 21.75, maxLon: 39.30 },
    doha: { minLat: 25.20, minLon: 51.40, maxLat: 25.40, maxLon: 51.60 },
    london: { minLat: 51.35, minLon: -0.35, maxLat: 51.65, maxLon: 0.15 },
    new_york: { minLat: 40.55, minLon: -74.15, maxLat: 40.90, maxLon: -73.75 }
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

    return cells.length > 0 ? cells : [{ lat: midLat, lon: (bbox.minLon + bbox.maxLon) / 2 }];
  }
}
