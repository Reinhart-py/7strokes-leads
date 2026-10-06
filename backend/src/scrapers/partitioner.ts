import { ScrapedLead } from './types';

export class GeographicPartitioner {
  private static readonly PRESET_PARTITIONS: Record<string, string[]> = {
    dubai: [
      'Business Bay',
      'Downtown Dubai',
      'Dubai Marina',
      'Jumeirah Lakes Towers JLT',
      'DIFC',
      'Deira',
      'Bur Dubai',
      'Al Barsha',
      'Jumeirah',
      'Palm Jumeirah',
      'Al Quoz',
      'Al Karama',
      'Dubai Silicon Oasis',
      'JVC Jumeirah Village Circle',
      'JVT Jumeirah Village Triangle',
      'Dubai Hills Estate',
      'Motor City',
      'Dubai Sports City',
      'Al Nahda',
      'Al Qusais',
      'Garhoud',
      'Mirdif',
      'International City',
      'Sheikh Zayed Road',
      'Al Wasl',
      'Al Safa',
      'Umm Suqeim',
      'Dubai South',
      'Al Jaddaf',
      'Dubai Creek Harbour',
      'Festival City',
      'Al Mankhool',
      'Al Rigga',
      'Al Muraqqabat',
      'Port Saeed',
      'Trade Centre',
      'Barsha Heights Tecom',
      'Dubai Internet City',
      'Dubai Media City',
      'Discovery Gardens',
      'City Walk',
      'Bluewaters Island',
      'Al Satwa',
      'Ras Al Khor'
    ],
    abu_dhabi: [
      'Al Reem Island',
      'Yas Island',
      'Saadiyat Island',
      'Al Maryah Island',
      'Al Danah',
      'Al Zahiyah',
      'Al Khalidiya',
      'Musaffah',
      'Musaffah Industrial',
      'Al Bateen',
      'Al Karamah',
      'Al Mushrif',
      'Khalifa City',
      'Mohammed Bin Zayed City',
      'Al Raha Beach',
      'Al Reef',
      'Shakhbout City',
      'Al Shamkha',
      'Masdar City',
      'Corniche',
      'Al Markaziyah',
      'Al Nahyan',
      'Al Muroor',
      'Airport Road',
      'Hamdan Street',
      'Electra Street',
      'Zayed City'
    ],
    sharjah: [
      'Al Majaz',
      'Al Nahda',
      'Al Qasimia',
      'Al Taawun',
      'Al Khan',
      'Muwailih',
      'Industrial Area',
      'Al Yarmook',
      'Al Rolla'
    ],
    riyadh: [
      'Al Olaya',
      'Al Malaz',
      'Al Nakheel',
      'Al Sulaimaniyah',
      'King Fahd District',
      'Al Murabba',
      'Al Yasmin',
      'Al Narjis',
      'Al Sahafah',
      'Al Aqiq'
    ],
    jeddah: [
      'Al Balad',
      'Al Hamra',
      'Al Rawdah',
      'Al Salamah',
      'Al Zahra',
      'Al Andalus',
      'Al Mohammadiyyah',
      'Al Naeem'
    ],
    doha: [
      'West Bay',
      'The Pearl',
      'Al Sadd',
      'Lusail',
      'Old Airport',
      'Msheireb Downtown',
      'Al Dafna',
      'Al Mansoura'
    ],
    kuwait: [
      'Sharq',
      'Salmiya',
      'Hawally',
      'Al Shuwaikh',
      'Al Qibla',
      'Al Mirqab'
    ],
    london: [
      'City of London',
      'Westminster',
      'Canary Wharf',
      'Camden',
      'Kensington',
      'Islington',
      'Chelsea',
      'Soho',
      'Shoreditch',
      'Mayfair',
      'Greenwich',
      'Stratford'
    ],
    new_york: [
      'Midtown Manhattan',
      'Financial District',
      'Downtown Manhattan',
      'Brooklyn',
      'Queens',
      'Williamsburg',
      'SoHo',
      'Chelsea',
      'Upper East Side',
      'Upper West Side'
    ],
    los_angeles: [
      'Downtown Los Angeles',
      'Beverly Hills',
      'Santa Monica',
      'Hollywood',
      'Pasadena',
      'Century City',
      'Culver City'
    ],
    chicago: [
      'The Loop',
      'River North',
      'West Loop',
      'Lincoln Park',
      'Streeterville',
      'Fulton Market'
    ],
    toronto: [
      'Downtown Toronto',
      'North York',
      'Scarborough',
      'Etobicoke',
      'Yorkville',
      'Financial District'
    ],
    paris: [
      '1st Arrondissement Louvre',
      '8th Arrondissement Champs-Elysees',
      '9th Arrondissement Opera',
      'La Defense',
      'Le Marais',
      'Montmartre',
      'Saint-Germain-des-Pres'
    ],
    berlin: [
      'Mitte',
      'Charlottenburg',
      'Kreuzberg',
      'Prenzlauer Berg',
      'Friedrichshain',
      'Schoneberg'
    ],
    sydney: [
      'Sydney CBD',
      'Surry Hills',
      'North Sydney',
      'Parramatta',
      'Bondi',
      'Chatswood'
    ],
    singapore: [
      'Downtown Core',
      'Marina Bay',
      'Orchard',
      'Tanjong Pagar',
      'Raffles Place',
      'Jurong East'
    ],
    mumbai: [
      'Bandra West',
      'Andheri West',
      'Nariman Point',
      'Lower Parel',
      'BKC Bandra Kurla Complex',
      'Juhu',
      'Powai'
    ]
  };

  public static getSubQueries(targetQuery: string): string[] {
    const lower = targetQuery.toLowerCase();
    for (const [cityKey, subAreas] of Object.entries(this.PRESET_PARTITIONS)) {
      const cityName = cityKey.replace('_', ' ');
      if (lower.includes(cityName)) {
        const baseQuery = targetQuery.replace(new RegExp(cityName, 'gi'), '').replace(/\bin\b/gi, '').trim();
        return [targetQuery, ...subAreas.map(area => `${baseQuery} in ${area}, ${cityName}`.trim())];
      }
    }

    const inMatch = targetQuery.match(/\bin\s+([a-zA-Z\s,]+)$/i);
    if (inMatch && inMatch[1]) {
      const city = inMatch[1].trim();
      const base = targetQuery.replace(/\bin\s+([a-zA-Z\s,]+)$/i, '').trim();
      return [
        `${base} in Downtown ${city}`,
        `${base} in Business District ${city}`,
        `${base} in Financial District ${city}`,
        `${base} in Central ${city}`,
        `${base} in North ${city}`,
        `${base} in South ${city}`,
        `${base} in East ${city}`,
        `${base} in West ${city}`,
        `${base} in Industrial Area ${city}`,
        `${base} in Commercial Center ${city}`,
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
