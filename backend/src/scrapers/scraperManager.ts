import { ScrapedLead, ScraperOptions, ScraperControl, GridBoundingBox } from './types';
import { leadKey, runWorkQueue } from './leadUtils';
import { GmapsHttpProvider } from './http/gmapsHttpProvider';
import { TwoGisHttpProvider } from './http/twoGisHttpProvider';
import { SerpApiGmapsProvider } from './external/serpApiProvider';
import { GmapsPlaywrightFallback } from './playwright/gmapsPlaywrightFallback';
import { TwoGisPlaywrightFallback } from './playwright/twoGisPlaywrightFallback';
import { GeographicPartitioner, SearchPartition } from './partitioner';
import { GeoGrid } from './grid/geoGrid';

export class ScraperManager {
  private gmapsHttp = new GmapsHttpProvider();
  private gmapsExternal = new SerpApiGmapsProvider();
  private gmapsPlaywright = new GmapsPlaywrightFallback();

  private twoGisHttp = new TwoGisHttpProvider();
  private twoGisPlaywright = new TwoGisPlaywrightFallback();

  /** Bounding boxes that the adaptive grid should cover for this target. */
  private async getSweepAreas(options: ScraperOptions): Promise<{ name: string; bbox: GridBoundingBox }[]> {
    if (options.bbox) return [{ name: 'custom area', bbox: options.bbox }];

    const { location, country } = GeographicPartitioner.parseTarget(options.query, options.city);
    if (!location) return [];

    if (country) {
      const areas: { name: string; bbox: GridBoundingBox }[] = [];
      for (const city of country.cities) {
        const bbox = await GeoGrid.resolveCityBoundingBox(`${city}, ${country.name}`)
          || await GeoGrid.resolveCityBoundingBox(city);
        if (bbox) areas.push({ name: city, bbox });
      }
      return areas;
    }

    const bbox = await GeoGrid.resolveCityBoundingBox(location);
    return bbox ? [{ name: location, bbox }] : [];
  }

  /** Map zoom whose 1280px-wide viewport roughly covers a cell of `sizeKm`. */
  private static zoomForCell(sizeKm: number, lat: number): number {
    const cosLat = Math.max(Math.cos((lat * Math.PI) / 180), 0.05);
    const z = Math.log2((156543.03 * cosLat * 1280) / (sizeKm * 1000 * 1.3));
    return Math.min(18, Math.max(11, Math.round(z)));
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

    const handleSave = async (lead: ScrapedLead) => {
      if (capReached()) return;
      const key = leadKey(lead);
      if (seenKeys.has(key)) return;
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
      // Phase 1: named-area queries (city, neighbourhoods, or a country's cities)
      const partitions: SearchPartition[] = await GeographicPartitioner.resolveSearchPartitions(query, options.city);
      await log(`[Phase 1] Searching ${partitions.length} named areas`);

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
        const { keyword } = GeographicPartitioner.parseTarget(query, options.city);
        const areas = await this.getSweepAreas(options);
        const initialSizeKm = options.cellSizeKm && options.cellSizeKm > 0 ? options.cellSizeKm : 4;
        const minSizeKm = 0.5;

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
        await this.twoGisHttp.search(options, { ...subControl, log });
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
    await log(`Extraction finished. Total unique leads collected: ${allLeads.length}`);
    return allLeads;
  }
}
