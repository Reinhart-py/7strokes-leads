import { ScrapedLead } from '../types';
import { classifyPhones } from '../phoneClassifier';

export class GmapsParser {
  private static readonly FTID_REGEX = /0x[0-9a-f]{10,}:0x[0-9a-f]{10,}/i;
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private static readonly PRICE_REGEX = /^\${1,4}$/;
  private static readonly SOCIAL_PLATFORMS: Record<string, string> = {
    'facebook.com': 'facebook',
    'instagram.com': 'instagram',
    'twitter.com': 'twitter',
    'x.com': 'twitter',
    'linkedin.com': 'linkedin',
    'tiktok.com': 'tiktok',
    'youtube.com': 'youtube'
  };

  public static stripXssi(text: string): string {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/\/\*""\*\//g, '').trim();
    if (cleaned.startsWith(")]}'")) {
      cleaned = cleaned.substring(4);
    }
    if (cleaned.startsWith('/*-secure-')) {
      const idx = cleaned.indexOf('\n');
      if (idx !== -1) cleaned = cleaned.substring(idx + 1);
    }
    return cleaned.trim();
  }

  public static safeGet(node: any, ...indices: number[]): any {
    let current = node;
    for (const idx of indices) {
      if (!Array.isArray(current) || idx < 0 || idx >= current.length) {
        return null;
      }
      current = current[idx];
    }
    return current;
  }

  public static isRecord(node: any): boolean {
    if (!Array.isArray(node) || node.length < 15) return false;
    const ftid = this.safeGet(node, 10);
    const name = this.safeGet(node, 11);
    return (
      typeof ftid === 'string' &&
      this.FTID_REGEX.test(ftid) &&
      typeof name === 'string' &&
      name.trim().length > 1
    );
  }

  public static findRecords(node: any, records: any[] = []): any[] {
    if (!node || typeof node !== 'object') return records;

    if (Array.isArray(node)) {
      if (this.isRecord(node)) {
        records.push(node);
      }
      for (const item of node) {
        this.findRecords(item, records);
      }
    } else if (typeof node === 'object') {
      for (const key of Object.keys(node)) {
        this.findRecords(node[key], records);
      }
    }
    return records;
  }

  public static extractEmails(raw: string): string[] {
    const matches = raw.match(this.EMAIL_REGEX) || [];
    const unique = Array.from(new Set(matches)).filter(
      e => !e.endsWith('.png') && !e.endsWith('.jpg') && !e.endsWith('.webp') && !e.includes('google.com')
    );
    return unique;
  }

  public static extractSocials(raw: string): { platform: string; url: string }[] {
    const socials: { platform: string; url: string }[] = [];
    const urlMatches = raw.match(/https?:\/\/[^\s"'\\]+/g) || [];
    const seen = new Set<string>();

    for (const u of urlMatches) {
      const lower = u.toLowerCase();
      for (const [domain, platform] of Object.entries(this.SOCIAL_PLATFORMS)) {
        if (lower.includes(domain) && !seen.has(u)) {
          seen.add(u);
          socials.push({ platform, url: u });
          break;
        }
      }
    }
    return socials;
  }

  public static parseOpeningHours(hoursNode: any): string[] {
    if (!Array.isArray(hoursNode)) return [];
    const days = this.safeGet(hoursNode, 0);
    if (!Array.isArray(days)) return [];

    const formatted: string[] = [];
    for (const d of days) {
      if (!Array.isArray(d)) continue;
      const dayName = this.safeGet(d, 0);
      const hoursArray = this.safeGet(d, 3);
      if (typeof dayName === 'string' && Array.isArray(hoursArray) && hoursArray.length > 0) {
        const timeStr = this.safeGet(hoursArray, 0, 0);
        if (typeof timeStr === 'string') {
          formatted.push(`${dayName}: ${timeStr}`);
        }
      }
    }
    return formatted;
  }

  private static str(node: any): string | null {
    return typeof node === 'string' && node.trim().length > 0 ? node.trim() : null;
  }

  /**
   * Address: index 39 holds the full formatted address and index 183 the
   * structured components (borough, street, city, postal code, state,
   * country code). Falls back to the address lines at index 2.
   */
  public static parseAddress(record: any) {
    const lines: string[] = (this.safeGet(record, 2) || []).filter((a: any) => typeof a === 'string');
    const full = this.str(this.safeGet(record, 39)) || (lines.length ? lines.join(', ') : null);
    const comp = this.safeGet(record, 183, 1);

    let street = this.str(this.safeGet(comp, 1));
    const borough = this.str(this.safeGet(comp, 0));
    let city = this.str(this.safeGet(comp, 3));
    let postalCode = this.str(this.safeGet(comp, 4));
    let state = this.str(this.safeGet(comp, 5));
    let country = this.str(this.safeGet(comp, 6));

    // Fallback: "Street - Area - City - Country" or "Street, City, Country"
    if (full && (!city || !country)) {
      const parts = full.split(/\s+-\s+|,\s*/).map(p => p.trim()).filter(Boolean);
      if (!street && parts.length > 0) street = parts[0];
      if (!country && parts.length > 1) country = parts[parts.length - 1].replace(/\d+/g, '').trim() || null;
      let cityIdx = parts.length - 2;
      const stateZip = parts.length > 3 ? parts[cityIdx].match(/^([A-Za-z .]+?)\s+([A-Z\d][A-Z\d -]{2,9})$/) : null;
      if (stateZip && /\d/.test(stateZip[2])) {
        if (!state) state = stateZip[1].trim();
        if (!postalCode) postalCode = stateZip[2].trim();
        cityIdx -= 1;
      }
      if (!city && cityIdx > 0) city = parts[cityIdx].replace(/\b\d{3,}\b/g, '').trim() || null;
    }
    if (!street && borough) street = borough;
    if (street && borough && !street.includes(borough)) street = `${street}, ${borough}`;

    if (!postalCode && full) {
      const m = full.match(/\b([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}|\d{5}(?:-\d{4})?|\d{6})\b/);
      if (m) postalCode = m[1];
    }
    if (country && country.length <= 3 && country === country.toUpperCase()) {
      country = this.countryFromCode(country) || country;
    }
    if (state && state === city) state = null;

    return { address: full, street, city, state, country, postalCode };
  }

  private static countryFromCode(code: string): string | null {
    try {
      const dn = new (Intl as any).DisplayNames(['en'], { type: 'region' });
      return dn.of(code.toUpperCase()) || null;
    } catch {
      return null;
    }
  }

  /** Only reads the real phone fields, never arbitrary digit runs (ids, coordinates). */
  public static extractPhoneCandidates(record: any): string[] {
    const out: string[] = [];
    const node = this.safeGet(record, 178, 0);
    const display = this.str(this.safeGet(node, 0));
    const intl = this.str(this.safeGet(node, 1, 1, 0)) || this.str(this.safeGet(node, 3));
    if (intl && /^\+?[\d\s()-]{7,}$/.test(intl)) out.push(intl);
    if (display && /^\+?[\d\s()-]{6,}$/.test(display)) out.push(display);

    const json = JSON.stringify(record);
    for (const m of json.matchAll(/tel:(\+?[\d\s()-]{7,20})/g)) out.push(m[1]);
    return out;
  }

  public static cleanWebsite(url: string | null): string | null {
    if (!url) return null;
    let u = url.trim();
    if (u.startsWith('/url?') || u.includes('google.com/url?')) {
      const m = u.match(/[?&]q=([^&]+)/);
      u = m ? decodeURIComponent(m[1]) : '';
    }
    if (!/^https?:\/\//i.test(u)) return null;
    if (/(google\.com|gstatic\.com|goo\.gl|g\.page)/i.test(u)) return null;
    return u;
  }

  public static parseSearchResponse(rawText: string, query: string): ScrapedLead[] {
    const cleanedText = this.stripXssi(rawText);
    let data: any = null;

    try {
      data = JSON.parse(cleanedText);
      if (data && typeof data === 'object' && typeof data.d === 'string') {
        data = JSON.parse(this.stripXssi(data.d));
      }
    } catch {
      const stateMatch = rawText.match(/window\.APP_INITIALIZATION_STATE\s*=\s*(.*?);<\/script>/s) ||
                         rawText.match(/window\.APP_INITIALIZATION_STATE\s*=\s*(.*?);/s);
      if (stateMatch && stateMatch[1]) {
        try {
          data = JSON.parse(stateMatch[1]);
        } catch {}
      }
    }

    if (!data) return [];

    const rawRecords = this.findRecords(data);
    const leads: ScrapedLead[] = [];
    const seen = new Set<string>();

    for (const record of rawRecords) {
      const placeId = this.safeGet(record, 10);
      const title = (this.safeGet(record, 11) || '').replace(/\r?\n/g, ' ').trim();
      const dedupKey = typeof placeId === 'string' ? placeId : title;
      if (!title || seen.has(dedupKey)) continue;
      seen.add(dedupKey);

      const rawCats = this.safeGet(record, 13);
      const categories: string[] = Array.isArray(rawCats)
        ? rawCats.filter((c: any) => typeof c === 'string')
        : [];
      const primaryCategory = categories[0] || null;

      const addr = this.parseAddress(record);
      const { address, street, city, state, country } = addr;
      const postalCode = addr.postalCode;

      let plusCode: string | null = null;
      const pcNode = this.safeGet(record, 183, 2, 2, 0);
      if (typeof pcNode === 'string' && /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}/i.test(pcNode)) {
        plusCode = pcNode;
      }

      let rating: string | null = null;
      let reviews: string | null = null;
      const ratingNode = this.safeGet(record, 4);
      if (Array.isArray(ratingNode)) {
        const rVal = this.safeGet(ratingNode, 7) ?? this.safeGet(ratingNode, 0, 7);
        const cVal = this.safeGet(ratingNode, 8) ?? this.safeGet(ratingNode, 0, 8);
        if (typeof rVal === 'number') rating = rVal.toString();
        if (typeof cVal === 'number') reviews = cVal.toString();
      }

      let website: string | null = null;
      const webNode = this.safeGet(record, 7);
      if (Array.isArray(webNode)) {
        const wVal = this.safeGet(webNode, 0);
        if (typeof wVal === 'string') website = wVal;
        else if (Array.isArray(wVal) && typeof wVal[0] === 'string') website = wVal[0];
      } else if (typeof webNode === 'string') {
        website = webNode;
      }
      website = this.cleanWebsite(website);

      let lat: number | null = null;
      let lon: number | null = null;
      const coordNode = this.safeGet(record, 9);
      if (Array.isArray(coordNode)) {
        lat = typeof coordNode[2] === 'number' && Math.abs(coordNode[2]) <= 90 ? coordNode[2] : null;
        lon = typeof coordNode[3] === 'number' && Math.abs(coordNode[3]) <= 180 ? coordNode[3] : null;
      }

      const rawCandidates = this.extractPhoneCandidates(record);
      const recordJson = JSON.stringify(record);

      const { primary: phone1, secondary: phone2 } = classifyPhones(rawCandidates);

      const emails = this.extractEmails(recordJson);
      const socials = this.extractSocials(recordJson);

      let status: string | null = null;
      const statusNode = this.safeGet(record, 34, 4, 4);
      if (typeof statusNode === 'string' && statusNode.length < 80) {
        status = statusNode;
      }

      let priceLevel: string | null = null;
      const priceNode = this.safeGet(record, 4, 2);
      if (typeof priceNode === 'string' && this.PRICE_REGEX.test(priceNode)) {
        priceLevel = priceNode;
      }

      let timezone: string | null = null;
      const tzNode = this.safeGet(record, 30);
      if (typeof tzNode === 'string') {
        timezone = tzNode;
      }

      const openingHours = this.parseOpeningHours(this.safeGet(record, 203));

      let aboutList: any[] = [];
      const aboutNode = this.safeGet(record, 100);
      if (Array.isArray(aboutNode)) {
        const groups = this.safeGet(aboutNode, 1) || aboutNode;
        if (Array.isArray(groups)) {
          for (const g of groups) {
            if (Array.isArray(g) && typeof g[1] === 'string' && Array.isArray(g[2])) {
              const attrs = g[2].map((attr: any) => this.safeGet(attr, 1)).filter(Boolean);
              if (attrs.length > 0) {
                aboutList.push({ category: g[1], items: attrs });
              }
            }
          }
        }
      }

      leads.push({
        query,
        place_id: placeId || null,
        title,
        category: primaryCategory,
        categories: categories.length > 0 ? categories : undefined,
        phone_1: phone1 || null,
        phone_2: phone2 || null,
        email: emails[0] || null,
        website: website || null,
        address: address || null,
        street: street || null,
        city: city || null,
        state: state || null,
        country: country || null,
        postal_code: postalCode || null,
        rating,
        reviews,
        price_level: priceLevel || null,
        status: status || null,
        latitude: lat,
        longitude: lon,
        plus_code: plusCode || null,
        timezone: timezone || null,
        opening_hours: openingHours.length > 0 ? openingHours : undefined,
        social_links: socials.length > 0 ? socials : undefined,
        about: aboutList.length > 0 ? aboutList : undefined,
        extra_data: {
          emails,
          all_categories: categories,
          opening_hours: openingHours,
          social_links: socials,
          about: aboutList
        }
      });
    }

    return leads;
  }
}
