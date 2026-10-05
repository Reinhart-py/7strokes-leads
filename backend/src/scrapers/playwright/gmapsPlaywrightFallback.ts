import { chromium } from 'playwright-core';
import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl } from '../types';

export class GmapsPlaywrightFallback implements IScraperProvider {
  public readonly name = 'GoogleMaps-Playwright';

  private async extractActivePane(page: any) {
    const data = {
      title: 'Unknown',
      phone_1: null as string | null,
      phone_2: null as string | null,
      website: null as string | null,
      address: null as string | null,
      rating: null as string | null,
      reviews: null as string | null
    };

    try {
      const titleEl = await page.$('h1.DUwDvf');
      if (titleEl) data.title = (await titleEl.innerText()).replace(/\r?\n/g, ' ').trim();
    } catch {}

    try {
      const phoneHandles = await page.$$('button[data-item-id^="phone:"], a[href^="tel:"]');
      const phones = [];
      for (const el of phoneHandles) {
        const text = await el.innerText();
        if (text) phones.push(text.replace(/Phone:/i, '').replace(/[^\d+ \-()]/g, '').trim());
      }
      if (phones[0]) data.phone_1 = phones[0];
      if (phones[1]) data.phone_2 = phones[1];
    } catch {}

    try {
      const addrEl = await page.$('button[data-item-id="address"]');
      if (addrEl) data.address = (await addrEl.innerText()).replace('Address:', '').trim();
    } catch {}

    try {
      const webEl = await page.$('a[data-item-id="authority"]');
      if (webEl) data.website = (await webEl.getAttribute('href')) || null;
    } catch {}

    return data;
  }

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    const { query, cap = 0 } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    await log(`[Fallback] Launching Playwright browser for: "${query}"`);
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ locale: 'en-US' });
    const page = await context.newPage();

    const results: ScrapedLead[] = [];
    const seenTitles = new Set<string>();

    try {
      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
      await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
      await page.waitForTimeout(2000);

      let scrollRounds = 0;
      while (scrollRounds < 15) {
        if (await checkCancelled()) break;
        if (cap > 0 && results.length >= cap) break;

        const visibleItems = await page.$$('div[role="feed"] a.hfpxzc, div[role="feed"] a[href*="/maps/place/"]');
        if (visibleItems.length === 0) break;

        for (const item of visibleItems) {
          if (await checkCancelled()) break;
          if (cap > 0 && results.length >= cap) break;

          try {
            await item.scrollIntoViewIfNeeded().catch(() => {});
            await item.click({ timeout: 3000 }).catch(() => {});
            await page.waitForTimeout(1200);

            const details = await this.extractActivePane(page);
            if (details.title && details.title !== 'Unknown' && !seenTitles.has(details.title)) {
              seenTitles.add(details.title);
              const lead: ScrapedLead = {
                query,
                ...details
              };
              await saveLead(lead);
              results.push(lead);
              await log(`[Fallback] Saved: ${details.title}`);
              await updateProgress(scrollRounds, results.length);
            }
          } catch {}
        }

        const isEndOfFeed = await page.$('span:has-text("reached the end of the list"), div:has-text("No more results")').catch(() => null);
        if (isEndOfFeed) break;

        try {
          const feed = page.locator('div[role="feed"]').first();
          if (await feed.isVisible().catch(() => false)) {
            await feed.evaluate((el: any) => el.scrollBy(0, 1100));
          }
          await page.waitForTimeout(1500);
        } catch {
          break;
        }

        scrollRounds++;
      }
    } finally {
      await browser.close().catch(() => {});
    }

    return results;
  }
}
