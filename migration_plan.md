# Migration Plan: Kiri to DashMin SaaS

## 1. Goal
Migrate the existing Kiri Electron desktop application into a production-ready cloud-based SaaS application called DashMin.

## 2. Architecture
- **Frontend**: Next.js (App Router) + React + Tailwind CSS. We will port the existing `index.html` UI into React components.
- **Backend / API**: Node.js (Express) with clean layers for REST API to allow separating API nodes from Worker nodes.
- **Database**: PostgreSQL (multi-tenant structure by `user_id`).
- **Queue**: Redis + BullMQ for background job processing (scraping tasks).
- **Workers**: Node.js worker processes consuming BullMQ, running Playwright (cloud-safe with concurrency limits).
- **Storage**: Local/S3-compatible object storage interface for CSV exports.

## 3. Scraper Engine Decision
**Current Implementation**: Playwright directly driving Google Maps and 2GIS with DOM extraction.
**Alternatives Evaluated**:
1. *Keep Playwright*: High control, zero variable cost per request, already implemented.
2. *Playwright with Network Interception*: Faster, avoids DOM parsing, but highly fragile to API changes.
3. *External API (Apify, SerpApi)*: More reliable, handles proxies, but introduces high variable costs.
**Decision**: Keep the existing Playwright implementation for MVP but wrap it in a `ScraperProvider` interface. Make it "cloud-safe" by using headless mode, single browser instance per worker with multiple contexts, and controlled concurrency (BullMQ concurrency settings). This ensures lowest reasonable operating cost.

## 4. Implementation Steps
### Phase 1: Foundation (Backend & Database)
1. Initialize Node.js backend project (`backend/`).
2. Setup PostgreSQL schema (Users, Jobs, Results, History).
3. Setup Redis and BullMQ.
4. Implement Authentication (JWT based).
5. Port existing Playwright scrapers (`scraper-gmaps.js`, `scraper-2gis.js`) into BullMQ worker processes.

### Phase 2: Frontend (Next.js)
1. Initialize Next.js project (`frontend/`).
2. Migrate `index.html` CSS and markup to React components.
3. Connect Frontend to Backend API for authentication, job submission, and progress tracking (polling).

### Phase 3: MVP Polish
1. Handle job checkpoints, duplicate removal, and CSV export generation in the worker.
2. Implement Admin dashboard to monitor users and jobs.
3. Test end-to-end flows.

## 5. Deployment
- **API & Frontend**: VPS or Vercel.
- **Workers & Redis/Postgres**: Require a VPS with enough RAM for Playwright (at least 2GB-4GB). Dockerized setup recommended.
