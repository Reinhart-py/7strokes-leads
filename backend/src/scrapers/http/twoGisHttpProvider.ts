import { ProxyAgent } from 'undici';
import { IScraperProvider, ScrapedLead, ScraperOptions, ScraperControl } from '../types';

export class TwoGisHttpProvider implements IScraperProvider {
  public readonly name = '2GIS-HTTP';

  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Origin': 'https://2gis.ae',
    'Referer': 'https://2gis.ae/'
  };

  private publicApiKey = 'rurbbn3440';

  private getDispatcher() {
    const proxyUrl = process.env.PROXY_URL || process.env.HTTP_PROXY || '';
    return proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  }

  public async search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]> {
    const { query, cap = 0 } = options;
    const { checkCancelled, log, updateProgress, saveLead } = control;

    const dispatcher = this.getDispatcher();
    if (dispatcher) {
      await log(`[HTTP Engine] Proxy agent attached for 2GIS request`);
    }

    await log(`[HTTP] Initiating 2GIS catalog request for: "${query}"`);

    const results: ScrapedLead[] = [];
    let page = 1;
    const pageSize = 20;

    while (true) {
      if (await checkCancelled()) break;
      if (cap > 0 && results.length >= cap) break;

      const url = `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(query)}&page=${page}&page_size=${pageSize}&fields=items.contact_groups,items.address,items.rubrics,items.point,items.reviews&key=${this.publicApiKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      let data: any = null;
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
          throw new Error(`2GIS API returned status ${response.status}`);
        }

        data = await response.json();
      } finally {
        clearTimeout(timeout);
      }

      const items = data?.result?.items;
      if (!Array.isArray(items) || items.length === 0) {
        break;
      }

      for (const item of items) {
        if (await checkCancelled()) break;
        if (cap > 0 && results.length >= cap) break;

        const title = item.name || item.full_name || '';
        if (!title) continue;

        let phone1: string | null = null;
        let phone2: string | null = null;
        let website: string | null = null;
        let email: string | null = null;

        if (Array.isArray(item.contact_groups)) {
          for (const group of item.contact_groups) {
            if (Array.isArray(group.contacts)) {
              for (const contact of group.contacts) {
                if (contact.type === 'phone') {
                  const val = contact.text || contact.value;
                  if (!phone1) phone1 = val;
                  else if (!phone2) phone2 = val;
                } else if (contact.type === 'website') {
                  if (!website) website = contact.text || contact.value;
                } else if (contact.type === 'email') {
                  if (!email) email = contact.text || contact.value;
                }
              }
            }
          }
        }

        const address = item.address_name || item.address?.building_name || item.address?.components?.map((c: any) => c.street || c.name).filter(Boolean).join(', ') || null;
        const category = Array.isArray(item.rubrics) ? item.rubrics.map((r: any) => r.name).join(', ') : null;

        const lead: ScrapedLead = {
          query,
          place_id: item.id ? String(item.id) : null,
          title,
          category,
          phone_1: phone1,
          phone_2: phone2,
          email,
          website,
          address,
          rating: item.reviews?.rating ? item.reviews.rating.toString() : null,
          reviews: item.reviews?.general_review_count ? item.reviews.general_review_count.toString() : null,
          latitude: item.point?.lat || null,
          longitude: item.point?.lon || null
        };

        await saveLead(lead);
        results.push(lead);
        await updateProgress(page, results.length);
      }

      const totalItems = data?.result?.total || 0;
      if (results.length >= totalItems || items.length < pageSize) {
        break;
      }

      page++;
      await new Promise(r => setTimeout(r, 400));
    }

    await log(`[HTTP] 2GIS completed with ${results.length} total leads`);
    return results;
  }
}
