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
      'Ras Al Khor',
      'Jebel Ali',
      'Meydan',
      'Al Warqa',
      'Production City'
    ],
    jaipur: [
      'Mansarovar',
      'Malviya Nagar',
      'Vaishali Nagar',
      'C-Scheme',
      'Raja Park',
      'Tonk Road',
      'Sitapura',
      'Jagatpura',
      'Bani Park',
      'Ajmer Road',
      'Vidhyadhar Nagar',
      'Sodala',
      'Sanganer',
      'MI Road',
      'Gopalpura',
      'Civil Lines',
      'VKI Area',
      'Jhotwara',
      'Jawahar Nagar',
      'Shastri Nagar',
      'Hawa Mahal',
      'Nirman Nagar',
      'Shyam Nagar',
      'Durgapura',
      'Bapu Nagar'
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
    delhi: [
      'Connaught Place',
      'Nehru Place',
      'Karol Bagh',
      'Lajpat Nagar',
      'Saket',
      'Dwarka',
      'Rohini',
      'South Extension',
      'Hauz Khas',
      'Janakpuri',
      'Okhla',
      'Pitampura',
      'Vasant Kunj',
      'Netaji Subhash Place'
    ],
    mumbai: [
      'Bandra West',
      'Andheri West',
      'Nariman Point',
      'Lower Parel',
      'BKC Bandra Kurla Complex',
      'Juhu',
      'Powai',
      'Dadar',
      'Malad West',
      'Borivali West',
      'Goregaon West'
    ],
    bengaluru: [
      'Koramangala',
      'Indiranagar',
      'Whitefield',
      'HSR Layout',
      'Electronic City',
      'Jayanagar',
      'Marathahalli',
      'BTM Layout',
      'Malleshwaram',
      'Bellandur',
      'Hebbal'
    ],
    hyderabad: [
      'Hitec City',
      'Gachibowli',
      'Madhapur',
      'Banjara Hills',
      'Jubilee Hills',
      'Kondapur',
      'Kukatpally',
      'Secunderabad',
      'Begumpet'
    ],
    pune: [
      'Hinjewadi',
      'Kothrud',
      'Viman Nagar',
      'Baner',
      'Wakad',
      'Shivaji Nagar',
      'Hadapsar',
      'Kalyani Nagar'
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
    toronto: [
      'Downtown Toronto',
      'North York',
      'Scarborough',
      'Etobicoke',
      'Yorkville',
      'Financial District'
    ],
    singapore: [
      'Downtown Core',
      'Marina Bay',
      'Orchard',
      'Tanjong Pagar',
      'Raffles Place',
      'Jurong East'
    ]
  };

  public static getSubQueries(targetQuery: string): string[] {
    const lower = targetQuery.toLowerCase().trim();

    // 1. Direct match with preset partitions
    for (const [cityKey, subAreas] of Object.entries(this.PRESET_PARTITIONS)) {
      const cityName = cityKey.replace(/_/g, ' ');
      const regex = new RegExp(`\\b${cityName}\\b`, 'i');
      if (regex.test(lower)) {
        const baseQuery = targetQuery
          .replace(new RegExp(`\\bin\\s+${cityName}\\b`, 'gi'), '')
          .replace(new RegExp(`\\bat\\s+${cityName}\\b`, 'gi'), '')
          .replace(new RegExp(`\\bnear\\s+${cityName}\\b`, 'gi'), '')
          .replace(new RegExp(`\\b${cityName}\\b`, 'gi'), '')
          .replace(/\s+/g, ' ')
          .trim();

        const cleanBase = baseQuery || targetQuery;
        return [
          targetQuery,
          ...subAreas.map(area => `${cleanBase} in ${area}, ${cityName}`.trim())
        ];
      }
    }

    // 2. Preposition pattern match: "in [City]", "at [City]", "near [City]"
    const prepMatch = targetQuery.match(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i);
    if (prepMatch && prepMatch[1]) {
      const city = prepMatch[1].trim();
      const base = targetQuery.replace(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i, '').trim();
      return [
        targetQuery,
        `${base} in Central ${city}`,
        `${base} in North ${city}`,
        `${base} in South ${city}`,
        `${base} in East ${city}`,
        `${base} in West ${city}`,
        `${base} in Downtown ${city}`,
        `${base} in Business District ${city}`,
        `${base} in Commercial Center ${city}`,
        `${base} in Industrial Area ${city}`,
        `${base} in Main Market ${city}`
      ];
    }

    // 3. Trailing word pattern: "[Service] [City]" e.g. "clinics Jaipur"
    const words = targetQuery.trim().split(/\s+/);
    if (words.length >= 2) {
      const potentialCity = words[words.length - 1];
      const base = words.slice(0, -1).join(' ');
      if (potentialCity.length >= 3 && !/^(services|center|company|agency|store|shop)$/i.test(potentialCity)) {
        return [
          targetQuery,
          `${base} in Central ${potentialCity}`,
          `${base} in North ${potentialCity}`,
          `${base} in South ${potentialCity}`,
          `${base} in East ${potentialCity}`,
          `${base} in West ${potentialCity}`,
          `${base} in Downtown ${potentialCity}`,
          `${base} in Industrial Area ${potentialCity}`
        ];
      }
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
    concurrency = 4,
    delayBetweenBatchesMs = 150
  ): Promise<R[]> {
    const results: R[] = [];
    const queue = [...items];

    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          let attempts = 0;
          let delay = 500;
          while (attempts < 2) {
            try {
              return await taskFn(item);
            } catch (err) {
              attempts++;
              if (attempts >= 2) throw err;
              await new Promise(res => setTimeout(res, delay));
              delay *= 2;
            }
          }
          throw new Error('Task failed');
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
