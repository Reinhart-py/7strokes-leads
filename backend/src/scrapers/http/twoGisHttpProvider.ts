import { ProxyAgent } from 'undici';
import { chromium } from 'playwright-core';
import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl } from '../types';

interface RegionMapping {
  domain: string;
  citySlug: string;
  coords?: string;
  country: string;
  city: string;
}

const REGION_REGISTRY: Record<string, RegionMapping> = {
  'abu dhabi': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '54.3773%2C24.4539%2F12', country: 'United Arab Emirates', city: 'Abu Dhabi' },
  'abudhabi': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '54.3773%2C24.4539%2F12', country: 'United Arab Emirates', city: 'Abu Dhabi' },
  'dubai': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.2708%2C25.2048%2F12', country: 'United Arab Emirates', city: 'Dubai' },
  'sharjah': { domain: 'https://2gis.ae', citySlug: 'sharjah', coords: '55.3919%2C25.3573%2F12', country: 'United Arab Emirates', city: 'Sharjah' },
  'ajman': { domain: 'https://2gis.ae', citySlug: 'ajman', coords: '55.4522%2C25.4052%2F12', country: 'United Arab Emirates', city: 'Ajman' },
  'ras al khaimah': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.9432%2C25.7895%2F12', country: 'United Arab Emirates', city: 'Ras Al Khaimah' },
  'rak': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.9432%2C25.7895%2F12', country: 'United Arab Emirates', city: 'Ras Al Khaimah' },
  'fujairah': { domain: 'https://2gis.ae', citySlug: 'fujairah', coords: '56.3265%2C25.1288%2F12', country: 'United Arab Emirates', city: 'Fujairah' },
  'umm al quwain': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.5532%2C25.5653%2F12', country: 'United Arab Emirates', city: 'Umm Al Quwain' },
  'uaq': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.5532%2C25.5653%2F12', country: 'United Arab Emirates', city: 'Umm Al Quwain' },
  'al ain': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.760559%2C24.207500%2F11.0', country: 'United Arab Emirates', city: 'Al Ain' },

  'riyadh': { domain: 'https://2gis.com', citySlug: 'riyadh', country: 'Saudi Arabia', city: 'Riyadh' },
  'jeddah': { domain: 'https://2gis.com', citySlug: 'jeddah', country: 'Saudi Arabia', city: 'Jeddah' },
  'doha': { domain: 'https://2gis.com', citySlug: 'doha', country: 'Qatar', city: 'Doha' },
  'kuwait': { domain: 'https://2gis.com', citySlug: 'kuwait', country: 'Kuwait', city: 'Kuwait City' },
  'kuwait city': { domain: 'https://2gis.com', citySlug: 'kuwait', country: 'Kuwait', city: 'Kuwait City' },
  'manama': { domain: 'https://2gis.com', citySlug: 'manama', country: 'Bahrain', city: 'Manama' },
  'bahrain': { domain: 'https://2gis.com', citySlug: 'manama', country: 'Bahrain', city: 'Manama' },
  'muscat': { domain: 'https://2gis.com', citySlug: 'muscat', country: 'Oman', city: 'Muscat' },
  'oman': { domain: 'https://2gis.com', citySlug: 'muscat', country: 'Oman', city: 'Muscat' },

  'almaty': { domain: 'https://2gis.kz', citySlug: 'almaty', country: 'Kazakhstan', city: 'Almaty' },
  'astana': { domain: 'https://2gis.kz', citySlug: 'astana', country: 'Kazakhstan', city: 'Astana' },
  'shymkent': { domain: 'https://2gis.kz', citySlug: 'shymkent', country: 'Kazakhstan', city: 'Shymkent' },
  'tashkent': { domain: 'https://2gis.uz', citySlug: 'tashkent', country: 'Uzbekistan', city: 'Tashkent' },
  'samarkand': { domain: 'https://2gis.uz', citySlug: 'samarkand', country: 'Uzbekistan', city: 'Samarkand' },
  'bishkek': { domain: 'https://2gis.kg', citySlug: 'bishkek', country: 'Kyrgyzstan', city: 'Bishkek' },
  'osh': { domain: 'https://2gis.kg', citySlug: 'osh', country: 'Kyrgyzstan', city: 'Osh' },
  'baku': { domain: 'https://2gis.az', citySlug: 'baku', country: 'Azerbaijan', city: 'Baku' },
  'cyprus': { domain: 'https://2gis.com.cy', citySlug: 'cyprus', country: 'Cyprus', city: 'Cyprus' },
  'limassol': { domain: 'https://2gis.com.cy', citySlug: 'cyprus', country: 'Cyprus', city: 'Limassol' },
  'nicosia': { domain: 'https://2gis.com.cy', citySlug: 'cyprus', country: 'Cyprus', city: 'Nicosia' }
};

let cachedCookieHeader = '';
let cookieCachedAt = 0;

export class TwoGisHttpProvider implements IScraperProvider {
  public readonly name = '2GIS-HTTP';

  private resolveRegion(query: string, cityOption?: string): RegionMapping {
    const qLower = (query || '').toLowerCase().trim();
    const cLower = (cityOption || '').toLowerCase().trim();

    if (cLower) {
      if (REGION_REGISTRY[cLower]) {
        return REGION_REGISTRY[cLower];
      }
      const sortedKeys = Object.keys(REGION_REGISTRY).sort((a, b) => b.length - a.length);
      for (const key of sortedKeys) {
        if (cLower.includes(key) || key.includes(cLower)) {
          return REGION_REGISTRY[key];
        }
      }
    }

    const sortedKeys = Object.keys(REGION_REGISTRY).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (qLower.includes(key)) {
        return REGION_REGISTRY[key];
      }
    }

    return REGION_REGISTRY['dubai'];
  }

  private async getSessionCookieHeader(domain: string): Promise<string> {
    const now = Date.now();
    if (cachedCookieHeader && now - cookieCachedAt < 3600000) {
      return cachedCookieHeader;
    }

    const browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
    });

    try {
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      });
      const page = await context.newPage();
      await page.goto(`${domain}/dubai`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});

      const acceptBtn = await page.$('#acceptRiskButton');
      if (acceptBtn) {
        await acceptBtn.click().catch(() => {});
        await page.waitForTimeout(2500);
      }

      const cookies = await context.cookies();
      if (cookies.length > 0) {
        cachedCookieHeader = cookies.map(c => `${c.name}=${c.value}`).join('; ');
        cookieCachedAt = now;
      }
    } finally {
      await browser.close().catch(() => {});
    }

    return cachedCookieHeader;
  }

  private getDispatcher() {
    const proxyUrl = process.env.PROXY_URL || process.env.HTTP_PROXY || '';
    return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  }

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    const { query, city, cap = 0 } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    const region = this.resolveRegion(query, city);
    const cleanKeyword = query.replace(/\bin\s+[a-zA-Z\s,]+$/i, '').trim() || query.trim();

    await log(`[2GIS-HTTP Worker] Initializing fast HTTP engine for ${region.city}, ${region.country}`);
    await log(`[2GIS-HTTP Worker] Keyword: "${cleanKeyword}"`);

    const cookieHeader = await this.getSessionCookieHeader(region.domain);
    const dispatcher = this.getDispatcher();

    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': cookieHeader
    };

    const results: ScrapedLead[] = [];
    const seenTitles = new Set<string>();
    const maxPages = cap > 0 ? Math.min(25, Math.ceil(cap / 12) + 2) : 20;

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      if (await checkCancelled()) break;
      if (cap > 0 && results.length >= cap) break;

      const coordsSuffix = region.coords ? (region.coords.startsWith('?') ? region.coords : `?m=${region.coords}`) : '';
      const pageUrl = pageNum === 1
        ? `${region.domain}/${region.citySlug}/search/${encodeURIComponent(cleanKeyword)}${coordsSuffix}`
        : `${region.domain}/${region.citySlug}/search/${encodeURIComponent(cleanKeyword)}/page/${pageNum}${coordsSuffix}`;

      await log(`[2GIS-HTTP Page ${pageNum}] Fetching HTTP catalog: ${pageUrl}`);

      let pageHtml = '';
      try {
        const fetchOpts: any = { headers };
        if (dispatcher) fetchOpts.dispatcher = dispatcher;
        const res = await fetch(pageUrl, fetchOpts);
        pageHtml = await res.text();
      } catch (err: any) {
        await log(`[2GIS-HTTP Error] Page ${pageNum} fetch error: ${err.message}`);
        break;
      }

      const firmMatches = pageHtml.match(/\/firm\/\d+/g) || [];
      const uniqueFirms = Array.from(new Set(firmMatches));

      if (uniqueFirms.length === 0) {
        await log(`[2GIS-HTTP Page ${pageNum}] No further firms discovered. Pagination finished.`);
        break;
      }

      await log(`[2GIS-HTTP Page ${pageNum}] Discovered ${uniqueFirms.length} firms. Extracting details via concurrent workers...`);

      const workerBatchSize = 6;
      for (let i = 0; i < uniqueFirms.length; i += workerBatchSize) {
        if (await checkCancelled()) break;
        if (cap > 0 && results.length >= cap) break;

        const chunk = uniqueFirms.slice(i, i + workerBatchSize);
        await Promise.all(chunk.map(async (firmPath) => {
          if (await checkCancelled()) return;
          if (cap > 0 && results.length >= cap) return;

          const firmUrl = `${region.domain}/${region.citySlug}${firmPath}`;

          try {
            const fetchOpts: any = { headers };
            if (dispatcher) fetchOpts.dispatcher = dispatcher;
            const res = await fetch(firmUrl, fetchOpts);
            const html = await res.text();

            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            let rawTitle = titleMatch ? titleMatch[1].split('—')[0].split('|')[0].trim() : '';
            rawTitle = rawTitle.replace(/&amp;/g, '&').replace(/,\s*[^,]*on the map.*$/i, '').replace(/\s+/g, ' ').trim();
            if (!rawTitle || rawTitle.toLowerCase().includes('2gis')) return;

            const norm = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (seenTitles.has(norm)) return;
            seenTitles.add(norm);

            const telMatches = html.match(/href="tel:([^"]+)"/g) || [];
            let phone1: string | null = null;
            let phone2: string | null = null;
            if (telMatches.length > 0) {
              phone1 = telMatches[0].replace('href="tel:', '').replace('"', '').trim();
              if (telMatches.length > 1) {
                phone2 = telMatches[1].replace('href="tel:', '').replace('"', '').trim();
              }
            }

            if (!phone1) {
              const bdoMatches = html.match(/<bdo[^>]*>([^<]+)<\/bdo>/g) || [];
              for (const b of bdoMatches) {
                const text = b.replace(/<[^>]+>/g, '').trim();
                const digits = text.replace(/[^\d+]/g, ' ').replace(/\s+/g, ' ').trim();
                if (digits.length >= 6) {
                  phone1 = digits;
                  break;
                }
              }
            }

            let website: string | null = null;
            const webMatches = html.match(/href="(https?:\/\/[^"]+)"[^>]*target="_blank"/g) || [];
            for (const wm of webMatches) {
              const m = wm.match(/href="(https?:\/\/[^"]+)"/);
              if (m && m[1] && !m[1].includes('2gis') && !m[1].includes('facebook') && !m[1].includes('instagram') && !m[1].includes('linkedin') && !m[1].includes('twitter') && !m[1].includes('youtube')) {
                website = m[1];
                break;
              }
            }

            const lead: ScrapedLead = {
              query,
              title: rawTitle,
              category: cleanKeyword,
              phone_1: phone1,
              phone_2: phone2,
              website,
              address: region.city,
              city: region.city,
              country: region.country
            };

            await saveLead(lead);
            results.push(lead);
            await updateProgress(results.length, results.length);
          } catch {}
        }));
      }

      await log(`[2GIS-HTTP Page ${pageNum}] Total leads collected: ${results.length}`);
    }

    await log(`[2GIS-HTTP Complete] Finished scraping with ${results.length} total leads.`);
    return results;
  }
}
