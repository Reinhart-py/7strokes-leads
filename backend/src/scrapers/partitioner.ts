import { ScrapedLead } from './types';
import { WorldGeo } from './grid/worldGeo';
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

  public static async resolveSearchPartitions(
    targetQuery: string,
    cityHint?: string
  ): Promise<SearchPartition[]> {
    const rawQuery = targetQuery.trim();
    if (!rawQuery) return [];

    let locationCandidate = (cityHint || '').trim();
    let baseCategory = rawQuery;

    if (!locationCandidate) {
      const prepMatch = rawQuery.match(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i);
      if (prepMatch && prepMatch[1]) {
        locationCandidate = prepMatch[1].trim();
        baseCategory = rawQuery.replace(/\b(?:in|at|near|around)\s+([a-zA-Z\s,]+)$/i, '').trim() || rawQuery;
      } else {
        const countryMatch = WorldGeo.findCountry(rawQuery);
        if (countryMatch) {
          locationCandidate = countryMatch.name;
          const countryRegex = new RegExp(`\\b${countryMatch.name}\\b`, 'i');
          baseCategory = rawQuery.replace(countryRegex, '').replace(/\s+/g, ' ').trim() || rawQuery;
        } else {
          const words = rawQuery.split(/\s+/);
          if (words.length >= 2) {
            const lastWord = words[words.length - 1];
            if (lastWord.length >= 3 && !/^(services|center|company|agency|store|shop|clinics|clinic|hotel|hotels)$/i.test(lastWord)) {
              locationCandidate = lastWord;
              baseCategory = words.slice(0, -1).join(' ');
            }
          }
        }
      }
    }

    if (!locationCandidate) {
      return [{ query: rawQuery }];
    }

    // CASE 1: Location is a Country (e.g. "Kenya", "Germany", "Iceland", "Brazil", "India", etc.)
    const countryEntry = WorldGeo.findCountry(locationCandidate);
    if (countryEntry) {
      const partitions: SearchPartition[] = [];
      const countryCities = countryEntry.cities;

      for (const city of countryCities) {
        partitions.push({
          query: `${baseCategory} in ${city}, ${countryEntry.name}`,
          areaName: `${city}, ${countryEntry.name}`
        });
      }

      if (partitions.length > 0) {
        return [
          { query: rawQuery, areaName: countryEntry.name },
          ...partitions
        ];
      }
    }

    // CASE 2: Location is a City with Preset Localities (e.g. Dubai, Jaipur, Abu Dhabi, London, etc.)
    const cityKey = locationCandidate.toLowerCase().replace(/[\s-]+/g, '_');
    for (const [key, subAreas] of Object.entries(this.PRESET_PARTITIONS)) {
      if (cityKey === key || cityKey.includes(key) || key.includes(cityKey)) {
        const cityName = key.replace(/_/g, ' ');
        return [
          { query: rawQuery, areaName: cityName },
          ...subAreas.map(area => ({
            query: `${baseCategory} in ${area}, ${cityName}`,
            areaName: area
          }))
        ];
      }
    }

    // CASE 3: ANY Arbitrary City / Location in the World (e.g. Austin, Nairobi, Reykjavik, Munich, etc.)
    const bbox = await GeoGrid.resolveCityBoundingBox(locationCandidate);
    const partitions: SearchPartition[] = [];

    partitions.push({ query: rawQuery, areaName: locationCandidate });

    if (bbox) {
      const midLat = (bbox.minLat + bbox.maxLat) / 2;
      const midLon = (bbox.minLon + bbox.maxLon) / 2;

      // Generate directional sectors with spatial coordinate anchors
      const sectors = [
        { name: 'Central', lat: midLat, lon: midLon, zoom: 14 },
        { name: 'Downtown', lat: midLat, lon: midLon, zoom: 14 },
        { name: 'North', lat: midLat + (bbox.maxLat - midLat) * 0.6, lon: midLon, zoom: 13 },
        { name: 'South', lat: midLat - (midLat - bbox.minLat) * 0.6, lon: midLon, zoom: 13 },
        { name: 'East', lat: midLat, lon: midLon + (bbox.maxLon - midLon) * 0.6, zoom: 13 },
        { name: 'West', lat: midLat, lon: midLon - (midLon - bbox.minLon) * 0.6, zoom: 13 },
        { name: 'Business District', lat: midLat, lon: midLon, zoom: 14 },
        { name: 'Commercial Hub', lat: midLat, lon: midLon, zoom: 14 },
        { name: 'Industrial Area', lat: midLat - (midLat - bbox.minLat) * 0.4, lon: midLon + (bbox.maxLon - midLon) * 0.4, zoom: 13 },
        { name: 'Main Market', lat: midLat, lon: midLon, zoom: 14 }
      ];

      for (const sec of sectors) {
        partitions.push({
          query: `${baseCategory} in ${sec.name} ${locationCandidate}`,
          lat: sec.lat,
          lon: sec.lon,
          zoom: sec.zoom,
          areaName: `${sec.name} ${locationCandidate}`
        });
      }

      // Also generate adaptive grid cells for complete geographic coverage
      const cells = GeoGrid.generateCells(bbox, 3.5);
      const cellSamples = cells.slice(0, 10);
      for (let i = 0; i < cellSamples.length; i++) {
        const cell = cellSamples[i];
        partitions.push({
          query: `${baseCategory} in ${locationCandidate}`,
          lat: cell.lat,
          lon: cell.lon,
          zoom: 14,
          areaName: `Sector ${i + 1} (${locationCandidate})`
        });
      }

      return partitions;
    }

    // Fallback if geocoder gave no bbox
    return [
      { query: rawQuery },
      { query: `${baseCategory} in Central ${locationCandidate}` },
      { query: `${baseCategory} in North ${locationCandidate}` },
      { query: `${baseCategory} in South ${locationCandidate}` },
      { query: `${baseCategory} in East ${locationCandidate}` },
      { query: `${baseCategory} in West ${locationCandidate}` },
      { query: `${baseCategory} in Downtown ${locationCandidate}` },
      { query: `${baseCategory} in Business District ${locationCandidate}` }
    ];
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
