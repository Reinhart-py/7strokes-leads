import { GridBoundingBox, ScrapedLead } from './types';
import { GeoGrid } from './grid/geoGrid';
import { WorldGeo, CountryGeoEntry } from './grid/worldGeo';

/**
 * How precisely a typed location was understood.
 *  - country: a whole country ("Kenya")
 *  - city:    a city with a known extent ("Dubai")
 *  - area:    a neighbourhood / district with a bounding box ("Business Bay, Dubai")
 *  - point:   a single building, tower, mall or landmark ("Regal Tower, Dubai")
 *  - unknown: could not be geocoded; matching falls back to the address text
 */
export type PlaceKind = 'country' | 'city' | 'area' | 'point' | 'unknown';

export interface ResolvedPlace {
  kind: PlaceKind;
  /** First comma-separated part of the location, e.g. "Regal Tower". */
  name: string;
  /** Everything after the first comma, e.g. "Dubai". */
  context: string;
  full: string;
  lat?: number;
  lon?: number;
  bbox?: GridBoundingBox;
  country?: CountryGeoEntry | null;
  source: string;
}

export type PlaceLookup = (query: string) => Promise<{
  title: string;
  lat: number;
  lon: number;
  categories: string[];
  address?: string | null;
} | null>;

const AREA_CATEGORY = /\b(neighbou?rhood|sublocality|locality|district|area|city|town|village|region|province|state|country|political|community|zone|island|municipality)\b/i;
const STOP_WORDS = new Set(['the', 'and', 'of', 'al', 'el', 'de', 'la', 'le', 'in', 'at', 'on', 'llc', 'fze', 'fzco', 'ltd']);

const tokenize = (text?: string | null): string[] =>
  (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9؀-ۿ]+/g, ' ')
    .split(' ')
    .filter(Boolean);

const singular = (t: string) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t);

/** True when every significant word of `name` appears (as a word) in `text`. */
export function textMentionsPlace(text: string | null | undefined, name: string): boolean {
  const want = tokenize(name).filter(t => !STOP_WORDS.has(t)).map(singular);
  if (want.length === 0) return false;
  const have = new Set(tokenize(text).map(singular));
  return want.every(t => have.has(t));
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const inBox = (lat: number, lon: number, b: GridBoundingBox) =>
  lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;

const boxDiagonalKm = (b: GridBoundingBox) => distanceKm(b.minLat, b.minLon, b.maxLat, b.maxLon);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) 7StrokesLeads/2.0';

async function fetchJson(url: string, timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' }, signal: controller.signal });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Radius (km) treated as "inside" a single building or landmark. */
export const POINT_RADIUS_KM = 0.08;
/** Radius (km) searched around a building/landmark in Extended mode. */
export const EXTENDED_RADIUS_KM = 3;

export class LocationResolver {
  private static cache = new Map<string, ResolvedPlace>();

  public static async resolve(location: string, googleLookup?: PlaceLookup): Promise<ResolvedPlace> {
    const full = location.trim().replace(/\s+/g, ' ');
    const cacheKey = full.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const [rawName, ...rest] = full.split(',');
    const name = rawName.trim();
    const context = rest.join(',').trim();
    const base = { name, context, full };

    const remember = (p: ResolvedPlace) => {
      this.cache.set(cacheKey, p);
      return p;
    };

    // 1) Whole country
    const country = WorldGeo.findCountryExact(full) || (!context ? WorldGeo.findCountryExact(name) : null);
    if (country) return remember({ ...base, kind: 'country', country, source: 'world-list' });

    // 2) Known city (exact name only - "Regal Tower, Dubai" must NOT become all of Dubai)
    const cityBox = GeoGrid.getKnownCityExact(name);
    if (cityBox) {
      return remember({
        ...base,
        kind: 'city',
        bbox: cityBox,
        lat: (cityBox.minLat + cityBox.maxLat) / 2,
        lon: (cityBox.minLon + cityBox.maxLon) / 2,
        source: 'city-list'
      });
    }

    // 3) Google Maps: the most accurate geocoder for buildings and businesses
    if (googleLookup) {
      try {
        const hit = await googleLookup(full);
        if (hit && Number.isFinite(hit.lat) && Number.isFinite(hit.lon)) {
          const isArea = hit.categories.some(c => AREA_CATEGORY.test(c));
          if (isArea) {
            return remember({
              ...base,
              kind: 'area',
              lat: hit.lat,
              lon: hit.lon,
              bbox: GeoGrid.getBoundingBoxFromCenter(hit.lat, hit.lon, 1.5),
              source: 'google'
            });
          }
          // Only trust the hit as "the building" when its name matches what was typed.
          if (textMentionsPlace(hit.title, name) || textMentionsPlace(name, hit.title)) {
            return remember({ ...base, kind: 'point', lat: hit.lat, lon: hit.lon, source: 'google' });
          }
        }
      } catch {}
    }

    // 4) OpenStreetMap (Photon): returns an extent for areas, a point for buildings
    const photon = await fetchJson(`https://photon.komoot.io/api/?q=${encodeURIComponent(full)}&limit=1&lang=en`, 3500);
    const feat = photon?.features?.[0];
    if (feat?.geometry?.coordinates) {
      const [lon, lat] = feat.geometry.coordinates;
      if (Array.isArray(feat.properties?.extent) && feat.properties.extent.length === 4) {
        const [minLon, maxLat, maxLon, minLat] = feat.properties.extent;
        const bbox: GridBoundingBox = { minLat, maxLat, minLon, maxLon };
        if (boxDiagonalKm(bbox) > 0.4) return remember({ ...base, kind: 'area', lat, lon, bbox, source: 'osm' });
      }
      return remember({ ...base, kind: 'point', lat, lon, source: 'osm' });
    }

    // 5) Nominatim fallback
    const nom = await fetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(full)}&format=json&limit=1`, 4000);
    if (Array.isArray(nom) && nom[0]) {
      const lat = Number(nom[0].lat);
      const lon = Number(nom[0].lon);
      if (Array.isArray(nom[0].boundingbox)) {
        const [minLat, maxLat, minLon, maxLon] = nom[0].boundingbox.map(Number);
        const bbox: GridBoundingBox = { minLat, maxLat, minLon, maxLon };
        if (boxDiagonalKm(bbox) > 0.4) return remember({ ...base, kind: 'area', lat, lon, bbox, source: 'osm' });
      }
      if (Number.isFinite(lat) && Number.isFinite(lon)) return remember({ ...base, kind: 'point', lat, lon, source: 'osm' });
    }

    // 6) City-level geocoders (cities only), then give up and match on address text
    if (!context) {
      const bbox = await GeoGrid.resolveCityBoundingBox(name);
      if (bbox) {
        return remember({
          ...base,
          kind: 'city',
          bbox,
          lat: (bbox.minLat + bbox.maxLat) / 2,
          lon: (bbox.minLon + bbox.maxLon) / 2,
          source: 'city-geocoder'
        });
      }
    }
    return { ...base, kind: 'unknown', source: 'none' };
  }

  /**
   * Builds the "is this lead really in the requested place?" test used by Exact mode.
   * The address text is the primary signal (Google writes "Regal Tower - Business Bay - Dubai");
   * coordinates are the fallback when the address doesn't name the place.
   */
  public static buildExactFilter(place: ResolvedPlace): (lead: ScrapedLead) => boolean {
    const nameTargets = [place.name];
    if (place.kind === 'country' && place.country) {
      nameTargets.push(place.country.name, ...(place.country.aliases || []));
    }

    const mentions = (lead: ScrapedLead) => {
      const text = [lead.address, lead.street, lead.city, lead.state, lead.country].filter(Boolean).join(' ');
      return nameTargets.some(n => textMentionsPlace(text, n));
    };

    return (lead: ScrapedLead) => {
      if (mentions(lead)) return true;

      const hasCoords = typeof lead.latitude === 'number' && typeof lead.longitude === 'number';
      if (!hasCoords) return false;
      const lat = lead.latitude as number;
      const lon = lead.longitude as number;

      switch (place.kind) {
        case 'point':
          // Same building: within a few dozen metres of the tower's pin.
          return place.lat !== undefined && distanceKm(lat, lon, place.lat, place.lon!) <= POINT_RADIUS_KM;
        case 'area':
        case 'city':
          return !!place.bbox && inBox(lat, lon, place.bbox) && !lead.address;
        default:
          return false;
      }
    };
  }

  /** Area to sweep for this place: tight for Exact, wider for Extended. */
  public static sweepBox(place: ResolvedPlace, scope: 'exact' | 'extended'): GridBoundingBox | null {
    if (place.bbox && (place.kind === 'city' || place.kind === 'area')) {
      return scope === 'extended' && place.kind === 'area' && place.lat !== undefined
        ? GeoGrid.getBoundingBoxFromCenter(place.lat, place.lon!, Math.max(EXTENDED_RADIUS_KM, boxDiagonalKm(place.bbox) / 2))
        : place.bbox;
    }
    if (place.kind === 'point' && place.lat !== undefined) {
      return GeoGrid.getBoundingBoxFromCenter(place.lat, place.lon!, scope === 'exact' ? 0.25 : EXTENDED_RADIUS_KM);
    }
    return null;
  }

  public static describe(place: ResolvedPlace): string {
    const where = place.lat !== undefined ? ` @ ${place.lat.toFixed(5)},${place.lon!.toFixed(5)}` : '';
    return `${place.full} -> ${place.kind} (${place.source})${where}`;
  }
}

