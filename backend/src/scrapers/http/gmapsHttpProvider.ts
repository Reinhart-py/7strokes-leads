import { ProxyAgent } from 'undici';
import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl } from '../types';
import { GmapsParser } from './gmapsParser';

export class GmapsHttpProvider implements IScraperProvider {
  public readonly name = 'GoogleMaps-DirectHTTP';

  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1'
  };

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
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const fetchOptions: any = {
        headers: this.headers,
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

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    const {
      query,
      cap = 0,
      lat = 25.2048,
      lon = 55.2708,
      zoom = 13,
      maxPagesPerCell = 6
    } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    const dispatcher = this.getDispatcher();
    if (dispatcher) {
      await log(`[HTTP Engine] Proxy agent attached for request`);
    }

    await log(`[HTTP Engine] Executing direct HTTP search for: "${query}" (Lat: ${lat}, Lon: ${lon})`);

    const results: ScrapedLead[] = [];
    const seenTitles = new Set<string>();
    const pageSize = 20;

    for (let page = 0; page < maxPagesPerCell; page++) {
      if (await checkCancelled()) break;
      if (cap > 0 && results.length >= cap) break;

      const start = page * pageSize;
      const pb = this.buildProtobufParam(lat, lon, zoom, pageSize, start);
      const url = `https://www.google.com/search?tbm=map&authuser=0&hl=en&gl=us&pb=${pb}&q=${encodeURIComponent(query)}&tch=1&ech=1&psi=dummy.${Date.now()}.1`;

      let rawText = '';
      try {
        rawText = await this.fetchEndpoint(url, dispatcher);
      } catch (err: any) {
        if (page === 0) {
          const fallbackUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
          rawText = await this.fetchEndpoint(fallbackUrl, dispatcher);
        } else {
          break;
        }
      }

      const batch = GmapsParser.parseSearchResponse(rawText, query);
      if (batch.length === 0) {
        if (page === 0) {
          const fallbackUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
          try {
            rawText = await this.fetchEndpoint(fallbackUrl, dispatcher);
            const fallbackBatch = GmapsParser.parseSearchResponse(rawText, query);
            for (const lead of fallbackBatch) {
              if (await checkCancelled()) break;
              if (cap > 0 && results.length >= cap) break;
              if (!seenTitles.has(lead.title)) {
                seenTitles.add(lead.title);
                await saveLead(lead);
                results.push(lead);
                await updateProgress(1, results.length);
              }
            }
          } catch {}
        }
        break;
      }

      let newCount = 0;
      for (const lead of batch) {
        if (await checkCancelled()) break;
        if (cap > 0 && results.length >= cap) break;

        if (!seenTitles.has(lead.title)) {
          seenTitles.add(lead.title);
          await saveLead(lead);
          results.push(lead);
          newCount++;
          await updateProgress(page + 1, results.length);
        }
      }

      await log(`[HTTP Engine] Page ${page + 1}: extracted ${newCount} new leads (total: ${results.length})`);

      if (batch.length < pageSize || newCount === 0) {
        break;
      }

      await new Promise(r => setTimeout(r, 600));
    }

    return results;
  }
}
