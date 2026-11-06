import { ScrapedLead, ScraperOptions, ScraperControl, GridBoundingBox } from './types';
import { leadKey, runWorkQueue } from './leadUtils';
import { GmapsHttpProvider } from './http/gmapsHttpProvider';
import { TwoGisHttpProvider } from './http/twoGisHttpProvider';
import { SerpApiGmapsProvider } from './external/serpApiProvider';
import { GmapsPlaywrightFallback } from './playwright/gmapsPlaywrightFallback';
import { TwoGisPlaywrightFallback } from './playwright/twoGisPlaywrightFallback';
import { GeographicPartitioner, SearchPartition } from './partitioner';
import { GeoGrid } from './grid/geoGrid';
import { LocationResolver, ResolvedPlace } from './locationResolver';

export class ScraperManager {
  private gmapsHttp = new GmapsHttpProvider();
  private gmapsExternal = new SerpApiGmapsProvider();
  private gmapsPlaywright = new GmapsPlaywrightFallback();

  private twoGisHttp = new TwoGisHttpProvider();
  private twoGisPlaywright = new TwoGisPlaywrightFallback();

  /** Bounding boxes that the adaptive grid should cover for this target. */
  private async getSweepAreas(
    options: ScraperOptions,
    place: ResolvedPlace | null,
    scope: 'exact' | 'extended'
  ): Promise<{ name: string; bbox: GridBoundingBox }[]> {
    if (options.bbox) return [{ name: 'custom area', bbox: options.bbox }];
    if (!place) return [];

    if (place.kind === 'country' && place.country) {
      const areas: { name: string; bbox: GridBoundingBox }[] = [];
      for (const city of place.country.cities) {
        const bbox = GeoGrid.getKnownCityExact(city)
          || await GeoGrid.resolveCityBoundingBox(`${city}, ${place.country.name}`)
          || await GeoGrid.resolveCityBoundingBox(city);
        if (bbox) areas.push({ name: city, bbox });
      }
      return areas;
    }

    const bbox = LocationResolver.sweepBox(place, scope);
    return bbox ? [{ name: place.full, bbox }] : [];
  }

  /** Phase-1 queries, chosen by what kind of place was typed and the search scope. */
  private async buildPartitions(
    options: ScraperOptions,
    keyword: string,
    place: ResolvedPlace | null,
    scope: 'exact' | 'extended'
  ): Promise<SearchPartition[]> {
    const { query } = options;
    if (!place) return [{ query }];

    if (place.kind === 'country' || place.kind === 'city') {
      return GeographicPartitioner.resolveSearchPartitions(query, options.city);
    }

    const at = place.lat !== undefined ? { lat: place.lat, lon: place.lon } : {};
    const named = `${keyword} in ${place.full}`;

    if (place.kind === 'point') {
      return scope === 'exact'
        ? [
            { query: named, ...at, zoom: 17 },
            { query: `${keyword} ${place.name}`, ...at, zoom: 18 },
            { query: `${keyword} near ${place.full}`, ...at, zoom: 18 },
            { query: keyword, ...at, zoom: 18 },
            { query: keyword, ...at, zoom: 19 }
          ]
        : [
            { query: named, ...at, zoom: 16 },
            { query: `${keyword} near ${place.full}`, ...at, zoom: 15 },
            { query: keyword, ...at, zoom: 15 }
          ];
    }

    if (place.kind === 'area') {
      return [
        { query: named, ...at, zoom: scope === 'exact' ? 15 : 14 },
        { query: `${keyword} ${place.name}`, ...at, zoom: 15 },
        { query: keyword, ...at, zoom: 15 }
      ];
    }

    return [{ query }, { query: `${keyword} ${place.full}` }];
  }

  /** Map zoom whose 1280px-wide viewport roughly covers a cell of `sizeKm`. */
  private static zoomForCell(sizeKm: number, lat: number): number {
    const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.05);
    const z = Math.log2((156543.03 * cosLat * 1280) / (sizeKm * 1000 * 1.3));
    return Math.min(19, Math.max(11, Math.round(z)));
  }

  public async run(
    engine: 'gmaps' | '2gis',
    options: ScraperOptions,
    control: ScraperControl
  ): Promise<ScrapedLead[]> {
    const { query } = options;
    const cap = options.cap && options.cap > 0 ? Math.floor(options.cap) : 0;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    const allLeads: ScrapedLead[] = [];
    const seenKeys = new Set<string>();
    let areasScanned = 0;

    // Cancellation hits the DB, so only check it once a second.
    let cancelled = false;
    let lastCancelCheck = 0;
    const isCancelled = async () => {
      if (cancelled) return true;
      const now = Date.now();
      if (now - lastCancelCheck > 1000) {
        lastCancelCheck = now;
        cancelled = await checkCancelled().catch(() => false);
      }
      return cancelled;
    };
    const capReached = () => cap > 0 && allLeads.length >= cap;
    const shouldStop = async () => capReached() || (await isCancelled());

    let lastProgressTime = 0;
    const reportProgress = async (force = false) => {
      const now = Date.now();
      if (force || now - lastProgressTime > 1000) {
        lastProgressTime = now;
        await updateProgress(areasScanned, allLeads.length).catch(() => {});
      }
    };

    const scope: 'exact' | 'extended' = options.scope === 'exact' ? 'exact' : 'extended';
    const { keyword, location } = GeographicPartitioner.parseTarget(query, options.city);
    let place: ResolvedPlace | null = null;
    if (location) {
      place = await LocationResolver.resolve(location, (text) => this.gmapsHttp.lookupPlace(text, options.proxy));
      await log(`[Location] ${LocationResolver.describe(place)} | scope: ${scope}`);
    }

    // Exact mode: every candidate must actually be inside the typed place.
    const insidePlace = scope === 'exact' && place ? LocationResolver.buildExactFilter(place) : null;
    const rejectedKeys = new Set<string>();

    const handleSave = async (lead: ScrapedLead) => {
      if (capReached()) return;
      const key = leadKey(lead);
      if (seenKeys.has(key)) return;
      if (insidePlace && !insidePlace(lead)) {
        rejectedKeys.add(key);
        return;
      }
      // Reserve the slot synchronously so concurrent workers never overshoot the cap.
      seenKeys.add(key);
      allLeads.push(lead);
      await saveLead(lead);
      await reportProgress();
    };

    const subControl: ScraperControl = {
      checkCancelled: shouldStop,
      log: async () => {},
      updateProgress: async () => {},
      saveLead: handleSave
    };

    const concurrency = options.concurrency && options.concurrency > 0 ? options.concurrency : 4;

    if (engine === 'gmaps') {
      // Phase 1: named-area queries (country cities, city neighbourhoods, or the exact place)
      const partitions = await this.buildPartitions(options, keyword, place, scope);
      await log(`[Phase 1] Searching ${partitions.length} targeted queries`);

      await runWorkQueue(partitions, concurrency, async (partition) => {
        try {
          const { leads } = await this.gmapsHttp.searchArea(
            {
              ...options,
              query: partition.query,
              lat: partition.lat,
              lon: partition.lon,
              zoom: partition.zoom,
              maxPagesPerCell: 6,
              seenKeys
            },
            subControl
          );

          if (leads.length === 0 && !(await shouldStop()) && this.gmapsExternal.isAvailable()) {
            await this.gmapsExternal.search({ ...options, query: partition.query, seenKeys }, subControl).catch(() => {});
          }
        } catch (err: any) {
          await log(`[HTTP Error] ${partition.query}: ${err.message}`);
        } finally {
          areasScanned++;
          await reportProgress();
        }
      }, shouldStop);

      if (allLeads.length === 0 && !(await shouldStop())) {
        try {
          await this.gmapsPlaywright.search({ ...options, query, seenKeys }, { ...subControl, log });
        } catch (pwErr: any) {
          await log(`[Playwright Fallback Failed] ${pwErr.message}`);
        }
      }

      // Phase 2: adaptive geo grid. Google returns at most ~120 places per
      // viewport, so any cell that fills every page is split into four smaller
      // cells and searched again, until results stop growing.
      if (!(await shouldStop())) {
        const areas = await this.getSweepAreas(options, place, scope);
        // Cell size follows the area: ~4 km for cities, a few hundred metres around a single tower.
        const widestKm = Math.max(0, ...areas.map(a => (a.bbox.maxLat - a.bbox.minLat) * 111.32));
        const initialSizeKm = options.cellSizeKm && options.cellSizeKm > 0
          ? options.cellSizeKm
          : Math.min(4, Math.max(0.15, widestKm / 3));
        const minSizeKm = place?.kind === 'point' && scope === 'exact' ? 0.08 : Math.min(0.5, initialSizeKm / 2);

        type Cell = { lat: number; lon: number; sizeKm: number };
        const cells: Cell[] = [];
        for (const area of areas) {
          for (const c of GeoGrid.generateCells(area.bbox, initialSizeKm)) {
            cells.push({ lat: c.lat, lon: c.lon, sizeKm: initialSizeKm });
          }
        }

        if (cells.length > 0) {
          await log(`[Phase 2] Sweeping ${cells.length} grid cells across ${areas.length} area(s); dense cells are subdivided automatically`);
          const gridConcurrency = Math.min(concurrency + 2, 10);
          let splits = 0;

          await runWorkQueue<Cell>(cells, gridConcurrency, async (cell, enqueue) => {
            try {
              const { saturated } = await this.gmapsHttp.searchArea(
                {
                  ...options,
                  query: keyword,
                  lat: cell.lat,
                  lon: cell.lon,
                  zoom: ScraperManager.zoomForCell(cell.sizeKm, cell.lat),
                  maxPagesPerCell: 6,
                  seenKeys
                },
                subControl
              );

              const half = cell.sizeKm / 2;
              if (saturated && half >= minSizeKm) {
                splits++;
                const dLat = half / 2 / 111.32;
                const dLon = half / 2 / (111.32 * Math.max(Math.cos((cell.lat * Math.PI) / 180), 0.05));
                enqueue(
                  { lat: cell.lat + dLat, lon: cell.lon - dLon, sizeKm: half },
                  { lat: cell.lat + dLat, lon: cell.lon + dLon, sizeKm: half },
                  { lat: cell.lat - dLat, lon: cell.lon - dLon, sizeKm: half },
                  { lat: cell.lat - dLat, lon: cell.lon + dLon, sizeKm: half }
                );
              }
            } finally {
              areasScanned++;
              await reportProgress();
            }
          }, shouldStop);

          await log(`[Phase 2] Grid done: ${areasScanned} areas scanned, ${splits} dense cells subdivided`);
        }
      }
    } else {
      try {
        const placeName = place && (place.kind === 'point' || place.kind === 'area') ? place.name : undefined;
        await this.twoGisHttp.search({ ...options, placeName }, { ...subControl, log });
      } catch (httpErr: any) {
        await log(`[2GIS HTTP Error] ${httpErr.message}. Trying browser fallback...`);
        try {
          await this.twoGisPlaywright.search(options, { ...subControl, log });
        } catch (pwErr: any) {
          await log(`[2GIS Fallback Failed] ${pwErr.message}`);
        }
      }
    }

    await reportProgress(true);
    if (insidePlace) {
      await log(`[Exact] Kept ${allLeads.length} leads inside "${place!.full}", skipped ${rejectedKeys.size} nearby businesses outside it`);
    }
    await log(`Extraction finished. Total unique leads collected: ${allLeads.length}`);
    return allLeads;
  }
}
