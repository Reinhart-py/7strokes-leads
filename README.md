# DashMin

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D.svg)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)

`DashMin` lets you easily extract high-volume B2B leads from Google Maps and 2GIS at high speed using direct HTTP requests, smart geographic grid partitioning, full-detail data extraction, customizable column filtering, and multi-format exports.

---

# Contents

- [Why?](#why)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Installation](#installation)
  - [Method 1: Docker Compose (Recommended)](#method-1-docker-compose-recommended)
  - [Method 2: Manual Setup (Local Dev)](#method-2-manual-setup-local-dev)
- [Dependencies & Prerequisites](#dependencies--prerequisites)
- [Usage](#usage)
  - [Starting a Google Maps Job](#starting-a-google-maps-job)
  - [Starting a 2GIS Job](#starting-a-2gis-job)
  - [Viewing Leads & Live Search](#viewing-leads--live-search)
  - [Exporting with Column Filters (CSV, XLSX, JSON, HTML)](#exporting-with-column-filters-csv-xlsx-json-html)
- [What can I extract?](#what-can-i-extract)
- [Configuration](#configuration)
- [How the Provider Engine Works](#how-the-provider-engine-works)
- [Want to Contribute?](#want-to-contribute)

---

### Why?

I wanted a lead generation tool that allows you to:

- Extract leads **without starting heavy Chromium browser instances** on every query.
- Bypass Google Maps' ~120 results ceiling using **mathematical geographic grid cells**.
- Extract **all details without skipping anything**: phones, emails, websites, all categories, ratings, reviews, addresses, price tiers, operating status, weekly opening hours, plus codes, timezones, and social media links.
- Choose **which columns to keep and which to exclude** before downloading.
- Export leads in multiple formats: **CSV, Excel (.xlsx), JSON, and standalone HTML reports**.
- Run resilient scraping with a **multi-tiered provider hierarchy** (Direct HTTP &rarr; External API &rarr; Playwright browser fallback).
- Manage jobs through a **modern web SaaS dashboard** instead of a desktop application.

`DashMin` checks all of those boxes.

---

### Architecture

```
                           KIRI / DASHMIN INTERFACE
                                     │
                 ┌───────────────────┴───────────────────┐
          GoogleMapsProvider                       TwoGISProvider
                 │                                       │
     ┌───────────┼───────────┐               ┌───────────┴───────────┐
     │           │           │               │                       │
Direct HTTP   SerpApi    Playwright     Direct HTTP             Playwright
 (Primary)   (External)  (Fallback)      (Primary)              (Fallback)
```

---

### Directory Structure

```
DashMin/
├── backend/
│   ├── src/
│   │   ├── scrapers/
│   │   │   ├── http/
│   │   │   │   ├── gmapsHttpProvider.ts      # Fast direct Google Maps HTTP search
│   │   │   │   ├── gmapsParser.ts            # Signature-based defensive payload parser (all fields)
│   │   │   │   └── twoGisHttpProvider.ts     # Direct 2GIS Catalog API 3.0 scraper
│   │   │   ├── grid/
│   │   │   │   └── geoGrid.ts                # Latitude/Longitude bounding box & cell generator
│   │   │   ├── external/
│   │   │   │   └── serpApiProvider.ts        # SerpApi fallback provider
│   │   │   ├── playwright/
│   │   │   │   ├── gmapsPlaywrightFallback.ts# Headless Chromium fallback for Maps
│   │   │   │   └── twoGisPlaywrightFallback.ts# Headless Chromium fallback for 2GIS
│   │   │   ├── partitioner.ts                # District partitioning & concurrency controller
│   │   │   ├── scraperManager.ts             # Provider orchestrator & deduplicator
│   │   │   └── types.ts                      # Core interfaces & data models
│   │   ├── workers/
│   │   │   └── scraperWorker.ts              # BullMQ queue background worker
│   │   ├── routes/
│   │   │   ├── auth.ts                       # User registration, login & session
│   │   │   └── jobs.ts                       # Jobs, leads view & multi-format exports with column filters
│   │   ├── middlewares/
│   │   │   └── auth.ts                       # JWT Bearer token authentication
│   │   ├── db.ts                             # PostgreSQL connection pool
│   │   ├── redis.ts                          # Redis connection client
│   │   ├── queue.ts                          # BullMQ job dispatch queue
│   │   └── index.ts                          # Express server entry point
│   ├── Dockerfile
│   ├── package.json
│   ├── schema.sql                            # Relational database schema with full fields
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── globals.css                   # Global styling & Tailwind utilities
│   │       ├── layout.tsx                    # Root layout component
│   │       └── page.tsx                      # Web dashboard, leads table, search & export modal
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml                        # Full container stack (PostgreSQL, Redis, API, UI)
├── .gitignore
└── README.md
```

---

### Installation

#### Method 1: Docker Compose (Recommended)

The easiest way to run the complete stack (Database, Redis, Backend, and Frontend) is with Docker Compose:

```bash
git clone https://github.com/Reinhart-py/DashMin.git
cd DashMin
docker compose up -d
```

Once running:
- Open your browser to `http://localhost:3000` to access the Dashboard.
- The Backend API will be available at `http://localhost:4000`.

#### Method 2: Manual Setup (Local Dev)

**1. Clone the repository:**
```bash
git clone https://github.com/Reinhart-py/DashMin.git
cd DashMin
```

**2. Setup PostgreSQL & Redis:**
Ensure PostgreSQL is running on port `5432` with a database named `dashmin`, and Redis is running on port `6379`.
Run the SQL schema:
```bash
psql -U postgres -d dashmin -f backend/schema.sql
```

**3. Setup and start the Backend:**
```bash
cd backend
npm install
npm run dev
```

**4. Setup and start the Frontend:**
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000`.

---

### Dependencies & Prerequisites

- **Node.js** (v20 or newer recommended, tested on v24)
- **PostgreSQL** (v14 or newer)
- **Redis** (v6 or newer)
- **Docker & Docker Compose** (Optional, for containerized run)

---

### Usage

1. Open `http://localhost:3000` and register/login with any test credentials.
2. Navigate to **Google Maps** or **2GIS Catalog** in the sidebar.
3. Enter your target keyword, location, and collection cap (e.g., `Real Estate in Dubai`, Cap: `200`).
4. Click **Run Scraper Job**.

#### Starting a Google Maps Job
The system automatically:
1. Detects city boundaries and generates geographic cells (e.g. 3km x 3km squares).
2. Sends direct HTTP requests extracting business data directly from Google Maps response payloads.
3. Paginates up to 120 leads per cell without launching Chromium.
4. Deduplicates leads across overlapping cells and saves all extracted attributes to PostgreSQL in real-time.

#### Starting a 2GIS Job
1. Select the **2GIS Catalog** tab.
2. Specify the city (e.g., `Dubai`) and search query (e.g., `Restaurants`).
3. The worker queries the 2GIS Catalog API 3.0, retrieving full contact groups and ratings.

#### Viewing Leads & Live Search
- Go to the **Job History** tab.
- Click **View Leads** to open the real-time leads viewer directly inside your browser.
- Use the built-in search bar to filter loaded leads instantly by name, phone, email, category, or address.

#### Exporting with Column Filters (CSV, XLSX, JSON, HTML)
- Click **Export & Filter** on any completed or running job.
- Select your preferred file format:
  - **CSV**: RFC-compliant comma-separated values.
  - **Excel (XLSX)**: Formatted Microsoft Excel workbook.
  - **JSON**: Formatted JSON array.
  - **HTML**: Standalone dark-mode HTML table report with clickable links and summary stats.
- Check or uncheck individual columns (or click "Select All" / "Reset") to customize exactly which fields appear in your export file.
- Click **Download** to save your customized dataset.

---

### What can I extract?

DashMin extracts and preserves all available data points without skipping details:

| Field | Description |
| :--- | :--- |
| `Business Name` | Name of the company or establishment |
| `Category` | Primary business industry or rubric |
| `All Categories` | Complete list of secondary categories and tags |
| `Phone 1` | Primary contact phone number |
| `Phone 2` | Secondary contact phone number |
| `Email` | Business email address (deeply scanned from payload & contacts) |
| `Website` | Official business website URL |
| `Address` | Complete formatted street, district, and location address |
| `City` | City or municipality |
| `State` | State or administrative region |
| `Country` | Country name |
| `Postal Code` | Postal / ZIP code |
| `Rating` | Star rating (e.g. 4.8) |
| `Reviews Count` | Total number of customer reviews |
| `Price Level` | Price tier (`$`, `$$`, `$$$`, `$$$$`) |
| `Operational Status` | Status (Open, Closed, Temporarily Closed) |
| `Latitude` & `Longitude` | Exact geographic coordinates |
| `Plus Code` | Open Location Code / Plus Code |
| `Timezone` | Business operational timezone |
| `Opening Hours` | Full weekly schedule by day & hours |
| `Social Links` | Facebook, Instagram, LinkedIn, Twitter/X, TikTok, YouTube URLs |
| `About Attributes` | Amenities, accessibility, service options, and feature lists |
| `Place ID` | Unique Google Maps / 2GIS identifier |

---

### Configuration

Environment variables can be configured in `backend/.env`:

```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dashmin
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-jwt-key
SERPAPI_API_KEY=your_optional_serpapi_key_here
```

---

### How the Provider Engine Works

1. **Direct HTTP First**: Requests Google Maps internal endpoints directly with custom protobuf parameters (`pb`) controlling viewport, location, and pagination offsets (`!8i${start}`).
2. **Signature-Based Parsing**: Rather than relying on fragile CSS locators or fixed JSON paths, the parser searches for record signatures (`0x...:0x...` feature IDs). If Google moves elements, extraction does not crash.
3. **Resilient Fallbacks**: If direct HTTP is challenged or blocked, the engine cascades to external APIs (like SerpApi) or launches headless Playwright browser workers to ensure you never lose data.
4. **Dynamic Column Filtering Engine**: The export layer filters database records on the fly based on your selected column list, generating clean, tailored files in any of the 4 supported formats.

---

### Want to Contribute?

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue for bug reports and feature suggestions.
