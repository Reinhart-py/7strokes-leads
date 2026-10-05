import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl } from '../types';

export class SerpApiGmapsProvider implements IScraperProvider {
  public readonly name = 'SerpApi-External';

  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SERPAPI_API_KEY || '';
  }

  public isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.length > 5);
  }

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    const { query, cap = 0 } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    if (!this.isAvailable()) {
      throw new Error('SerpApi API key not configured');
    }

    await log(`[External API] Querying SerpApi Google Maps for: "${query}"`);

    const results: ScrapedLead[] = [];
    let start = 0;

    while (true) {
      if (await checkCancelled()) break;
      if (cap > 0 && results.length >= cap) break;

      const url = `https://serpapi.com/search.json?engine=google_maps&q=${encodeURIComponent(query)}&start=${start}&api_key=${this.apiKey}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`SerpApi returned status ${res.status}`);
      }

      const data: any = await res.json();
      const localResults = data.local_results || [];
      if (!Array.isArray(localResults) || localResults.length === 0) {
        break;
      }

      for (const item of localResults) {
        if (await checkCancelled()) break;
        if (cap > 0 && results.length >= cap) break;

        const lead: ScrapedLead = {
          query,
          place_id: item.place_id || null,
          title: item.title,
          category: item.type || null,
          phone_1: item.phone || null,
          phone_2: null,
          website: item.website || null,
          address: item.address || null,
          rating: item.rating ? item.rating.toString() : null,
          reviews: item.reviews ? item.reviews.toString() : null,
          latitude: item.gps_coordinates?.latitude || null,
          longitude: item.gps_coordinates?.longitude || null
        };

        await saveLead(lead);
        results.push(lead);
        await updateProgress(Math.floor(start / 20) + 1, results.length);
      }

      if (!data.serpapi_pagination?.next) {
        break;
      }

      start += 20;
      await new Promise(r => setTimeout(r, 500));
    }

    return results;
  }
}
