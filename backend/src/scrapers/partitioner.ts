import { ScrapedLead } from './types';
import { WorldGeo, CountryGeoEntry } from './grid/worldGeo';
import { GeoGrid } from './grid/geoGrid';

export interface SearchPartition {
  query: string;
  lat?: number;
  lon?: number;
  zoom?: number;
  areaName?: string;
}

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
      'Corniche Road',
      'Tourist Club Area',
      'Electra Street',
      'Hamdan Street',
      'Al Muroor',
      'Al Najda',
      'Madinat Zayed'
    ],
    sharjah: [
      'Al Majaz',
      'Al Nahda Sharjah',
      'Al Qasimia',
      'Al Taawun',
      'Al Khan',
      'Muwaileh',
      'Al Rolla',
      'Industrial Area 1',
      'Industrial Area 6',
      'Industrial Area 12',
      'Al Yarmook',
      'Al Layyeh',
      'Al Qasba',
      'University City',
      'Al Rahmaniya'
    ],
    riyadh: [
      'Olaya',
      'Al Malaz',
      'Al Murabba',
      'Al Sulaimaniyah',
      'King Abdullah Financial District KAFD',
      'Al Nakheel',
      'Al Sahafa',
      'Al Yasmin',
      'Al Narjis',
      'Al Aqiq',
      'Al Wurud',
      'Al Hamra',
      'Al Yarmouk',
      'Al Rawdah',
      'Al Faisaliyah',
      'Diplomatic Quarter DQ'
    ],
    jeddah: [
      'Al Balad',
      'Al Hamra',
      'Al Rawdah',
      'Al Zahra',
      'Al Shate\'e',
      'Al Naeem',
      'Al Mohammadiyyah',
      'Al Salamah',
      'Al Andalus',
      'Al Marwah',
      'Al Bawadi',
      'Al Safa',
      'Al Rehab',
      'Corniche Jeddah',
      'Al Baghdadiyah'
    ],
    mumbai: [
      'Bandra West',
      'Andheri West',
      'Andheri East',
      'Bandra Kurla Complex BKC',
      'Colaba',
      'Nariman Point',
      'Lower Parel',
      'Worli',
      'Powai',
      'Juhu',
      'Malad West',
      'Goregaon West',
      'Borivali West',
      'Thane West',
      'Navi Mumbai Vashi'
    ],
    delhi: [
      'Connaught Place',
      'South Extension',
      'Lajpat Nagar',
      'Karol Bagh',
      'Saket',
      'Hauz Khas',
      'Nehru Place',
      'Chandni Chowk',
      'Pitampura',
      'Rohini',
      'Dwarka',
      'Janakpuri',
      'Okhla Industrial Area',
      'Rajouri Garden',
      'Vasant Kunj'
    ],
    bengaluru: [
      'Koramangala',
      'Indiranagar',
      'HSR Layout',
      'Whitefield',
      'Electronic City',
      'Jayanagar',
      'JP Nagar',
      'MG Road',
      'Marathahalli',
      'BTM Layout',
      'Hebbal',
      'Malleshwaram',
      'Banashankari',
      'Yelahanka'
    ],
    london: [
      'City of London',
      'Westminster',
      'Mayfair',
      'Soho',
      'Canary Wharf',
      'Shoreditch',
      'Camden Town',
      'Kensington',
      'Chelsea',
      'Islington',
      'Greenwich',
      'Stratford',
      'Hammersmith',
      'Wandsworth',
      'Brixton'
    ],
    new_york: [
      'Midtown Manhattan',
      'Lower Manhattan',
      'Financial District',
      'Upper East Side',
      'Upper West Side',
      'Chelsea Manhattan',
      'SoHo Manhattan',
      'Greenwich Village',
      'Williamsburg Brooklyn',
      'DUMBO Brooklyn',
      'Astoria Queens',
      'Long Island City',
      'Flushing Queens'
    ]
  };

  private static readonly NON_PLACE_WORDS = /^(services?|center|centre|company|companies|agency|agencies|store|stores|shop|shops|clinics?|hotels?|restaurants?|cafes?|repair|near|me)$/i;

  /**
   * Splits a free-text target like "dentists in Dubai Marina, Dubai" into the
   * business keyword and the location. Only treats a trailing word as a
   * location when it is a known city or country, so "pizza hut" stays a keyword.
   */
  public static parseTarget(targetQuery: string, cityHint?: string): {
    keyword: string;
    location: string;
    country: CountryGeoEntry | null;
  } {
    const raw = targetQuery.trim().replace(/\s+/g, ' ');
    let keyword = raw;
    let location = (cityHint || '').trim();

    // Prefer the last " in " (the UI always builds "<keyword> in <location>").
    const prepMatch = raw.match(/^(.*)\s+in\s+(.+)$/i) || raw.match(/^(.*?)\s+(?:at|near|around)\s+(.+)$/i);
    if (prepMatch && prepMatch[1].trim()) {
      keyword = prepMatch[1].trim();
      if (!location) location = prepMatch[2].trim();
    } else if (!location) {
      const words = raw.split(' ');
      for (let n = Math.min(3, words.length - 1); n >= 1; n--) {
        const tail = words.slice(-n).join(' ');
        if (n === 1 && this.NON_PLACE_WORDS.test(tail)) continue;
        if (WorldGeo.findCountryExact(tail) || GeoGrid.getBoundingBoxForCity(tail) || this.findPresetKey(tail)) {
          location = tail;
          keyword = words.slice(0, -n).join(' ');
          break;
        }
      }
    }

    location = location.replace(/^[,\s]+|[,\s]+$/g, '');
    const country = location ? WorldGeo.findCountryExact(location) : null;
    return { keyword: keyword || raw, location, country };
  }

  private static findPresetKey(location: string): string | null {
    const first = location.split(',')[0];
    const key = first.toLowerCase().trim().replace(/[\s-]+/g, '_');
    if (!key) return null;
    return Object.keys(this.PRESET_PARTITIONS).find(k => k === key) || null;
  }

  public static async resolveSearchPartitions(
    targetQuery: string,
    cityHint?: string
  ): Promise<SearchPartition[]> {
    const rawQuery = targetQuery.trim();
    if (!rawQuery) return [];

    const { keyword, location, country } = this.parseTarget(rawQuery, cityHint);
    if (!location) {
      return [{ query: rawQuery }];
    }

    // CASE 1: whole location is a country -> one query per major city
    if (country) {
      return [
        { query: `${keyword} in ${country.name}`, areaName: country.name },
        ...country.cities.map(city => ({
          query: `${keyword} in ${city}, ${country.name}`,
          areaName: `${city}, ${country.name}`
        }))
      ];
    }

    // CASE 2: a city with curated neighbourhood list
    const presetKey = this.findPresetKey(location);
    if (presetKey) {
      const cityName = presetKey.replace(/_/g, ' ');
      return [
        { query: `${keyword} in ${location}`, areaName: cityName },
        ...this.PRESET_PARTITIONS[presetKey].map(area => ({
          query: `${keyword} in ${area}, ${cityName}`,
          areaName: area
        }))
      ];
    }

    // CASE 3: any other place -> the plain query plus the city centre viewport.
    // Full-area coverage is handled by the adaptive geo grid in ScraperManager.
    const partitions: SearchPartition[] = [{ query: `${keyword} in ${location}`, areaName: location }];
    const bbox = await GeoGrid.resolveCityBoundingBox(location);
    if (bbox) {
      partitions.push({
        query: keyword,
        lat: (bbox.minLat + bbox.maxLat) / 2,
        lon: (bbox.minLon + bbox.maxLon) / 2,
        zoom: 13,
        areaName: `${location} centre`
      });
    }
    return partitions;
  }

  public static getSubQueries(targetQuery: string, cityHint?: string): string[] {
    const rawQuery = targetQuery.trim();
    if (!rawQuery) return [];

    const countryEntry = WorldGeo.findCountry(rawQuery) || (cityHint ? WorldGeo.findCountry(cityHint) : null);
    if (countryEntry) {
      const countryRegex = new RegExp(`\\b${countryEntry.name}\\b`, 'i');
      const baseCategory = rawQuery.replace(countryRegex, '').replace(/\b(?:in|at|near|around)\b/gi, '').replace(/\s+/g, ' ').trim() || rawQuery;
      return [
        rawQuery,
        ...countryEntry.cities.map(city => `${baseCategory} in ${city}, ${countryEntry.name}`)
      ];
    }

    const lower = rawQuery.toLowerCase();
    for (const [cityKey, subAreas] of Object.entries(this.PRESET_PARTITIONS)) {
      const cityName = cityKey.replace(/_/g, ' ');
      const regex = new RegExp(`\\b${cityName}\\b`, 'i');
      if (regex.test(lower)) {
        const baseQuery = rawQuery
          .replace(new RegExp(`\\bin\\s+${cityName}\\b`, 'gi'), '')
          .replace(new RegExp(`\\bat\\s+${cityName}\\b`, 'gi'), '')
          .replace(new RegExp(`\\bnear\\s+${cityName}\\b`, 'gi'), '')
          .replace(new RegExp(`\\b${cityName}\\b`, 'gi'), '')
          .replace(/\s+/g, ' ')
          .trim() || rawQuery;

        return [
          rawQuery,
          ...subAreas.map(area => `${baseQuery} in ${area}, ${cityName}`.trim())
        ];
      }
    }

    const prepMatch = rawQuery.match(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i);
    if (prepMatch && prepMatch[1]) {
      const city = prepMatch[1].trim();
      const base = rawQuery.replace(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i, '').trim() || rawQuery;
      return [
        rawQuery,
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

    return [rawQuery];
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
}
