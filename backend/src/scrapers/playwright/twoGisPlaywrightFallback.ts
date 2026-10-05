import { chromium } from 'playwright-core';
import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl } from '../types';

export class TwoGisPlaywrightFallback implements IScraperProvider {
  public readonly name = '2GIS-Playwright';

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    const { query, city = 'dubai', cap = 0 } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    await log(`[Fallback] Launching Playwright browser for 2GIS: "${query}" in "${city}"`);
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();

    const results: ScrapedLead[] = [];
    const seenTitles = new Set<string>();

    try {
      const searchUrl = `https://2gis.ae/${encodeURIComponent(city)}/search/${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
      await page.waitForTimeout(3000);

      const items = await page.$$('div._1kf6gff, div._z72q9m, div._1hf7139');
      let count = 0;

      for (const item of items) {
        if (await checkCancelled()) break;
        if (cap > 0 && results.length >= cap) break;

        try {
          const titleEl = await item.$('span._1al0wlf, a._1rehek');
          const title = titleEl ? (await titleEl.innerText()).trim() : '';

          if (title && !seenTitles.has(title)) {
            seenTitles.add(title);
            const addressEl = await item.$('span._1w9o2igt, div._er2xx9');
            const address = addressEl ? (await addressEl.innerText()).trim() : null;

            const lead: ScrapedLead = {
              query,
              title,
              category: null,
              phone_1: null,
              phone_2: null,
              website: null,
              address,
              rating: null,
              reviews: null
            };

            await saveLead(lead);
            results.push(lead);
            count++;
            await updateProgress(count, results.length);
          }
        } catch {}
      }
    } finally {
      await browser.close().catch(() => {});
    }

    return results;
  }
}
