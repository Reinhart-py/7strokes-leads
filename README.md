# 7strokes - B2B Lead Generation Tool

<p align="center">
  <img src="https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png" alt="7strokes Logo" width="220" />
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Built--in-003B57.svg)](https://www.sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supported-336791.svg)](https://www.postgresql.org/)

**7strokes** is a fast, easy-to-use B2B lead generation tool. It helps you search and collect local business data (names, phone numbers, emails, websites, addresses, ratings, and opening hours) from **Google Maps** and **2GIS** at scale.

It includes a modern web dashboard, team management, company isolation, multi-role access, and one-click data export to Excel, CSV, JSON, and HTML.

---

## Table of Contents

1. [What's New in this Version](#whats-new-in-this-version)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Key Features](#key-features)
4. [What Data Can 7strokes Extract?](#what-data-can-7strokes-extract)
5. [Quick Start (Fastest Local Setup)](#quick-start-fastest-local-setup)
6. [Production Deployment Guides](#production-deployment-guides)
   - [Method A: 24/7 VPS Deployment (Ubuntu + PM2 + Nginx + SSL)](#method-a-247-vps-deployment-ubuntu--pm2--nginx--ssl)
   - [Method B: Docker Compose](#method-b-docker-compose)
   - [Method C: Cloudflare Pages + Public Tunnel](#method-c-cloudflare-pages--public-tunnel)
7. [How to Use the Features](#how-to-use-the-features)
8. [Configuration & Environment Variables](#configuration--environment-variables)
9. [Dedicated Help & Support](#dedicated-help--support)
10. [Troubleshooting & FAQ](#troubleshooting--faq)

---

## What's New in this Version

- **3-Role Team System**: Complete support for `Admin`, `Manager` (Company Manager), and `User`.
- **Company & Manager Separation**: Managers can only view and manage their own company's team and search leads. Admins have complete visibility across all companies.
- **Dedicated Black & White Help Page (`/contact` & `/help`)**:
  - Clean, distraction-free monochrome design (pure black and white).
  - No popup modals; it has its own dedicated page.
  - Reason picker without emojis.
  - Direct one-click redirect to **WhatsApp**, **Telegram**, or **Email**.
- **Admin Registration Control**: Turn public registration completely on or off from the Admin Panel. When turned off, the registration button disappears completely from the login screen.
- **Live Server Status Alert**: A clear alert banner appears if the backend server stops or disconnects, telling the user to contact the administrator.
- **Theme-Aware Branding**: Automatically switches between clean light-mode logo and high-contrast neon dark-mode logo.
- **Safe Admin Honeypot**: Anyone attempting to inspect or reverse-engineer the root backend URL is shown a humorous honeypot page.

---

## User Roles & Permissions

7strokes is built for businesses with multiple companies, managers, and sales teams:

| Feature / Action | Admin | Manager (Company) | User (Team Member) |
| :--- | :---: | :---: | :---: |
| Run Google Maps & 2GIS Searches | Yes | Yes | Yes |
| View & Export Personal Saved Leads | Yes | Yes | Yes |
| View Leads Found by Their Team | Yes | Yes (Their team only) | No |
| View Leads From All Companies | Yes | No | No |
| View Company Stats & Manager Breakdown | Yes | No (Team stats only) | No |
| Create & Manage Team Accounts | Yes (Any user) | Yes (Their team only) | No |
| Reset Team Member Passwords | Yes (Any user) | Yes (Their team only) | No (Admin/Manager only) |
| Change Global System Settings | Yes | No | No |
| Toggle Public Registration On / Off | Yes | No | No |

### How Data Separation Works:
- **Admin**: Can see all companies, see how many managers each company has, filter leads by company or manager, and manage any user.
- **Manager**: Belongs to a specific company. A manager can **only** see and control users where `manager_id = manager.id`. They cannot see other companies or touch admin settings.
- **User**: Can search for leads, download data, and manage their personal profile.

---

## Key Features

- **Direct HTTP Scraping (No Heavy Browsers Required)**: Extracts thousands of business records using direct network requests instead of wasting CPU on heavy headless browsers.
- **Geographic Grid Sweep**: Bypasses the standard 120-result limit by splitting large cities into coordinate grids and searching each district.
- **Dual Scraping Engines**:
  - **Google Maps**: Extracts phone numbers, addresses, ratings, categories, website URLs, and business hours.
  - **2GIS Directory**: Fast catalog search with full coverage for GCC countries (United Arab Emirates, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, and more).
  - **7 UAE Emirates One-Click Selector**: Instant selection for Abu Dhabi, Dubai, Sharjah, Ajman, Ras Al Khaimah, Fujairah, and Umm Al Quwain.
- **Zero-Config Resilient Database**:
  - Automatically runs with built-in **SQLite** (`dashmin.sqlite`) if PostgreSQL is not set up.
  - Automatically runs an in-process queue if Redis is not set up.
  - Supports full **PostgreSQL** and **Redis** whenever configured.
- **Export Data in Any Format**: One-click download to **Excel (.xlsx)**, **CSV**, **JSON**, or formatted **HTML**.
- **Full View & Zoom Mode**: Table expands to full screen with copyable phone numbers, emails, and sticky headers.

---

## What Data Can 7strokes Extract?

| Field | Description |
| :--- | :--- |
| **Business Name** | Official registered company name |
| **Category** | Primary industry or trade category |
| **All Categories** | Secondary industry classifications and tags |
| **Phone 1 & Phone 2** | Direct business telephone and mobile numbers |
| **Email** | Public business email address |
| **Website** | Official company website URL |
| **Address** | Full street, building, district, and city address |
| **City, State, Country** | Geographic location details |
| **Rating & Reviews** | Average star rating and total count of customer reviews |
| **Opening Hours** | Operating hours throughout the week |
| **Social Links** | Instagram, Facebook, LinkedIn, Twitter/X, YouTube |
| **Place ID & Coordinates** | Latitude, Longitude, and unique place identifier |

---

## Quick Start (Fastest Local Setup)

You only need **Node.js 20+** installed on your computer.

### Step 1: Clone the Repository
```bash
git clone https://github.com/Reinhart-py/DashMin.git
cd DashMin
```

### Step 2: Start the Backend
Open a terminal:
```bash
cd backend
npm install
npm run build
npm start
```
*The backend server starts on `http://localhost:4000`. It will automatically use local SQLite (`dashmin.sqlite`).*

### Step 3: Start the Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
*Open `http://localhost:3000` in your web browser.*

> **First Login**: The first user to register automatically becomes the **Admin**.

---

## Production Deployment Guides

### Method A: 24/7 VPS Deployment (Ubuntu + PM2 + Nginx + SSL)

Use this guide to run 7strokes 24/7 on any cloud server (DigitalOcean, AWS, Hetzner, Vultr, Linode, OVH).

#### 1. Prepare your server
Log into your Ubuntu server via SSH:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 process manager
sudo npm install -g pm2
```

#### 2. Download and build 7strokes
```bash
sudo mkdir -p /var/www/7strokes
sudo chown -R $USER:$USER /var/www/7strokes
git clone https://github.com/Reinhart-py/DashMin.git /var/www/7strokes/repo
cd /var/www/7strokes/repo

# Build backend
cd backend
npm install
npm run build

# Build frontend
cd ../frontend
npm install
npm run build
```

#### 3. Set up environment files
Create `/var/www/7strokes/repo/backend/.env`:
```env
PORT=4000
JWT_SECRET=use-a-strong-secret-key-here-12345
CORS_ORIGIN=https://yourdomain.com
```

Create `/var/www/7strokes/repo/frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

#### 4. Start both apps with PM2
```bash
# Start backend
cd /var/www/7strokes/repo/backend
pm2 start dist/index.js --name "7strokes-backend"

# Start frontend
cd /var/www/7strokes/repo/frontend
pm2 start npm --name "7strokes-frontend" -- start -- -p 3000

# Make PM2 restart automatically when server reboots
pm2 save
pm2 startup
```

#### 5. Configure Nginx
Create `/etc/nginx/sites-available/7strokes`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/7strokes /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Add Free HTTPS / SSL
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Your 7strokes platform is now live and secure with automatic HTTPS!

---

### Method B: Docker Compose

If you have Docker installed:
```bash
docker compose up -d
```
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`

---

### Method C: Cloudflare Pages + Public Tunnel

You can host the frontend on Cloudflare Pages for free while keeping the scrapers running on your computer:
1. Start the local backend: `cd backend && npm start`
2. Start a tunnel (Cloudflare Tunnel or ngrok):
   ```bash
   cloudflared tunnel --url http://localhost:4000
   ```
3. Deploy the frontend repository to Cloudflare Pages:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `out`
   - Environment variable: `NEXT_PUBLIC_API_URL` set to your tunnel URL.

---

## How to Use the Features

### 1. Running a Google Maps Search
1. Open the **Search** tab.
2. Select **Google Maps**.
3. Type your search terms, for example: `Real Estate in Dubai` or `Dental Clinic in Abu Dhabi`.
4. Set your target lead count (e.g., `200` or `1000`).
5. Click **Start Extraction**. Watch the live progress counter as leads are gathered.

### 2. Running a 2GIS Directory Search
1. Select the **2GIS Directory** engine.
2. Choose your country and city (e.g., `United Arab Emirates` -> `Dubai`).
3. Select an industry category from the category list.
4. Click **Start Extraction**.

### 3. Viewing and Exporting Leads
1. Go to the **Saved Leads** tab.
2. Click on any completed search to view its table.
3. Click **Zoom** to expand the table to full screen.
4. Click **Export** and choose your preferred format: **Excel (.xlsx)**, **CSV**, **JSON**, or **HTML Report**.

### 4. Admin Management (Admin Only)
- **Companies & Managers**: View the breakdown of each company and how many managers and users it has.
- **User Management**: Create new accounts, assign roles (`admin`, `manager`, or `user`), assign company name, assign manager, and reset passwords.
- **Registration Control**: In the **Settings** tab, toggle "Allow Public Registration".

### 5. Manager Management (Manager Only)
- Switch to the **Company** tab in the sidebar.
- View users assigned to you and create new team members under your company.
- Reset passwords for your team members if they forget their credentials.
- Inspect search jobs and leads collected by your team members.

---

## Configuration & Environment Variables

### Backend (`backend/.env`):
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | API server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string | Uses SQLite if empty |
| `REDIS_URL` | Redis URL for BullMQ | Uses local queue if empty |
| `JWT_SECRET` | Secret key for login tokens | Required in production |
| `CORS_ORIGIN` | Allowed web origins | `*` |
| `PROXY_URL` | Optional rotating proxy URL | None |

### Frontend (`frontend/.env.local`):
| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend URL for API calls | `http://localhost:4000` |

---

## Dedicated Help & Support

If users have questions, need password assistance, or want to report an issue, they can visit the dedicated **Help & Contact page** (`/contact` or `/help`):

- **Pure Black & White**: Clean, distraction-free monochrome design.
- **Select Topic**: Choose the exact reason for inquiry (Password Reset, New Account, Proxy Setup, Performance, Team Inquiry).
- **Direct App Redirection**: Automatically opens the selected communication channel with a pre-written message:
  - **WhatsApp**: [+1 315-370-1897](https://wa.me/13153701897)
  - **Telegram**: [@kiri0507](https://t.me/kiri0507)
  - **Email**: [reinhart96x@gmail.com](mailto:reinhart96x@gmail.com)

---

## Troubleshooting & FAQ

**Q: Can I run 7strokes without installing PostgreSQL or Redis?**  
A: Yes! 7strokes automatically detects when PostgreSQL or Redis are not running and switches to built-in SQLite (`dashmin.sqlite`) and an internal in-process queue.

**Q: Can a regular user reset their password?**  
A: Regular users cannot reset passwords on their own. They must contact their Company Manager or the Super Admin, or use the dedicated Help page.

**Q: Can a Manager see data from other companies?**  
A: No. Managers are strictly isolated to their own company name and only have access to users directly assigned to them (`manager_id`).

**Q: What happens if the backend server goes down?**  
A: The frontend immediately displays an alert banner warning that the server is disconnected and provides a direct link to the Help page.

---

## License

This project is licensed under the [MIT License](LICENSE).
