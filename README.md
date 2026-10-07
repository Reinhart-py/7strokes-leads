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

**7strokes** is a fast B2B lead generation tool. It collects local business data (names, phone numbers, emails, websites, addresses, ratings, and opening hours) from **Google Maps** and **2GIS** at scale.

Works on **Windows, macOS, Linux, and Android (Termux)** without root. Includes a modern web dashboard, one-command CLI runner (`fk`), interactive Telegram bot (`fk bot`), multi-tenant team management, and one-click data export to Excel, CSV, JSON, and HTML.

---

## Table of Contents

1. [What's New in this Version](#whats-new-in-this-version)
2. [Universal CLI Runner (`fk`)](#universal-cli-runner-fk)
3. [Android / Termux Setup Guide (No Root Needed)](#android--termux-setup-guide-no-root-needed)
4. [Telegram Bot Integration (`fk bot`)](#telegram-bot-integration-fk-bot)
5. [Database Management in CLI (Mobile & Desktop)](#database-management-in-cli-mobile--desktop)
6. [User Roles & Permissions](#user-roles--permissions)
7. [What Data Can 7strokes Extract?](#what-data-can-7strokes-extract)
8. [Quick Start (Local Desktop Run)](#quick-start-local-desktop-run)
9. [Production VPS Deployment (Ubuntu + PM2 + Nginx + SSL)](#production-vps-deployment-ubuntu--pm2--nginx--ssl)
10. [Dedicated Help & Support](#dedicated-help--support)

---

## What's New in this Version

- **One-Command CLI Runner (`fk`)**: Starts both the backend server and public tunnel (Ngrok / Cloudflare) together with automatic URL detection.
- **Android / Termux Support (Zero Root)**: Built-in native Node.js DNS bridge bypasses Android's missing `/etc/resolv.conf` so tunnels like Ngrok connect instantly without errors.
- **Interactive Telegram Bot (`fk bot`)**: Control 7strokes directly from Telegram. Start searches, check live server metrics, grab your tunnel link, and export CSV lead files directly into chat.
- **Responsive Database CLI**: Run `fk db view` to inspect your database. Automatically formats cleanly on mobile / Termux screens and wide tables on desktop.
- **Database Backup & Restore**: One-command backup (`fk db backup`) and restore (`fk db restore <file>`).
- **3-Role Team System**: Complete RBAC with `Admin`, `Manager` (Company Manager), and `User`.
- **Company Isolation**: Managers only see and manage their own team members and search leads. Admins oversee all companies.
- **Monochrome Support Page (`/contact` & `/help`)**: Dedicated black-and-white page with direct redirection to WhatsApp, Telegram (@kiri0507), and Email.

---

## Universal CLI Runner (`fk`)

7strokes includes a built-in CLI manager named `fk` (`fk.js`):

```bash
# Start backend + public tunnel together (first run will prompt for tokens)
node fk.js start

# Or using the convenient shortcuts:
./fk start          # On Linux, macOS, and Android (Termux)
fk start            # On Windows (via fk.bat)
```

### Available CLI Commands:

| Command | Action |
| :--- | :--- |
| `fk start` | Starts backend server and public tunnel (Ngrok / Cloudflare) |
| `fk bot` | Launches the interactive Telegram Bot |
| `fk db view` | Displays database stats (clean mobile view on Termux, table on PC) |
| `fk db backup` | Creates timestamped database backup in `backups/` folder |
| `fk db restore <file>` | Restores the database from a backup file |
| `fk bridge` | Starts standalone Node.js DNS Bridge on `127.0.0.1:8888` |
| `fk config` | Re-run interactive setup for tokens, domains, and chat IDs |
| `fk help` | Shows the quick command manual |

---

## Android / Termux Setup Guide (No Root Needed)

You can run 7strokes directly on your Android phone using **Termux** with zero root access and without heavy proot installations.

### Why Ngrok usually fails on Android:
Ngrok is written in Go and expects `/etc/resolv.conf` to resolve domain names. Android does not have this file, which causes Ngrok to fail with `connection refused on [::1]:53`.

### How 7strokes fixes it:
7strokes automatically starts a lightweight, native Node.js DNS bridge on `127.0.0.1:8888`. Because Node.js is compiled with Android's native C-library (Bionic libc), it resolves DNS using Android's system resolver. Ngrok routes its connection through this bridge and connects immediately.

### Step-by-Step Termux Setup:

**1. Install Termux & Packages:**
Open Termux on Android and run:
```bash
pkg update -y
pkg install -y nodejs-lts git
```

**2. Clone the repository:**
```bash
git clone https://github.com/Reinhart-py/DashMin.git 7strokes
cd 7strokes
```

**3. Install dependencies:**
```bash
cd backend && npm install && npm run build
cd ../frontend && npm install
cd ..
```

**4. Start 7strokes with Ngrok on Android:**
```bash
./fk start
```
*On first run, it will ask for your Ngrok authtoken and optional domain. 7strokes detects Android, starts the DNS bridge, connects Ngrok, and gives you a live public link to open on your phone or computer.*

---

## Telegram Bot Integration (`fk bot`)

The Telegram Bot allows you to control 7strokes, start searches, check server health, and receive leads directly in your Telegram chats.

### Setup (First-Time Run):
Run:
```bash
node fk.js bot
```
It will ask you for:
1. **Telegram Bot Token**: Get one in 1 minute from [@BotFather](https://t.me/BotFather) on Telegram.
2. **Allowed Chat IDs**: Comma-separated chat IDs (get your ID from [@userinfobot](https://t.me/userinfobot)). Only authorized IDs can control the bot.

### Bot Commands:

- `/status` — Live server metrics, RAM/CPU, uptime, platform (Android / Desktop), and total lead count.
- `/tunnel` — Shows the current live public Web UI link so you can tap and open it from anywhere.
- `/db` — Summary of leads, jobs, users, and companies in the database.
- `/search <engine> <query> <location> [limit]` — Starts a lead generation search directly from chat.
  - Example: `/search gmaps Real Estate Dubai 100`
  - Example: `/search 2gis Dental Clinic Abu Dhabi 50`
  - *The bot updates you when the job finishes.*
- `/jobs` — View recent scraping jobs and their progress.
- `/export <job_id>` — Generates a `.csv` file and sends the document directly into your Telegram chat.
- `/help` — Display command guide.

---

## Database Management in CLI (Mobile & Desktop)

### 1. View Database Stats (`fk db view`)
```bash
node fk.js db view
```
- **On Android / Termux** (or narrow screen): Renders a clean vertical mobile card layout that won't wrap or get garbled on small screens.
- **On Desktop**: Renders structured tables of companies, manager breakdowns, recent searches, and team accounts.

### 2. Backup Database (`fk db backup`)
```bash
node fk.js db backup
```
Creates a timestamped snapshot of `dashmin.sqlite` in the `backups/` directory (e.g. `backups/7strokes-backup-2026-10-07T05-02-03.sqlite`).

### 3. Restore Database (`fk db restore <file>`)
```bash
node fk.js db restore backups/7strokes-backup-2026-10-07T05-02-03.sqlite
```
Restores the database safely with an automatic rollback backup before overwriting.

---

## User Roles & Permissions

| Feature / Action | Admin | Manager (Company) | User (Team Member) |
| :--- | :---: | :---: | :---: |
| Run Google Maps & 2GIS Searches | Yes | Yes | Yes |
| View & Export Personal Saved Leads | Yes | Yes | Yes |
| View Leads Found by Their Team | Yes | Yes (Their team only) | No |
| View Leads From All Companies | Yes | No | No |
| View Company Stats & Manager Breakdown | Yes | No (Team stats only) | No |
| Create & Manage Team Accounts | Yes (Any user) | Yes (Their team only) | No |
| Reset Team Member Passwords | Yes (Any user) | Yes (Their team only) | No |
| Change Global System Settings | Yes | No | No |
| Toggle Public Registration On / Off | Yes | No | No |

- **Admin**: Full oversight across all companies, managers, users, leads, and global settings.
- **Manager**: Bound to their assigned company. A manager only sees and manages users where `manager_id = manager.id`.
- **User**: Standard user who searches, views personal leads, and downloads exports.

---

## What Data Can 7strokes Extract?

| Field | Description |
| :--- | :--- |
| **Business Name** | Official registered company name |
| **Category** | Primary industry or trade category |
| **All Categories** | Secondary tags and classifications |
| **Phone 1 & Phone 2** | Direct telephone and mobile numbers |
| **Email** | Public business email address |
| **Website** | Official company website URL |
| **Address** | Street, building, district, and city address |
| **City, State, Country** | Geographic location details |
| **Rating & Reviews** | Average star rating and review count |
| **Opening Hours** | Operating hours throughout the week |
| **Social Links** | Instagram, Facebook, LinkedIn, Twitter/X, YouTube |
| **Place ID & Coordinates** | Latitude, Longitude, and place ID |

---

## Quick Start (Local Desktop Run)

### 1. Start with the CLI runner:
```bash
node fk.js start
```
*The backend server starts on port `4000` with local SQLite (`dashmin.sqlite`).*

### 2. Start the Frontend (separate terminal):
```bash
cd frontend
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## Production VPS Deployment (Ubuntu + PM2 + Nginx + SSL)

To run 7strokes 24/7 on Ubuntu:

```bash
# 1. Install prerequisites
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx certbot python3-certbot-nginx build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Clone and build
git clone https://github.com/Reinhart-py/DashMin.git /var/www/7strokes
cd /var/www/7strokes/backend && npm install && npm run build
cd /var/www/7strokes/frontend && npm install && npm run build

# 3. Start with PM2
cd /var/www/7strokes/backend
pm2 start dist/index.js --name "7strokes-backend"

cd /var/www/7strokes/frontend
pm2 start npm --name "7strokes-frontend" -- start -- -p 3000

pm2 save
pm2 startup
```

---

## Dedicated Help & Support

Visit the dedicated **Help & Contact page** (`/contact` or `/help`):

- **Monochrome & Clean**: Pure black and white, zero emojis.
- **Select Topic**: Password Reset, New Account, Proxy Setup, Performance, Team Inquiry.
- **Direct Redirection**:
  - **WhatsApp**: [+1 315-370-1897](https://wa.me/13153701897)
  - **Telegram**: [@kiri0507](https://t.me/kiri0507)
  - **Email**: [reinhart96x@gmail.com](mailto:reinhart96x@gmail.com)

---

## License

This project is licensed under the [MIT License](LICENSE).
