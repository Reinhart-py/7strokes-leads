# 7strokes

<p align="center">
  <img src="https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png" alt="7strokes Logo" width="220" />
</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6.svg)](https://www.typescriptlang.org/)
[![SQLite](https://img.shields.io/badge/SQLite-Built--in-003B57.svg)](https://www.sqlite.org/)

7strokes lets you easily search and collect local business leads, phone numbers, emails, websites, addresses, and customer reviews from Google Maps and 2GIS at scale.

It works on Windows, Linux, macOS, and Android phones (Termux). You can control it from a web browser, a command-line tool (`fk`), or an interactive Telegram bot (`fk bot`).

# Contents

- [Why?](#why)
- [Installation](#installation)
  - [Method 1: Global PowerShell Setup on Windows (Recommended)](#method-1-global-powershell-setup-on-windows-recommended)
  - [Method 2: Android / Termux Setup (No Root Needed)](#method-2-android--termux-setup-no-root-needed)
  - [Method 3: Direct Clone on Linux or Mac](#method-3-direct-clone-on-linux-or-mac)
- [PowerShell First-Time Setup Note](#powershell-first-time-setup-note)
- [Dependencies](#dependencies)
- [Usage](#usage)
  - [Interactive Menu Mode (Easiest for Beginners)](#interactive-menu-mode-easiest-for-beginners)
  - [Direct Command Mode](#direct-command-mode)
- [CLI Options](#cli-options)
- [What Can 7strokes Extract?](#what-can-7strokes-extract)
- [Telegram Bot (fk bot)](#telegram-bot-fk-bot)
- [User Roles and Company Isolation](#user-roles-and-company-isolation)
- [Database Management](#database-management)
- [Production 24/7 VPS Hosting](#production-247-vps-hosting)
- [Support and Contact](#support-and-contact)
- [Changelog](#changelog)
- [License](#license)

### Why?

Most lead generation tools are complicated to set up, require heavy browser software that slows down your computer, or lock you into expensive monthly fees.

7strokes solves this:

- **No heavy browser required**: Uses direct high-speed HTTP network requests instead of running slow browser windows on every query.
- **Bypasses the 120-result limit**: Automatically splits large cities into coordinate grids to search district by district, extracting thousands of leads per search.
- **Dual search sources**: Google Maps and 2GIS Directory (covering Dubai, Abu Dhabi, and all GCC countries).
- **Zero-setup database**: Runs immediately with built-in SQLite (`dashmin.sqlite`). You do not need to install or configure PostgreSQL or Redis to get started.
- **Runs on your phone**: Works inside Termux on Android without needing root permissions.
- **Telegram bot control**: Trigger searches and receive CSV lead spreadsheets right in your Telegram chat.
- **One-click data export**: Download results to Excel (.xlsx), CSV, JSON, or clean HTML reports.

### Installation

---

#### Method 1: Global PowerShell Setup on Windows (Recommended)

This lets you type `fk` or `fk start` from any folder in PowerShell or Command Prompt.

1. Open PowerShell and clone the repository:
   ```powershell
   git clone https://github.com/Reinhart-py/DashMin.git 7strokes
   cd 7strokes
   ```

2. Install backend and frontend dependencies:
   ```powershell
   cd backend
   npm install
   npm run build

   cd ../frontend
   npm install

   cd ..
   ```

3. Link the `fk` command globally:
   ```powershell
   npm link
   ```

You can now type `fk` from any folder on your computer.

---

#### Method 2: Android / Termux Setup (No Root Needed)

You can run 7strokes directly on an Android phone using the Termux app:

1. Open Termux and install Node.js and Git:
   ```bash
   pkg update -y
   pkg install -y nodejs-lts git
   ```

2. Download 7strokes:
   ```bash
   git clone https://github.com/Reinhart-py/DashMin.git 7strokes
   cd 7strokes
   ```

3. Install packages:
   ```bash
   cd backend && npm install && npm run build
   cd ../frontend && npm install
   cd ..
   ```

4. Start 7strokes:
   ```bash
   ./fk start
   ```

On Android, 7strokes automatically runs a built-in Node.js DNS bridge on port 8888. This bypasses Android's missing `/etc/resolv.conf` file, allowing Ngrok tunnels to connect without errors.

---

#### Method 3: Direct Clone on Linux or Mac

```bash
git clone https://github.com/Reinhart-py/DashMin.git 7strokes
cd 7strokes
cd backend && npm install && npm run build
cd ../frontend && npm install
cd ..
./fk start
```

### PowerShell First-Time Setup Note

---

If Windows PowerShell displays an error like:
`File cannot be loaded because running scripts is disabled on this system`

This is a default Windows security setting. You can enable scripts for your user account by running this single command in PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Press `Y` to confirm. After that, `fk` and all PowerShell commands will run without restriction.

### Dependencies

---

- **Node.js**: Version 20 or newer ([Download Node.js](https://nodejs.org/))
- **Git**: For cloning the repository ([Download Git](https://git-scm.com/))

If you do not have PostgreSQL or Redis installed, 7strokes automatically uses its built-in SQLite database and internal queue.

### Usage

---

#### Interactive Menu Mode (Easiest for Beginners)

If you do not want to remember commands, simply type `fk` in your terminal:

```powershell
fk
```

An interactive control panel will open:

```text
======================================================
             7STROKES CONTROL PANEL               
======================================================
 [1] Start Engine (Backend + Public Tunnel)
 [2] Start Telegram Bot
 [3] View Database Stats
 [4] Create Database Backup
 [5] Restore Database From Backup
 [6] Configure Settings (Tokens, Domains, Bot)
 [7] Start Android DNS Bridge (Port 8888)
 [0] Exit
======================================================
Select an option [0-7]: 
```

Type a number from `0` to `7` and press Enter.

---

#### Direct Command Mode

You can also run any action directly by adding arguments to `fk`:

```powershell
# Start the backend server and public tunnel together
fk start

# Launch the interactive Telegram bot
fk bot

# View database metrics (auto-detects mobile or desktop screen)
fk db view

# Make a backup of the SQLite database
fk db backup

# Restore a database from a backup file
fk db restore backups/7strokes-backup-2026-10-07.sqlite

# Reconfigure your Ngrok token, custom domain, or Telegram bot credentials
fk config
```

### CLI Options

---

```text
Usage: fk [command] [options]

Commands:
  (no args)           Open the interactive numbered control menu
  start               Start backend server and public tunnel (Ngrok / Cloudflare)
  bot                 Start or configure the interactive Telegram bot
  db view             Display database overview (Mobile and Desktop table views)
  db backup           Create timestamped database backup in backups/
  db restore <file>   Restore database from a chosen backup file
  bridge              Start standalone Node.js DNS bridge for Android Termux
  config              Run interactive setup wizard for tokens, domains, and chat IDs
  help                Show command help manual
```

### What Can 7strokes Extract?

---

| Field | Description |
| :--- | :--- |
| **Business Name** | Official business or company name |
| **Category** | Primary industry classification |
| **All Categories** | Secondary tags and industry classifications |
| **Phone 1 & Phone 2** | Direct business telephone and mobile numbers |
| **Email** | Public business email address |
| **Website** | Official website link |
| **Address** | Street, building, and district address |
| **City, State, Country** | Geographic location details |
| **Rating & Reviews** | Average star rating and total review count |
| **Opening Hours** | Operating schedule across the week |
| **Social Links** | Instagram, Facebook, LinkedIn, Twitter/X, YouTube |
| **Place ID & Coordinates** | Latitude, Longitude, and unique place identifier |

### Telegram Bot (fk bot)

---

You can control 7strokes directly from your Telegram app.

#### First-Time Setup:
Run:
```powershell
fk bot
```

The setup wizard will ask you for:
1. **Bot Token**: Get a free token from [@BotFather](https://t.me/BotFather) on Telegram.
2. **Allowed Chat IDs**: Your Telegram account ID from [@userinfobot](https://t.me/userinfobot). Multiple IDs can be added separated by commas.

#### Telegram Commands:
- `/status` — Live server stats, memory, uptime, and total leads in database.
- `/tunnel` — Returns the current live web link so you can open the dashboard on your phone.
- `/db` — Summary of leads, jobs, users, and companies in the database.
- `/search <engine> <target> [limit]` — Start a search from chat.
  - Example: `/search gmaps Real Estate Dubai 100`
  - Example: `/search 2gis Dental Clinic Abu Dhabi 50`
- `/jobs` — List recent scraping jobs and their progress.
- `/export <job_id>` — Creates a CSV file and sends it directly into your Telegram chat.
- `/help` — Show command guide.

### User Roles and Company Isolation

---

7strokes includes team management with data isolation:

| Feature | Admin | Manager (Company) | User (Team Member) |
| :--- | :---: | :---: | :---: |
| Run Google Maps and 2GIS Searches | Yes | Yes | Yes |
| View and Export Personal Leads | Yes | Yes | Yes |
| View Leads From Their Team | Yes | Yes (Their team only) | No |
| View Leads From All Companies | Yes | No | No |
| Company and Manager Overview | Yes | No (Team stats only) | No |
| Create Team Member Accounts | Yes | Yes (Their team only) | No |
| Reset Team Member Passwords | Yes | Yes (Their team only) | No |
| Global System Settings | Yes | No | No |

- **Admin**: Full control over all companies, managers, users, and system settings.
- **Manager**: Scoped strictly to their own company name. Can only see and manage users assigned under them.
- **User**: Standard user who searches and downloads leads.

### Database Management

---

#### 1. View Database Stats (`fk db view`)
```powershell
fk db view
```
- **On Android / Termux**: Outputs a clean vertical list designed for mobile screens that will not wrap or break.
- **On Desktop**: Outputs wide tables with company breakdowns, manager counts, and recent searches.

#### 2. Backup Database (`fk db backup`)
```powershell
fk db backup
```
Saves a snapshot of your database in the `backups/` directory.

#### 3. Restore Database (`fk db restore <file>`)
```powershell
fk db restore backups/7strokes-backup-2026-10-07.sqlite
```
Safely restores your database with an automatic rollback backup.

### Production 24/7 VPS Hosting

---

To run 7strokes on an Ubuntu cloud server (DigitalOcean, AWS, Hetzner, Linode, Vultr):

```bash
# 1. Install system tools
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

### Support and Contact

---

If you have questions, need assistance, or want to report an issue, visit the dedicated contact page (`/contact` or `/help`):

- **WhatsApp**: [+1 315-370-1897](https://wa.me/13153701897)
- **Telegram**: [@kiri0507](https://t.me/kiri0507)
- **Email**: [reinhart96x@gmail.com](mailto:reinhart96x@gmail.com)

### Changelog

---

Detailed version history, feature additions, and architectural upgrades are documented in [CHANGELOG.md](CHANGELOG.md).

### License

---

This project is licensed under the [MIT License](LICENSE).
