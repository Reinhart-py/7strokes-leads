import { ScrapedLead } from '../types';

export class GmapsParser {
  private static readonly FTID_REGEX = /0x[0-9a-f]{10,}:0x[0-9a-f]{10,}/i;
  private static readonly PHONE_REGEX = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}/;
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
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

  public static extractDeepEmail(raw: string): string | null {
    const match = raw.match(this.EMAIL_REGEX);
    return match ? match[0] : null;
  }

  public static extractDeepSocials(raw: string): { platform: string; url: string }[] {
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
      const addrNode = this.safeGet(record, 2);
      if (Array.isArray(addrNode)) {
        address = addrNode.filter((a: any) => typeof a === 'string').join(', ');
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

      let phone: string | null = null;
      const phoneNode = this.safeGet(record, 178);
      if (Array.isArray(phoneNode)) {
        const pVal = this.safeGet(phoneNode, 0, 0);
        if (typeof pVal === 'string' && pVal.length >= 7) {
          phone = pVal.trim();
        }
      }

      const recordJson = JSON.stringify(record);
      if (!phone) {
        const match = recordJson.match(this.PHONE_REGEX);
        if (match && match[0].replace(/\D/g, '').length >= 7) {
          phone = match[0].trim();
        }
      }

      const email = this.extractDeepEmail(recordJson);
      const socials = this.extractDeepSocials(recordJson);

      leads.push({
        query,
        place_id: placeId || null,
        title,
        category: primaryCategory,
        categories,
        phone_1: phone || null,
        phone_2: null,
        website: website || null,
        address: address || null,
        rating,
        reviews,
        latitude: lat,
        longitude: lon,
        email: email || null,
        social_links: socials.length > 0 ? socials : undefined
      });
    }

    return leads;
  }
}
