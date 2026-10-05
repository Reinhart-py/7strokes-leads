export interface ScrapedLead {
  query: string;
  place_id?: string | null;
  title: string;
  category?: string | null;
  categories?: string[];
  phone_1?: string | null;
  phone_2?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  rating?: string | null;
  reviews?: string | null;
  price_level?: string | null;
  status?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  plus_code?: string | null;
  timezone?: string | null;
  opening_hours?: string[];
  social_links?: { platform: string; url: string }[];
  about?: any[];
  extra_data?: Record<string, any>;
}

export interface GridBoundingBox {
  minLat: number;
  minLon: number;
  maxLat: number;
  maxLon: number;
}

export interface GridCell {
  lat: number;
  lon: number;
}

export interface ScraperOptions {
  query: string;
  city?: string;
  cap?: number;
  bbox?: GridBoundingBox;
  cellSizeKm?: number;
  lat?: number;
  lon?: number;
  zoom?: number;
  maxPagesPerCell?: number;
  partitionAreas?: string[];
  jobId?: string;
  startIdx?: number;
  initialSaved?: number;
  proxy?: string;
  seenKeys?: Set<string>;
  concurrency?: number;
}

export interface ScraperControl {
  checkCancelled: () => Promise<boolean>;
  log: (msg: string) => Promise<void>;
  updateProgress: (step: number, totalSaved: number) => Promise<void>;
  saveLead: (lead: ScrapedLead) => Promise<void>;
}

export interface IScraperProvider {
  readonly name: string;
  search(options: ScraperOptions, control: ScraperControl): Promise<ScrapedLead[]>;
}
