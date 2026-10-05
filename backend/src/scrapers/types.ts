export interface ScrapedLead {
  query: string;
  place_id?: string | null;
  title: string;
  category?: string | null;
  categories?: string[];
  phone_1?: string | null;
  phone_2?: string | null;
  website?: string | null;
  address?: string | null;
  rating?: string | null;
  reviews?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  email?: string | null;
  social_links?: { platform: string; url: string }[];
  opening_hours?: string[];
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
