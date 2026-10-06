# 7strokes — High-Performance B2B Lead Generation Engine

<p align="center">
  <img src="https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png" alt="7strokes Logo" width="220" />
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-336791.svg)](https://www.postgresql.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Zero--Config-003B57.svg)](https://www.sqlite.org/)
[![Redis](https://img.shields.io/badge/Redis-BullMQ-DC382D.svg)](https://redis.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)

**7strokes** is a modern, high-speed B2B lead generation and web scraping platform designed to extract local business leads, verified phone numbers, and operational details at massive scale. Built with direct concurrent HTTP scrapers, intelligent geographic grid partitioning, multi-tenant authentication, and a responsive glassmorphic dashboard.

---

# Contents

- [Overview & Key Features](#overview--key-features)
- [Architecture](#architecture)
- [Directory Structure](#directory-structure)
- [Deployment & Setup Guide](#deployment--setup-guide)
  - [Method 1: Local Zero-Config Setup (Fastest)](#method-1-local-zero-config-setup-fastest)
  - [Method 2: Docker Compose (Full Stack)](#method-2-docker-compose-full-stack)
  - [Method 3: Cloudflare Workers/Pages + Public Tunnel](#method-3-cloudflare-workerspages--public-tunnel)
  - [Method 4: 24/7 Production VPS Hosting (Ubuntu + PM2 + Nginx + SSL)](#method-4-247-production-vps-hosting-ubuntu--pm2--nginx--ssl)
- [Usage & Features](#usage--features)
  - [Theme-Aware Experience](#theme-aware-experience)
  - [User Access & Admin Approval](#user-access--admin-approval)
  - [Registration Visibility Controls](#registration-visibility-controls)
  - [Starting a Google Maps Search](#starting-a-google-maps-search)
  - [Starting a 2GIS Fast HTTP Search](#starting-a-2gis-fast-http-search)
  - [Saved Leads & Real-Time Monitoring](#saved-leads--real-time-monitoring)
  - [Fullscreen Zoom & Responsive Drawer](#fullscreen-zoom--responsive-drawer)
  - [Custom Multi-Format Exports](#custom-multi-format-exports)
  - [Reverse-Engineering Honeypot](#reverse-engineering-honeypot)
- [What Can 7strokes Extract?](#what-can-7strokes-extract)
- [Configuration & Environment Variables](#configuration--environment-variables)
- [Troubleshooting & FAQ](#troubleshooting--faq)
- [License & Contributions](#license--contributions)

---

### Overview & Key Features

- **No Headless Browser Overhead by Default**: Extracts thousands of leads using direct, high-concurrency HTTP requests rather than running heavy Chromium instances on every query.
- **Bypasses the 120-Result Ceiling**: Employs mathematical geographic coordinate grids and district partitioning to sweep entire metropolitan areas and extract thousands of leads per search.
- **Dual Scraping Engines**:
  - **Google Maps**: Signature-based defensive payload parser extracting phones, categories, ratings, reviews, addresses, and hours.
  - **2GIS Directory**: High-speed catalog pagination and firm detail scraping with official GCC coverage (all 7 UAE Emirates, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Azerbaijan, Cyprus).
- **Zero-Config Resilient Fallbacks**:
  - Automatically falls back from PostgreSQL to local **SQLite** (`dashmin.sqlite`) when PostgreSQL is offline.
  - Automatically falls back from Redis/BullMQ to an **in-process queue** when Redis is offline.
- **Tunnel & Cloudflare Ready**:
  - Built-in automatic `ngrok-skip-browser-warning` headers ensure seamless live communication with free ngrok tunnels and Cloudflare Pages/Workers deployments.
- **Granular Column Selection & Multi-Format Export**:
  - Export filtered datasets to **CSV**, **Excel (.xlsx)**, **JSON**, or standalone **HTML** reports.

---

### Architecture

```
                            7STROKES WEB INTERFACE
                                      │
                   ┌──────────────────┴──────────────────┐
            GoogleMapsProvider                     TwoGISProvider
                   │                                     │
       ┌───────────┼───────────┐             ┌───────────┴───────────┐
       │           │           │             │                       │
  Direct HTTP   SerpApi    Playwright   Direct HTTP             Playwright
   (Primary)   (External)  (Fallback)    (Primary)              (Fallback)
```

---

### Directory Structure

```
7strokes/
├── backend/
│   ├── src/
│   │   ├── scrapers/
│   │   │   ├── http/
│   │   │   │   ├── gmapsHttpProvider.ts      # Fast direct Google Maps HTTP search
│   │   │   │   ├── gmapsParser.ts            # Signature-based defensive payload parser
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
│   │   │   ├── jobExecutor.ts                # In-process and queue scraper executor
│   │   │   └── scraperWorker.ts              # BullMQ queue background worker
│   │   ├── routes/
│   │   │   ├── auth.ts                       # Auth, sessions & registration visibility status
│   │   │   ├── admin.ts                      # User management, stats & system settings
│   │   │   └── jobs.ts                       # Scraper jobs, results & multi-format exports
│   │   ├── middlewares/
│   │   │   └── auth.ts                       # JWT Bearer token authentication
│   │   ├── db.ts                             # PostgreSQL pool with automatic SQLite fallback
│   │   ├── redis.ts                          # Redis client with local queue fallback
│   │   ├── queue.ts                          # BullMQ job dispatch queue
│   │   └── index.ts                          # Express server with CORS & honeypot root page
│   ├── Dockerfile
│   ├── package.json
│   ├── schema.sql                            # Relational database schema with unique constraints
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── globals.css                   # Global styling & glassmorphic utilities
│   │       ├── layout.tsx                    # Root layout with 7strokes branding & metadata
│   │       └── page.tsx                      # Single-page app: search, saved leads, admin & export
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml                        # Full container stack (PostgreSQL, Redis, API, Worker, UI)
└── README.md
```

---

### Deployment & Setup Guide

#### Method 1: Local Zero-Config Setup (Fastest)

7strokes includes automatic fallbacks to SQLite and in-memory execution, requiring only Node.js to get started.

**1. Clone and install dependencies:**
```bash
git clone https://github.com/Reinhart-py/DashMin.git
cd DashMin
```

**2. Start the Backend:**
```bash
cd backend
npm install
npm run build
npm start
```
*The server will start on port `4000`. If PostgreSQL and Redis are not running, it automatically uses `dashmin.sqlite` and the local queue.*

**3. Start the Frontend:**
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

#### Method 2: Docker Compose (Full Stack)

For production deployments with dedicated PostgreSQL and Redis instances:

```bash
docker compose up -d
```

- **Frontend Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`

---

#### Method 3: Cloudflare Workers/Pages + Public Tunnel

Deploy the frontend globally on Cloudflare for free while keeping the backend scrapers running locally on your workstation:

**1. Run your local Backend:**
```bash
cd backend
npm start
```

**2. Open a public tunnel to port 4000:**
- **Using ngrok:**
  ```bash
  ngrok http 4000
  ```
  *(Example URL: `https://your-tunnel.ngrok-free.dev`)*
- **Using Cloudflare Tunnel:**
  ```bash
  cloudflared tunnel --url http://localhost:4000
  ```

**3. Deploy the Frontend on Cloudflare Pages:**
1. Connect your GitHub repository to Cloudflare Pages.
2. Build settings:
   - **Framework preset**: `Next.js (Static HTML Export)`
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
3. Environment variables:
   - `NEXT_PUBLIC_API_URL`: Your public tunnel URL (e.g. `https://your-tunnel.ngrok-free.dev`)
4. Deploy! The frontend will automatically route requests through `apiFetch` with the required `ngrok-skip-browser-warning` headers.

---

### Method 4: 24/7 Production VPS Hosting (Ubuntu + PM2 + Nginx + SSL)

Deploy 7strokes on any virtual private server (DigitalOcean Droplet, Hetzner, AWS EC2, Linode, Vultr, OVH) running **Ubuntu 22.04 LTS or 24.04 LTS**.

#### 1. Server Prerequisites & Node.js 20 Setup
Log in via SSH and install system packages, Node.js v20, and PM2:
```bash
# Update server repositories
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential

# Install Node.js 20 LTS (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager globally
sudo npm install -g pm2
```

#### 2. Clone Repository & Install Dependencies
```bash
# Clone repository to /var/www
sudo mkdir -p /var/www/7strokes
sudo chown -R $USER:$USER /var/www/7strokes
git clone https://github.com/Reinhart-py/kiri-lead.git /var/www/7strokes/repo
cd /var/www/7strokes/repo/DashMin

# Install Backend dependencies
cd backend
npm install
npm run build

# Install Frontend dependencies
cd ../frontend
npm install
npm run build
```

#### 3. Configure Production Environment
Create `/var/www/7strokes/repo/DashMin/backend/.env`:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/dashmin
# (If PostgreSQL is omitted, 7strokes automatically uses SQLite: dashmin.sqlite)
JWT_SECRET=super-secure-production-jwt-token-string-7strokes
CORS_ORIGIN=https://yourdomain.com
PROXY_URL=
```

Create `/var/www/7strokes/repo/DashMin/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

#### 4. Launch Backend & Frontend with PM2
```bash
# Start backend
cd /var/www/7strokes/repo/DashMin/backend
pm2 start dist/index.js --name "7strokes-backend"

# Start Next.js frontend
cd /var/www/7strokes/repo/DashMin/frontend
pm2 start npm --name "7strokes-frontend" -- start -- -p 3000

# Save process list and enable system auto-restart on reboot
pm2 save
pm2 startup
```

#### 5. Configure Nginx Reverse Proxy
Create `/etc/nginx/sites-available/7strokes`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend routes
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API endpoints
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

Enable the Nginx virtual host:
```bash
sudo ln -s /etc/nginx/sites-available/7strokes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Issue Free Automatic SSL Certificate
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot will automatically install SSL certificates and configure HTTPS redirects. Your 7strokes lead generation system is now live 24/7!

---

### Usage & Features

#### Theme-Aware Experience
7strokes automatically adapts to light and dark modes with dedicated high-contrast logos:
- **Light Theme**: [7strokes Vibrant Green](https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png)
- **Dark Theme**: [7strokes High-Contrast Neon Dark](https://ik.imagekit.io/Reinhart/nox/logo7strokes-dark.png)

#### User Access & Admin Approval
- The **first account registered** automatically receives the `admin` role with immediate active status.
- Subsequent registrations are created in `pending` status until an administrator approves them from the **Admin > Users** tab.

#### Registration Visibility Controls
- Administrators can toggle **Allow Public Registration** from the System Settings tab.
- When toggled off, the registration tab and buttons are completely hidden from the authentication screen, preventing unauthorized registrations.

#### Starting a Google Maps Search
1. Select the **Google Maps** engine.
2. Enter your keyword and location (e.g., `Real Estate in Dubai`, Cap: `500`).
3. The engine partitions the target area into geographic grid cells and sweeps them concurrently, extracting verified business details directly from Google Maps payload signatures.

#### Starting a 2GIS Fast HTTP Search
1. Select the **2GIS Directory** engine.
2. Choose your target Country and City (with one-click pills for all 7 UAE Emirates: Abu Dhabi, Dubai, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain).
3. Select an industry category from the searchable category catalog.
4. The engine executes parallel catalog requests and retrieves full firm profile pages.

#### Saved Leads & Real-Time Monitoring
- Inspect all collected datasets in the **Saved Leads** tab.
- Active scrapers update in real-time every 2.5 seconds showing progress, total leads gathered, and operational status.
- Stop or delete jobs with a single click.

#### Fullscreen Zoom & Responsive Drawer
- **Zoom In**: Expands the lead table to full-viewport width with sticky headers, horizontal scrolling, and phone/email copy buttons. Press `Escape` or click "Exit Zoom" to return.
- **Glassmorphic Navigation Drawer**: Smooth semi-transparent sliding drawer that auto-closes upon navigation.

#### Custom Multi-Format Exports
Export any search dataset with custom column filtering to:
- **Excel (.xlsx)**: Formatted Microsoft Excel workbook.
- **CSV**: RFC-compliant comma-separated values.
- **JSON**: Structured JSON array.
- **HTML**: Standalone sanitized dark-mode HTML report with summary stats and clickable links.

#### Reverse-Engineering Honeypot
Anyone attempting to inspect or access the root URL of the backend (`GET /`) is greeted by a playful honeypot response card with [lolOnYou.jfif](https://ik.imagekit.io/Reinhart/nox/lolOnYou.jfif).

---

### What Can 7strokes Extract?

| Field | Description |
| :--- | :--- |
| `Business Name` | Official company name |
| `Category` | Primary business industry or rubric |
| `All Categories` | Complete list of secondary tags & classifications |
| `Phone 1` | Primary unmasked phone number |
| `Phone 2` | Secondary contact phone number |
| `Email` | Business email address |
| `Website` | Official website URL |
| `Address` | Complete formatted street, district, and city address |
| `City` | City or municipality |
| `State` | State or administrative province |
| `Country` | Country name |
| `Postal Code` | Postal / ZIP code |
| `Rating` | Customer star rating (e.g. 4.9) |
| `Reviews Count` | Total number of published reviews |
| `Price Level` | Price tier (`$`, `$$`, `$$$`, `$$$$`) |
| `Operational Status` | Status (Open, Closed, Temporarily Closed) |
| `Latitude` & `Longitude` | Exact geographic coordinates |
| `Plus Code` | Open Location Code / Plus Code |
| `Timezone` | Operational timezone |
| `Opening Hours` | Full weekly operating hours |
| `Social Links` | Instagram, Facebook, LinkedIn, Twitter/X, YouTube |
| `Place ID` | Unique Google Maps or 2GIS identifier |

---

### Configuration & Environment Variables

Create or update `backend/.env`:
```env
PORT=4000
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/dashmin
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secure-jwt-secret-key
CORS_ORIGIN=*
PROXY_URL=http://username:password@rotating.proxyprovider.com:8000
SERPAPI_API_KEY=your_optional_serpapi_key
```

Create or update `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```
*(Or your public tunnel URL when deployed on Cloudflare Pages)*

---

### Troubleshooting & FAQ

**Q: Why does Saved Leads say "No searches run yet" when accessing via ngrok?**  
A: Free ngrok tunnels return an HTML warning interstitial unless the `ngrok-skip-browser-warning: true` header is sent. 7strokes automatically includes this header in its `apiFetch` wrapper. Ensure your frontend is deployed with the latest code.

**Q: Can I run 7strokes without installing PostgreSQL or Redis?**  
A: Yes! 7strokes automatically detects when PostgreSQL or Redis are unavailable and switches to built-in SQLite (`dashmin.sqlite`) and an in-process execution queue without requiring any configuration.

**Q: How do I reset the admin password?**  
A: An administrator can reset any user's password directly from the **Admin > Users** tab, or using the built-in password reset link.

---

### Support & Developer Contact

For technical questions, VPS deployment support, custom proxies, or account recovery:

- **Lead Developer & Administrator**: Reinhart
- **Email**: [reinhart96x@gmail.com](mailto:reinhart96x@gmail.com)
- **WhatsApp**: [+1 (315) 370-1897](https://wa.me/13153701897?text=Hello%20Reinhart%2C%20I%20am%20using%20the%207strokes%20lead%20finder%20tool%20and%20need%20assistance)
- **Telegram**: [@reinhart96x](https://t.me/reinhart96x) / [@kiri0507](https://t.me/kiri0507)

---

### License & Contributions

Distributed under the MIT License. Contributions and feature suggestions are welcome via Pull Requests.
