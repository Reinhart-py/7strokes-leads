import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl, GridCell } from './types';
import { GmapsHttpProvider } from './http/gmapsHttpProvider';
import { TwoGisHttpProvider } from './http/twoGisHttpProvider';
import { SerpApiGmapsProvider } from './external/serpApiProvider';
import { GmapsPlaywrightFallback } from './playwright/gmapsPlaywrightFallback';
import { TwoGisPlaywrightFallback } from './playwright/twoGisPlaywrightFallback';
import { GeographicPartitioner } from './partitioner';
import { GeoGrid } from './grid/geoGrid';

export class ScraperManager {
  private gmapsHttp = new GmapsHttpProvider();
  private gmapsExternal = new SerpApiGmapsProvider();
  private gmapsPlaywright = new GmapsPlaywrightFallback();

  private twoGisHttp = new TwoGisHttpProvider();
  private twoGisPlaywright = new TwoGisPlaywrightFallback();

  private async getGridCells(options: ScraperOptions): Promise<GridCell[]> {
    if (options.bbox) {
      return GeoGrid.generateCells(options.bbox, options.cellSizeKm || 3.0);
    }

    let cityCandidate = options.city || '';
    if (!cityCandidate) {
      const inMatch = options.query.match(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i);
      if (inMatch && inMatch[1]) {
        cityCandidate = inMatch[1].trim();
      } else {
        const words = options.query.trim().split(/\s+/);
        if (words.length >= 2) {
          const lastWord = words[words.length - 1];
          if (GeoGrid.getBoundingBoxForCity(lastWord)) {
            cityCandidate = lastWord;
          }
        }
      }
    }

    if (cityCandidate) {
      const detectedBbox = await GeoGrid.resolveCityBoundingBox(cityCandidate);
      if (detectedBbox) {
        return GeoGrid.generateCells(detectedBbox, options.cellSizeKm || 3.2);
      }
    }

    return [];
  }

  public async run(
    engine: 'gmaps' | '2gis',
    options: ScraperOptions,
    control: ScraperControl
  ): Promise<ScrapedLead[]> {
    const { query, cap = 0 } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    const allLeads: ScrapedLead[] = [];
    const seenTitles = new Set<string>();

    let lastProgressTime = 0;
    const handleSave = async (lead: ScrapedLead) => {
      const normalizedKey = (lead.phone_1 || lead.title).toLowerCase().trim();
      if (!seenTitles.has(normalizedKey)) {
        seenTitles.add(normalizedKey);
        await saveLead(lead);
        allLeads.push(lead);
        const now = Date.now();
        if (now - lastProgressTime > 1000 || allLeads.length % 20 === 0) {
          lastProgressTime = now;
          await updateProgress(allLeads.length, allLeads.length);
        }
      }
    };

    if (engine === 'gmaps') {
      const subQueries = GeographicPartitioner.getSubQueries(query);
      await log(`[Partition Engine] Expanded target into ${subQueries.length} locality search partitions`);

      const concurrency = options.concurrency && options.concurrency > 0 ? options.concurrency : 4;

      for (let idx = 0; idx < subQueries.length; idx += concurrency) {
        if (await checkCancelled()) break;
        if (cap > 0 && allLeads.length >= cap) break;

        const batch = subQueries.slice(idx, idx + concurrency);
        await Promise.all(
          batch.map(async (subQ) => {
            if (await checkCancelled()) return;
            if (cap > 0 && allLeads.length >= cap) return;

            try {
              const subLeads = await this.gmapsHttp.search(
                { ...options, query: subQ, maxPagesPerCell: 5, seenKeys: seenTitles },
                {
                  checkCancelled,
                  log: async () => {},
                  updateProgress: async () => {},
                  saveLead: handleSave
                }
              );

              if (subLeads.length === 0 && !(await checkCancelled()) && this.gmapsExternal.isAvailable()) {
                try {
                  await this.gmapsExternal.search(
                    { ...options, query: subQ, seenKeys: seenTitles },
                    {
                      checkCancelled,
                      log: async () => {},
                      updateProgress: async () => {},
                      saveLead: handleSave
                    }
                  );
                } catch {}
              }
            } catch (err: any) {
              await log(`[HTTP Error] ${subQ}: ${err.message}`);
            }
          })
        );
      }

      if (allLeads.length === 0 && !(await checkCancelled())) {
        try {
          await this.gmapsPlaywright.search(
            { ...options, query, seenKeys: seenTitles },
            {
              checkCancelled,
              log,
              updateProgress: async () => {},
              saveLead: handleSave
            }
          );
        } catch (pwErr: any) {
          await log(`[Playwright Fallback Failed] ${pwErr.message}`);
        }
      }

      if ((cap === 0 || allLeads.length < cap) && !(await checkCancelled())) {
        const cells = await this.getGridCells(options);
        if (cells.length > 0) {
          await log(`[Geo Grid] Sweeping ${cells.length} geographic coordinate cells in parallel`);
          const gridConcurrency = Math.min(concurrency + 2, 8);
          for (let i = 0; i < cells.length; i += gridConcurrency) {
            if (await checkCancelled()) break;
            if (cap > 0 && allLeads.length >= cap) break;

            const batch = cells.slice(i, i + gridConcurrency);
            await Promise.all(
              batch.map(async (cell) => {
                if (await checkCancelled()) return;
                if (cap > 0 && allLeads.length >= cap) return;

                try {
                  await this.gmapsHttp.search(
                    {
                      ...options,
                      lat: cell.lat,
                      lon: cell.lon,
                      zoom: 14,
                      maxPagesPerCell: 3,
                      seenKeys: seenTitles
                    },
                    {
                      checkCancelled,
                      log: async () => {},
                      updateProgress: async () => {},
                      saveLead: handleSave
                    }
                  );
                } catch {}
              })
            );
          }
        }
      }
    } else {
      try {
        await this.twoGisHttp.search(options, {
          checkCancelled,
          log,
          updateProgress: async () => {},
          saveLead: handleSave
        });
      } catch (httpErr: any) {
        await log(`[2GIS HTTP Error] ${httpErr.message}. Trying browser fallback...`);
        try {
          await this.twoGisPlaywright.search(options, {
            checkCancelled,
            log,
            updateProgress: async () => {},
            saveLead: handleSave
          });
        } catch (pwErr: any) {
          await log(`[2GIS Fallback Failed] ${pwErr.message}`);
        }
      }
    }

    await updateProgress(allLeads.length, allLeads.length);
    await log(`Extraction finished. Total unique leads collected: ${allLeads.length}`);
    return allLeads;
  }
}
