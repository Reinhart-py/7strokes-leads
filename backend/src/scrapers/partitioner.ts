import { ScrapedLead } from './types';

export class GeographicPartitioner {
  private static readonly PRESET_PARTITIONS: Record<string, string[]> = {
    dubai: [
      'Downtown Dubai',
      'Business Bay',
      'Dubai Marina',
      'Deira',
      'Bur Dubai',
      'Jumeirah',
      'Al Barsha',
      'JLT Jumeirah Lake Towers',
      'Dubai Silicon Oasis',
      'Al Quoz'
    ],
    abu_dhabi: [
      'Al Danah',
      'Al Zahiyah',
      'Al Khalidiya',
      'Al Reem Island',
      'Yas Island',
      'Musaffah',
      'Al Bateen'
    ],
    riyadh: [
      'Al Olaya',
      'Al Malaz',
      'Al Nakheel',
      'Al Sulaimaniyah',
      'King Fahd District',
      'Al Murabba'
    ],
    jeddah: [
      'Al Balad',
      'Al Hamra',
      'Al Rawdah',
      'Al Salamah',
      'Al Zahra'
    ],
    doha: [
      'West Bay',
      'The Pearl',
      'Al Sadd',
      'Lusail',
      'Old Airport'
    ],
    london: [
      'Westminster',
      'Camden',
      'City of London',
      'Kensington',
      'Canary Wharf',
      'Islington',
      'Chelsea',
      'Soho'
    ],
    new_york: [
      'Midtown Manhattan',
      'Downtown Manhattan',
      'Brooklyn',
      'Queens',
      'Williamsburg',
      'Financial District'
    ],
    toronto: [
      'Downtown Toronto',
      'North York',
      'Scarborough',
      'Etobicoke',
      'Yorkville'
    ],
    los_angeles: [
      'Downtown Los Angeles',
      'Beverly Hills',
      'Santa Monica',
      'Hollywood',
      'Pasadena'
    ]
  };

  public static getSubQueries(targetQuery: string): string[] {
    const lower = targetQuery.toLowerCase();
    for (const [cityKey, subAreas] of Object.entries(this.PRESET_PARTITIONS)) {
      const cityName = cityKey.replace('_', ' ');
      if (lower.includes(cityName)) {
        const baseQuery = targetQuery.replace(new RegExp(cityName, 'gi'), '').replace(/\bin\b/gi, '').trim();
        return subAreas.map(area => `${baseQuery} in ${area}, ${cityName}`.trim());
      }
    }

    const inMatch = targetQuery.match(/\bin\s+([a-zA-Z\s]+)$/i);
    if (inMatch && inMatch[1]) {
      const city = inMatch[1].trim();
      const base = targetQuery.replace(/\bin\s+([a-zA-Z\s]+)$/i, '').trim();
      return [
        `${base} in Downtown ${city}`,
        `${base} in North ${city}`,
        `${base} in South ${city}`,
        `${base} in East ${city}`,
        `${base} in West ${city}`,
        `${base} in Central ${city}`,
        targetQuery
      ];
    }

    return [targetQuery];
  }

  public static deduplicateLeads(leads: ScrapedLead[]): ScrapedLead[] {
    const seen = new Set<string>();
    const deduplicated: ScrapedLead[] = [];

    for (const lead of leads) {
      const normalizedTitle = lead.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedPhone = (lead.phone_1 || '').replace(/[^0-9]/g, '');
      const key = normalizedPhone ? `p:${normalizedPhone}` : `t:${normalizedTitle}`;

      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(lead);
      }
    }

    return deduplicated;
  }

  public static async executeWithControlledConcurrency<T, R>(
    items: T[],
    taskFn: (item: T) => Promise<R>,
    concurrency = 3,
    delayBetweenBatchesMs = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    const queue = [...items];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          let attempts = 0;
          let delay = 1000;
          while (attempts < 3) {
            try {
              return await taskFn(item);
            } catch (err) {
              attempts++;
              if (attempts >= 3) throw err;
              await new Promise(res => setTimeout(res, delay));
              delay *= 2;
            }
          }
          throw new Error('Task failed after max retries');
        })
      );

      results.push(...batchResults);

      if (queue.length > 0 && delayBetweenBatchesMs > 0) {
        await new Promise(res => setTimeout(res, delayBetweenBatchesMs));
      }
    }

    return results;
  }
}
