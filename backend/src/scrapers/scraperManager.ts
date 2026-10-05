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

  private getGridCells(options: ScraperOptions): GridCell[] {
    if (options.bbox) {
      return GeoGrid.generateCells(options.bbox, options.cellSizeKm || 3.0);
    }
    const detectedBbox = options.city ? GeoGrid.getBoundingBoxForCity(options.city) : null;
    if (detectedBbox) {
      return GeoGrid.generateCells(detectedBbox, options.cellSizeKm || 3.0);
    }
    for (const city of ['dubai', 'abu_dhabi', 'riyadh', 'jeddah', 'doha', 'london', 'new_york']) {
      if (options.query.toLowerCase().includes(city.replace('_', ' '))) {
        const bbox = GeoGrid.getBoundingBoxForCity(city);
        if (bbox) {
          return GeoGrid.generateCells(bbox, options.cellSizeKm || 3.0);
        }
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

    const handleSave = async (lead: ScrapedLead) => {
      const normalizedKey = (lead.phone_1 || lead.title).toLowerCase().trim();
      if (!seenTitles.has(normalizedKey)) {
        seenTitles.add(normalizedKey);
        await saveLead(lead);
        allLeads.push(lead);
        await updateProgress(allLeads.length, allLeads.length);
      }
    };

    if (engine === 'gmaps') {
      const cells = this.getGridCells(options);

      if (cells.length > 0) {
        await log(`[Geo Grid] Partitioned area into ${cells.length} geographic cells for maximum coverage`);

        for (let i = 0; i < cells.length; i++) {
          if (await checkCancelled()) break;
          if (cap > 0 && allLeads.length >= cap) break;

          const cell = cells[i];
          await log(`[Geo Grid] Searching Cell ${i + 1}/${cells.length} at (${cell.lat}, ${cell.lon})`);

          let cellLeads: ScrapedLead[] = [];
          try {
            cellLeads = await this.gmapsHttp.search(
              { ...options, lat: cell.lat, lon: cell.lon, zoom: 14, maxPagesPerCell: 3 },
              {
                checkCancelled,
                log,
                updateProgress: async () => {},
                saveLead: async () => {}
              }
            );
          } catch (err: any) {
            await log(`[HTTP Error] Cell ${i + 1}: ${err.message}`);
          }

          if (cellLeads.length === 0 && !(await checkCancelled())) {
            if (this.gmapsExternal.isAvailable()) {
              try {
                cellLeads = await this.gmapsExternal.search(
                  { ...options, query: `${query} near ${cell.lat},${cell.lon}` },
                  {
                    checkCancelled,
                    log,
                    updateProgress: async () => {},
                    saveLead: async () => {}
                  }
                );
              } catch {}
            }
          }

          for (const lead of cellLeads) {
            if (await checkCancelled()) break;
            if (cap > 0 && allLeads.length >= cap) break;
            await handleSave(lead);
          }

          await new Promise(r => setTimeout(r, 600));
        }

        if (allLeads.length > 0) {
          await log(`[Completed] Finished grid search. Collected ${allLeads.length} unique leads.`);
          return allLeads;
        }
      }

      const subQueries = GeographicPartitioner.getSubQueries(query);
      for (let idx = 0; idx < subQueries.length; idx++) {
        if (await checkCancelled()) break;
        if (cap > 0 && allLeads.length >= cap) break;

        const subQ = subQueries[idx];
        let subLeads: ScrapedLead[] = [];

        try {
          subLeads = await this.gmapsHttp.search(
            { ...options, query: subQ },
            {
              checkCancelled,
              log,
              updateProgress: async () => {},
              saveLead: async () => {}
            }
          );
        } catch (err: any) {
          await log(`[HTTP Primary Failed] ${err.message}. Trying fallbacks...`);
        }

        if (subLeads.length === 0 && !(await checkCancelled())) {
          if (this.gmapsExternal.isAvailable()) {
            await log(`[External API Fallback] Triggering SerpApi for "${subQ}"`);
            try {
              subLeads = await this.gmapsExternal.search(
                { ...options, query: subQ },
                {
                  checkCancelled,
                  log,
                  updateProgress: async () => {},
                  saveLead: async () => {}
                }
              );
            } catch (extErr: any) {
              await log(`[External API Failed] ${extErr.message}`);
            }
          }
        }

        if (subLeads.length === 0 && !(await checkCancelled())) {
          await log(`[Playwright Fallback] Triggering browser automation for "${subQ}"`);
          try {
            subLeads = await this.gmapsPlaywright.search(
              { ...options, query: subQ },
              {
                checkCancelled,
                log,
                updateProgress: async () => {},
                saveLead: async () => {}
              }
            );
          } catch (pwErr: any) {
            await log(`[Playwright Fallback Failed] ${pwErr.message}`);
          }
        }

        for (const lead of subLeads) {
          if (await checkCancelled()) break;
          if (cap > 0 && allLeads.length >= cap) break;
          await handleSave(lead);
        }
      }
    } else {
      let leads: ScrapedLead[] = [];
      try {
        leads = await this.twoGisHttp.search(options, {
          checkCancelled,
          log,
          updateProgress: async () => {},
          saveLead: async () => {}
        });
      } catch (err: any) {
        await log(`[2GIS HTTP Failed] ${err.message}. Triggering Playwright fallback...`);
      }

      if (leads.length === 0 && !(await checkCancelled())) {
        try {
          leads = await this.twoGisPlaywright.search(options, {
            checkCancelled,
            log,
            updateProgress: async () => {},
            saveLead: async () => {}
          });
        } catch (pwErr: any) {
          await log(`[2GIS Playwright Failed] ${pwErr.message}`);
        }
      }

      for (const lead of leads) {
        if (await checkCancelled()) break;
        if (cap > 0 && allLeads.length >= cap) break;
        await handleSave(lead);
      }
    }

    await log(`Extraction finished. Total unique leads collected: ${allLeads.length}`);
    return allLeads;
  }
}
