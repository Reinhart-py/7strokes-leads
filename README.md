# 7strokes — Fast B2B Lead Generation Engine

<p align="center">
  <img src="https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png" alt="7strokes Logo" width="220" />
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Built--in-003B57.svg)](https://www.sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supported-336791.svg)](https://www.postgresql.org/)

**7strokes** is a high-speed B2B lead generation platform designed to collect local business records (business names, verified phone numbers, emails, websites, addresses, customer ratings, and operating hours) from **Google Maps** and **2GIS** at scale.

Works seamlessly on **Windows, macOS, Linux, and Android (Termux)**. It features a modern web dashboard, a universal CLI runner (`fk`), an interactive Telegram bot (`fk bot`), multi-tenant team and company isolation, and instant data export to Excel, CSV, JSON, and HTML.

> 📜 **Looking for development history and release notes?** See the full [CHANGELOG.md](CHANGELOG.md).

---

## Table of Contents

1. [Key Features](#key-features)
2. [What Data Can 7strokes Extract?](#what-data-can-7strokes-extract)
3. [Universal CLI Runner (`fk`)](#universal-cli-runner-fk)
4. [Android / Termux Setup (Zero Root)](#android--termux-setup-zero-root)
5. [Telegram Bot Integration (`fk bot`)](#telegram-bot-integration-fk-bot)
6. [Database Management in CLI](#database-management-in-cli)
7. [User Roles & Company Isolation](#user-roles--company-isolation)
8. [Quick Start (Local Desktop Run)](#quick-start-local-desktop-run)
9. [Production VPS Deployment (Ubuntu + PM2 + Nginx + SSL)](#production-vps-deployment-ubuntu--pm2--nginx--ssl)
10. [Dedicated Help & Support](#dedicated-help--support)

---

## Key Features

- **Direct HTTP Scraping**: High-concurrency network requests extract thousands of business records without the CPU overhead of heavy headless browsers.
- **Geographic Grid Sweep**: Bypasses search result limits by dividing target areas into coordinate grids and searching every district.
- **Dual Scraping Engines**:
  - **Google Maps**: Extracts phone numbers, addresses, ratings, categories, website URLs, and weekly business hours.
  - **2GIS Directory**: Fast catalog search with full coverage for GCC countries (United Arab Emirates, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman). Includes one-click selection for all 7 UAE Emirates.
- **Zero-Config Resilient Fallbacks**:
  - Automatically runs with built-in SQLite (`dashmin.sqlite`) when PostgreSQL is not configured.
  - Automatically runs an internal in-process queue when Redis is not configured.
- **Global PowerShell & Bash CLI (`fk`)**: Start servers, tunnels, and bots with a single universal command from any folder.
- **Full Android / Termux Support**: Built-in native Node.js DNS bridge solves Go resolver errors without requiring root or PRoot.
- **Multi-Format Export**: One-click download to formatted Excel (`.xlsx`), standard CSV, structured JSON, or standalone dark-mode HTML reports.

---

## What Data Can 7strokes Extract?

| Field | Description |
| :--- | :--- |
| **Business Name** | Official registered company name |
| **Category** | Primary industry or business classification |
| **All Categories** | Full list of secondary tags and categories |
| **Phone 1 & Phone 2** | Primary and secondary business contact numbers |
| **Email** | Public business email address |
| **Website** | Official business website URL |
| **Address** | Formatted street, building, district, and city address |
| **City, State, Country** | Geographic location details |
| **Rating & Reviews** | Average customer star rating and total review count |
| **Opening Hours** | Weekly operating schedule |
| **Social Links** | Instagram, Facebook, LinkedIn, Twitter/X, YouTube |
| **Place ID & Coordinates** | Latitude, Longitude, and unique place identifier |

---

## Universal CLI Runner (`fk`)

7strokes includes a universal command-line controller named `fk`:

```powershell
# Start backend server and public tunnel together
fk start

# Launch the interactive Telegram Bot
fk bot

# View live database stats (leads count, companies, recent searches)
fk db view

# Create an instant timestamped backup of the database
fk db backup

# Restore the database from a backup
fk db restore backups/<backup_file>.sqlite

# Reconfigure your Ngrok token, custom domain, or Telegram credentials
fk config

# View all available CLI options
fk help
```

*(You can run `fk` from any folder in PowerShell, Command Prompt, or Linux/Termux terminal).*

---

## Android / Termux Setup (Zero Root)

Run 7strokes on an Android phone using **Termux** with zero root access.

### Why standard tunnels fail on Android:
Ngrok (written in Go) looks for `/etc/resolv.conf` to resolve domain names. Android does not have this file, causing Ngrok to fail with `connection refused on [::1]:53`.

### How 7strokes fixes it:
7strokes includes a native Node.js DNS bridge on `127.0.0.1:8888`. Because Node.js is compiled against Android's native C-library (Bionic libc), it resolves DNS using Android's system resolver. Ngrok routes through this bridge and connects immediately.

### Termux Commands:

```bash
# 1. Install prerequisites in Termux
pkg update -y
pkg install -y nodejs-lts git

# 2. Clone the repository
git clone https://github.com/Reinhart-py/DashMin.git 7strokes
cd 7strokes

# 3. Install dependencies
cd backend && npm install && npm run build
cd ../frontend && npm install
cd ..

# 4. Start 7strokes with public tunnel
./fk start
```

---

## Telegram Bot Integration (`fk bot`)

The Telegram Bot allows you to control 7strokes, trigger searches, monitor server health, and receive leads directly in your Telegram chats.

### Setup:
Run:
```powershell
fk bot
```
It will ask for:
1. **Telegram Bot Token**: Created via [@BotFather](https://t.me/BotFather).
2. **Allowed Chat IDs**: Comma-separated list of Telegram user IDs (from [@userinfobot](https://t.me/userinfobot)). Only authorized IDs can control the bot.

### Bot Commands:

- `/status` — Live server metrics, RAM, uptime, platform (Android / Desktop), and total leads collected.
- `/tunnel` — Returns the current live public tunnel URL to open the Web UI from your phone.
- `/db` — Summary of leads, jobs, users, and companies in the database.
- `/search <engine> <target> [limit]` — Start a lead generation job directly from chat.
  - *Example:* `/search gmaps Real Estate Dubai 100`
  - *Example:* `/search 2gis Dental Clinic Abu Dhabi 50`
- `/jobs` — View recent scraping jobs and their progress.
- `/export <job_id>` — Generates a `.csv` file and sends the document directly into your Telegram chat.
- `/help` — Display command guide.

---

## Database Management in CLI

### 1. View Database Stats (`fk db view`)
```powershell
fk db view
```
- **On Android / Termux** (or narrow screen): Renders a compact vertical card layout without wrapping or messy tables.
- **On Desktop**: Renders structured tables of companies, manager breakdowns, recent searches, and team accounts.

### 2. Backup Database (`fk db backup`)
```powershell
fk db backup
```
Creates a timestamped snapshot of `dashmin.sqlite` in the `backups/` directory (e.g. `backups/7strokes-backup-2026-10-07T05-02-03.sqlite`).

### 3. Restore Database (`fk db restore <file>`)
```powershell
fk db restore backups/<backup_file>.sqlite
```
Restores the database safely with an automatic rollback backup before overwriting.

---

## User Roles & Company Isolation

7strokes supports multi-tenant teams with company and manager data isolation:

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
- **User**: Standard sales user who runs searches, views personal leads, and exports data.

---

## Quick Start (Local Desktop Run)

### 1. Start with the CLI runner:
```powershell
fk start
```
*The backend server starts on port `4000` with local SQLite (`dashmin.sqlite`).*

### 2. Start the Frontend (separate terminal):
```powershell
cd frontend
npm run dev
```
*Open `http://localhost:3000` in your browser.*

---

## Production VPS Deployment (Ubuntu + PM2 + Nginx + SSL)

To run 7strokes 24/7 on an Ubuntu server:

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
