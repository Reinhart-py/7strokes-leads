import { ProxyAgent } from 'undici';
import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl } from '../types';
import { GmapsParser } from './gmapsParser';
import { GeoGrid } from '../grid/geoGrid';
import { leadKey } from '../leadUtils';

export class GmapsHttpProvider implements IScraperProvider {
  public readonly name = 'GoogleMaps-DirectHTTP';

  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
  ];

  private getHeaders(): Record<string, string> {
    const ua = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    return {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Ch-Ua': '"Chromium";v="125", "Google Chrome";v="125", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    };
  }

  private getDispatcher(customProxy?: string) {
    const proxyUrl = customProxy || process.env.PROXY_URL || process.env.HTTP_PROXY || '';
    return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  }

  private buildProtobufParam(lat: number, lon: number, zoom: number, pageSize: number, start: number): string {
    const span = 360 / Math.pow(2, zoom);
    const dValue = span * 111320;

    let pb = `!4m12!1m3!1d${dValue.toFixed(2)}!2d${lon.toFixed(6)}!3d${lat.toFixed(6)}!2m3!1f0!2f0!3f0!3m2!1i1280!2i593!4f${zoom}!7i${pageSize}`;
    if (start > 0) {
      pb += `!8i${start}`;
    }

    pb += '!10b1!12m25!1m5!18b1!30b1!31m1!1b1!34e1!2m4!5m1!6e2!20e3!39b1!10b1!12b1!13b1!16b1!17m1!3e1!20m3!5e2!6b1!14b1!46m1!1b0!96b1!99b1!19m4!2m3!1i360!2i120!4i8';
    return pb;
  }

  private async fetchEndpoint(url: string, dispatcher?: any): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const fetchOptions: any = {
        headers: this.getHeaders(),
        signal: controller.signal
      };
      if (dispatcher) {
        fetchOptions.dispatcher = dispatcher;
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timeout);
    }
  }

  private extractCityCandidate(query: string): string {
    const inMatch = query.match(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i);
    if (inMatch && inMatch[1]) return inMatch[1].trim();

    const parts = query.split(/[\s,]+/);
    for (const part of parts) {
      if (GeoGrid.getBoundingBoxForCity(part)) {
        return part;
      }
    }
    return '';
  }

  /**
   * Looks a place up on Google Maps ("Regal Tower, Dubai") and returns the best
   * match with its exact coordinates. Used to pin Exact-mode searches.
   */
  public async lookupPlace(text: string, proxy?: string) {
    const dispatcher = this.getDispatcher(proxy);
    const urls = [
      `https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=us&q=${encodeURIComponent(text)}&tch=1&ech=1`,
      `https://www.google.com/maps/search/${encodeURIComponent(text)}?hl=en`
    ];
    for (const url of urls) {
      const raw = await this.fetchEndpoint(url, dispatcher).catch(() => '');
      const hit = GmapsParser.parseSearchResponse(raw, text).find(
        l => typeof l.latitude === 'number' && typeof l.longitude === 'number'
      );
      if (hit) {
        return {
          title: hit.title,
          lat: hit.latitude as number,
          lon: hit.longitude as number,
          categories: hit.categories || (hit.category ? [hit.category] : []),
          address: hit.address
        };
      }
    }
    return null;
  }

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    return (await this.searchArea(options, control)).leads;
  }

  /**
   * Pages through one search viewport. `rawCount` is how many distinct places
   * Google returned (including ones already saved elsewhere) and `saturated`
   * is true when every page was full, i.e. the area likely holds more results
   * than one query can return and should be split into smaller cells.
   */
  public async searchArea(
    options: ScraperOptions,
    control: ScraperControl
  ): Promise<{ leads: ScrapedLead[]; rawCount: number; saturated: boolean }> {
    const { query, maxPagesPerCell = 6, seenKeys } = options;
    const { checkCancelled, saveLead } = control;

    let targetLat = options.lat;
    let targetLon = options.lon;
    let targetZoom = options.zoom || 14;

    if (targetLat === undefined || targetLon === undefined) {
      const cityCandidate = options.city || this.extractCityCandidate(query);
      if (cityCandidate) {
        const box = await GeoGrid.resolveCityBoundingBox(cityCandidate);
        if (box) {
          targetLat = (box.minLat + box.maxLat) / 2;
          targetLon = (box.minLon + box.maxLon) / 2;
          targetZoom = 12;
        }
      }
    }

    const dispatcher = this.getDispatcher(options.proxy);
    const results: ScrapedLead[] = [];
    const localSeen = new Set<string>();
    const pageSize = 20;
    let saturated = false;

    const consume = async (batch: ScrapedLead[]): Promise<number> => {
      let locallyNew = 0;
      for (const lead of batch) {
        const key = leadKey(lead);
        if (localSeen.has(key)) continue;
        localSeen.add(key);
        locallyNew++;
        if (seenKeys && seenKeys.has(key)) continue;
        if (await checkCancelled()) break;
        await saveLead(lead);
        results.push(lead);
      }
      return locallyNew;
    };

    for (let page = 0; page < maxPagesPerCell; page++) {
      if (await checkCancelled()) break;

      const start = page * pageSize;
      const psi = Math.random().toString(36).substring(2, 9) + `.${Date.now()}.1`;
      const base = `https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=us`;
      const url = targetLat !== undefined && targetLon !== undefined
        ? `${base}&pb=${this.buildProtobufParam(targetLat, targetLon, targetZoom, pageSize, start)}&q=${encodeURIComponent(query)}&tch=1&ech=1&psi=${psi}`
        : `${base}&q=${encodeURIComponent(query)}&tch=1&ech=1&psi=${psi}`;

      let rawText = '';
      let attempt = 0;
      while (attempt < 3) {
        try {
          rawText = await this.fetchEndpoint(url, dispatcher);
          break;
        } catch (err: any) {
          attempt++;
          // Back off on throttling / transient errors, give up on hard failures.
          if (attempt >= 3 || !/HTTP (429|5\d\d)|abort|ECONNRESET|ETIMEDOUT/i.test(String(err?.message))) break;
          await new Promise(r => setTimeout(r, 800 * attempt));
        }
      }

      let batch = GmapsParser.parseSearchResponse(rawText, query);
      if (batch.length === 0 && page === 0 && targetLat === undefined) {
        const fallbackUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
        const fallbackText = await this.fetchEndpoint(fallbackUrl, dispatcher).catch(() => '');
        batch = GmapsParser.parseSearchResponse(fallbackText, query);
        await consume(batch);
        break;
      }
      if (batch.length === 0) break;

      const locallyNew = await consume(batch);
      // Google repeats the last page once a query is exhausted.
      if (locallyNew === 0 || batch.length < pageSize) break;
      if (page === maxPagesPerCell - 1) saturated = true;

      await new Promise(r => setTimeout(r, 120));
    }

    return { leads: results, rawCount: localSeen.size, saturated };
  }
}
