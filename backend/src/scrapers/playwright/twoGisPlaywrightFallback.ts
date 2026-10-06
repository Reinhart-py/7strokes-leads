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
  'dubai': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.2708%2C25.2048%2F12', country: 'United Arab Emirates', city: 'Dubai' },
  'abu dhabi': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '54.3773%2C24.4539%2F12', country: 'United Arab Emirates', city: 'Abu Dhabi' },
  'abudhabi': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '54.3773%2C24.4539%2F12', country: 'United Arab Emirates', city: 'Abu Dhabi' },
  'sharjah': { domain: 'https://2gis.ae', citySlug: 'sharjah', coords: '55.3919%2C25.3573%2F12', country: 'United Arab Emirates', city: 'Sharjah' },
  'ajman': { domain: 'https://2gis.ae', citySlug: 'ajman', coords: '55.4522%2C25.4052%2F12', country: 'United Arab Emirates', city: 'Ajman' },
  'ras al khaimah': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.9432%2C25.7895%2F12', country: 'United Arab Emirates', city: 'Ras Al Khaimah' },
  'rak': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.9432%2C25.7895%2F12', country: 'United Arab Emirates', city: 'Ras Al Khaimah' },
  'fujairah': { domain: 'https://2gis.ae', citySlug: 'fujairah', coords: '56.3265%2C25.1288%2F12', country: 'United Arab Emirates', city: 'Fujairah' },
  'umm al quwain': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.5532%2C25.5653%2F12', country: 'United Arab Emirates', city: 'Umm Al Quwain' },
  'uaq': { domain: 'https://2gis.ae', citySlug: 'dubai', coords: '55.5532%2C25.5653%2F12', country: 'United Arab Emirates', city: 'Umm Al Quwain' },

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

export class TwoGisPlaywrightFallback implements IScraperProvider {
  public readonly name = '2GIS-Playwright';

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

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    const { query, city, cap = 0 } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    const region = this.resolveRegion(query, city);
    const cleanKeyword = query.replace(/\bin\s+[a-zA-Z\s,]+$/i, '').trim() || query.trim();

    await log(`[2GIS Engine] Target location: ${region.city}, ${region.country} (${region.domain}/${region.citySlug})`);
    await log(`[2GIS Engine] Search keyword: "${cleanKeyword}"`);

    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1920,1080'
      ]
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'en-US'
    });

    const searchPage = await context.newPage();
    const detailPage = await context.newPage();

    await searchPage.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    await detailPage.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const results: ScrapedLead[] = [];
    const seenTitles = new Set<string>();
    const maxPages = cap > 0 ? Math.min(15, Math.ceil(cap / 12) + 2) : 10;

    try {
      for (let p = 1; p <= maxPages; p++) {
        if (await checkCancelled()) break;
        if (cap > 0 && results.length >= cap) break;

        const coordsSuffix = region.coords ? (region.coords.startsWith('?') ? region.coords : `?m=${region.coords}`) : '';
        const pageUrl = p === 1
          ? `${region.domain}/${region.citySlug}/search/${encodeURIComponent(cleanKeyword)}${coordsSuffix}`
          : `${region.domain}/${region.citySlug}/search/${encodeURIComponent(cleanKeyword)}/page/${p}${coordsSuffix}`;

        await log(`[2GIS Page ${p}] Loading catalog listings: ${pageUrl}`);
        await searchPage.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
        await searchPage.waitForTimeout(2500);

        const acceptBtn = await searchPage.$('#acceptRiskButton');
        if (acceptBtn) {
          await acceptBtn.click().catch(() => {});
          await searchPage.waitForTimeout(3000);
        }

        const cards = await searchPage.$$eval('a[href*="/firm/"]', links => {
          return links.map(link => {
            let curr = link.parentElement;
            for (let i = 0; i < 5 && curr; i++) {
              const text = curr.innerText || '';
              const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
              if (lines.length >= 2 && lines.length <= 12 && lines[0] === link.textContent.trim()) {
                return {
                  title: lines[0],
                  href: link.getAttribute('href'),
                  category: lines[1] || null,
                  rating: lines.find(l => /^\d+(\.\d+)?$/.test(l)) || null,
                  reviews: lines.find(l => /\d+\s+(ratings|reviews)/.test(l)) || null,
                  address: lines.find(l => /street|road|dubai|abu dhabi|building|mall|hotel|tower|block|avenue|square|industrial|island|city|district/i.test(l)) || null
                };
              }
              curr = curr.parentElement;
            }
            return {
              title: link.textContent.trim(),
              href: link.getAttribute('href'),
              category: null,
              rating: null,
              reviews: null,
              address: null
            };
          }).filter(r => r.title.length > 0 && !!r.href);
        });

        if (cards.length === 0) {
          await log(`[2GIS Page ${p}] No further cards discovered. Pagination complete.`);
          break;
        }

        let newOnPage = 0;
        for (let c = 0; c < cards.length; c++) {
          if (await checkCancelled()) break;
          if (cap > 0 && results.length >= cap) break;

          const card = cards[c];
          const norm = card.title.toLowerCase().trim();
          if (seenTitles.has(norm)) continue;
          seenTitles.add(norm);

          let phone: string | null = null;
          let website: string | null = null;

          if (card.href) {
            try {
              const cleanHref = card.href.split('?')[0];
              const fullFirmUrl = cleanHref.startsWith('http') ? cleanHref : `${region.domain}${cleanHref}`;

              await detailPage.goto(fullFirmUrl, { waitUntil: 'domcontentloaded', timeout: 12000 }).catch(() => {});
              
              const detailAccept = await detailPage.$('#acceptRiskButton');
              if (detailAccept) {
                await detailAccept.click().catch(() => {});
                await detailPage.waitForTimeout(1500);
              }

              await detailPage.waitForSelector('a[href^="tel:"], bdo[dir="ltr"]', { timeout: 3500 }).catch(() => {});

              const telLinks = await detailPage.$$eval('a[href^="tel:"]', els => els.map(e => e.getAttribute('href'))).catch(() => []);
              if (telLinks && telLinks.length > 0 && telLinks[0]) {
                phone = telLinks[0].replace(/^tel:/, '').trim();
              }

              if (!phone) {
                const bdoText = await detailPage.$eval('bdo[dir="ltr"]', el => (el as HTMLElement).innerText).catch(() => null);
                if (bdoText) {
                  const cleaned = bdoText.replace(/[^\d+]/g, ' ').replace(/\s+/g, ' ').trim();
                  if (cleaned.length >= 6) {
                    phone = cleaned;
                  }
                }
              }

              const externalSites = await detailPage.$$eval('a[target="_blank"][href^="http"]:not([href*="2gis"])', els => els.map(e => e.getAttribute('href'))).catch(() => []);
              if (externalSites && externalSites.length > 0) {
                const directWeb = externalSites.find(u => u && !u.includes('facebook') && !u.includes('instagram') && !u.includes('linkedin') && !u.includes('twitter') && !u.includes('youtube'));
                website = directWeb || externalSites[0] || null;
              }
            } catch {}
          }

          const lead: ScrapedLead = {
            query,
            title: card.title,
            category: card.category,
            phone_1: phone,
            phone_2: null,
            website,
            address: card.address || region.city,
            city: region.city,
            country: region.country,
            rating: card.rating || null,
            reviews: card.reviews || null
          };

          await saveLead(lead);
          results.push(lead);
          newOnPage++;
          await updateProgress(results.length, results.length);
        }

        await log(`[2GIS Page ${p}] Collected ${newOnPage} leads with contact details (Total: ${results.length})`);
        if (newOnPage === 0 && p > 1) {
          break;
        }
      }
    } finally {
      await searchPage.close().catch(() => {});
      await detailPage.close().catch(() => {});
      await browser.close().catch(() => {});
    }

    return results;
  }
}
