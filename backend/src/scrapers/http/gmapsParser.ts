import { ScrapedLead } from '../types';

export class GmapsParser {
  private static readonly FTID_REGEX = /0x[0-9a-f]{10,}:0x[0-9a-f]{10,}/i;
  private static readonly PHONE_REGEX = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/g;
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
      if (!title || seen.has(title)) continue;
      seen.add(title);

      const rawCats = this.safeGet(record, 13);
      const categories: string[] = Array.isArray(rawCats)
        ? rawCats.filter((c: any) => typeof c === 'string')
        : [];
      const primaryCategory = categories[0] || null;

      let address: string | null = null;
      let city: string | null = null;
      let state: string | null = null;
      let country: string | null = null;
      let postalCode: string | null = null;

      const addrNode = this.safeGet(record, 2);
      if (Array.isArray(addrNode)) {
        const parts = addrNode.filter((a: any) => typeof a === 'string');
        address = parts.join(', ');
        if (parts.length > 1) {
          country = parts[parts.length - 1];
        }
        if (parts.length > 2) {
          city = parts[parts.length - 2];
        }
      }

      let plusCode: string | null = null;
      const pcNode = this.safeGet(record, 2, 2);
      if (typeof pcNode === 'string' && pcNode.length > 0) {
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
      if (website && (website.includes('google.com') || website.includes('gstatic.com'))) {
        website = null;
      }

      let lat: number | null = null;
      let lon: number | null = null;
      const coordNode = this.safeGet(record, 9);
      if (Array.isArray(coordNode)) {
        lat = typeof coordNode[2] === 'number' ? coordNode[2] : null;
        lon = typeof coordNode[3] === 'number' ? coordNode[3] : null;
      }

      let phone1: string | null = null;
      let phone2: string | null = null;
      const phoneNode = this.safeGet(record, 178);
      if (Array.isArray(phoneNode)) {
        const p1 = this.safeGet(phoneNode, 0, 0);
        if (typeof p1 === 'string' && p1.length >= 7) {
          phone1 = p1.trim();
        }
        const p2 = this.safeGet(phoneNode, 0, 1);
        if (typeof p2 === 'string' && p2.length >= 7 && !p2.toLowerCase().includes('fax')) {
          phone2 = p2.trim();
        }
      }

      const recordJson = JSON.stringify(record);

      if (!phone1) {
        const allPhones = recordJson.match(this.PHONE_REGEX) || [];
        const validPhones = allPhones.filter(p => p.replace(/\D/g, '').length >= 7);
        if (validPhones[0]) phone1 = validPhones[0].trim();
        if (validPhones[1]) phone2 = validPhones[1].trim();
      }

      const emails = this.extractEmails(recordJson);
      const socials = this.extractSocials(recordJson);

      let status: string | null = null;
      const statusNode = this.safeGet(record, 34, 4, 4) || this.safeGet(record, 34);
      if (typeof statusNode === 'string') {
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
