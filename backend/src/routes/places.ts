import { Router } from 'express';
import { AuthRequest, authMiddleware } from '../middlewares/auth';
import { GmapsHttpProvider } from '../scrapers/http/gmapsHttpProvider';

const router = Router();
router.use(authMiddleware);

type Suggestion = {
  id: string;
  label: string;
  name: string;
  secondary: string;
  lat: number;
  lon: number;
  kind: 'country' | 'city' | 'area' | 'point';
  bbox?: { minLat: number; minLon: number; maxLat: number; maxLon: number };
  source: 'google' | 'osm';
};

const gmaps = new GmapsHttpProvider();
const cache = new Map<string, { at: number; items: Suggestion[] }>();
const CACHE_MS = 10 * 60 * 1000;
const AREA_CATEGORY = /\b(neighbou?rhood|sublocality|locality|district|area|community|zone|island)\b/i;
const CITY_CATEGORY = /\b(city|town|village|municipality|county|province|state|region)\b/i;

const withTimeout = <T>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
  Promise.race([p.catch(() => fallback), new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms))]);

async function googleSuggestions(q: string): Promise<Suggestion[]> {
  const hits = await gmaps.lookupPlace(q);
  return hits.slice(0, 5).map(h => {
    const cats = h.categories.join(' ');
    const kind: Suggestion['kind'] = /\bcountry\b/i.test(cats) ? 'country' : CITY_CATEGORY.test(cats) ? 'city' : AREA_CATEGORY.test(cats) ? 'area' : 'point';
    const secondary = (h.address || '').replace(new RegExp(`^${h.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[,\\s-]*`, 'i'), '');
    return {
      id: `g:${h.lat.toFixed(5)},${h.lon.toFixed(5)}`,
      name: h.title,
      secondary,
      label: secondary ? `${h.title}, ${secondary}` : h.title,
      lat: h.lat,
      lon: h.lon,
      kind,
      source: 'google' as const
    };
  });
}

async function osmSuggestions(q: string): Promise<Suggestion[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6&lang=en`, {
      headers: { 'User-Agent': 'Mozilla/5.0 7StrokesLeads/2.0' },
      signal: controller.signal
    });
    if (!res.ok) return [];
    const data: any = await res.json();
    return (data?.features || []).map((f: any, i: number) => {
      const p = f.properties || {};
      const [lon, lat] = f.geometry?.coordinates || [];
      const name = p.name || [p.housenumber, p.street].filter(Boolean).join(' ') || p.city || p.country || q;
      const parts = [p.district, p.city !== name ? p.city : null, p.state, p.country].filter(Boolean);
      const secondary = Array.from(new Set(parts)).join(', ');
      const type = String(p.type || '');
      const kind: Suggestion['kind'] = type === 'country' ? 'country'
        : ['city', 'county', 'state'].includes(type) ? 'city'
        : ['district', 'locality'].includes(type) ? 'area'
        : 'point';
      const s: Suggestion = {
        id: `o:${p.osm_type || ''}${p.osm_id || i}`,
        name,
        secondary,
        label: secondary ? `${name}, ${secondary}` : name,
        lat: Number(lat),
        lon: Number(lon),
        kind,
        source: 'osm'
      };
      if (Array.isArray(p.extent) && p.extent.length === 4) {
        const [minLon, maxLat, maxLon, minLat] = p.extent.map(Number);
        s.bbox = { minLat, minLon, maxLat, maxLon };
      }
      return s;
    }).filter((s: Suggestion) => Number.isFinite(s.lat) && Number.isFinite(s.lon));
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/places/suggest?q=regal tower
 * Place suggestions for the location box (like the Google Maps search dropdown).
 * Google results come first because they know individual towers and businesses best.
 */
router.get('/suggest', async (req: AuthRequest, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 120) : '';
  if (q.length < 2) return res.json({ items: [] });

  const key = q.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return res.json({ items: hit.items });

  const [google, osm] = await Promise.all([
    withTimeout(googleSuggestions(q), 4500, [] as Suggestion[]),
    withTimeout(osmSuggestions(q), 4000, [] as Suggestion[])
  ]);

  const seen = new Set<string>();
  const items: Suggestion[] = [];
  for (const s of [...google, ...osm]) {
    const dedupe = `${s.name.toLowerCase()}|${s.lat.toFixed(3)}|${s.lon.toFixed(3)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    items.push(s);
    if (items.length >= 8) break;
  }

  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  cache.set(key, { at: Date.now(), items });
  res.json({ items });
});

export default router;
