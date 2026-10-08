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

It works on Windows, Linux, macOS, and Android phones (Termux). You can control it from a web browser, a command-line tool (`kiki`), or an interactive Telegram bot (`kiki bot`).

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
- [Phone Classification and Address Separation](#phone-classification-and-address-separation)
- [Telegram Bot (kiki bot)](#telegram-bot-kiki-bot)
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
- **Smart phone separation**: Automatically detects and separates Primary Numbers (mobile / personal) from Secondary Numbers (landline / office / alt).
- **Clean address columns**: Splits addresses into separate columns for Street, City, State, Country, and Postal Code in all CSV, Excel, and JSON exports.
- **Dual search sources**: Google Maps and 2GIS Directory (covering Dubai, Abu Dhabi, and all GCC countries).
- **Zero-setup database**: Runs immediately with built-in SQLite (`dashmin.sqlite`). You do not need to install or configure PostgreSQL or Redis to get started.
- **Runs on your phone**: Works inside Termux on Android without needing root permissions.
- **Telegram bot control**: Trigger searches and receive CSV lead spreadsheets right in your Telegram chat.
- **One-click data export**: Download results to Excel (.xlsx), CSV, JSON, or clean HTML reports.

### Installation

---

#### Method 1: Global PowerShell Setup on Windows (Recommended)

This lets you type `kiki` from any folder in PowerShell or Command Prompt.

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

3. Link the `kiki` command globally:
   ```powershell
   npm link
   ```

You can now type `kiki` from any folder on your computer.

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

3. One-step install and global command setup:
   ```bash
   bash setup-termux.sh
   ```
   *(Or simply run `./kiki start` — 7strokes will automatically install `kiki` and `kiwi` into your Termux `$PREFIX/bin` directory so you can type `kiki` or `kiwi` from any folder).*

4. Native Ngrok DNS on Android:
   7strokes automatically writes `~/.config/ngrok/ngrok.yml` configured with `dns_resolver_ips: [8.8.8.8, 1.1.1.1]` and `crl_noverify: true`. This instructs Ngrok v3 to query public DNS directly, solving Android's missing `/etc/resolv.conf` without needing root permissions, PRoot, or local proxy loops.

5. Start 7strokes from anywhere:
   ```bash
   kiki start
   ```

---

#### Method 3: Direct Clone on Linux or Mac

```bash
git clone https://github.com/Reinhart-py/DashMin.git 7strokes
cd 7strokes
cd backend && npm install && npm run build
cd ../frontend && npm install
cd ..
./kiki start
```

### PowerShell First-Time Setup Note

---

If Windows PowerShell displays an error like:
`File cannot be loaded because running scripts is disabled on this system`

This is a default Windows security setting. You can enable scripts for your user account by running this single command in PowerShell:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Press `Y` to confirm. After that, `kiki` and all PowerShell commands will run without restriction.

### Dependencies

---

- **Node.js**: Version 20 or newer ([Download Node.js](https://nodejs.org/))
- **Git**: For cloning the repository ([Download Git](https://git-scm.com/))

If you do not have PostgreSQL or Redis installed, 7strokes automatically uses its built-in SQLite database and internal queue.

### Usage

---

#### Interactive Menu Mode (Easiest for Beginners)

If you do not want to remember commands, simply type `kiki` in your terminal:

```powershell
kiki
```

An interactive control panel will open:

```text
======================================================
             7STROKES CONTROL PANEL (KIKI)        
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

You can also run any action directly by adding arguments to `kiki`:

```powershell
# Start the backend server and public tunnel together
kiki start

# Launch the interactive Telegram bot
kiki bot

# View database metrics (auto-detects mobile or desktop screen)
kiki db view

# Make a backup of the SQLite database
kiki db backup

# Restore a database from a backup file
kiki db restore backups/7strokes-backup-2026-10-07.sqlite

# Reconfigure your Ngrok token, custom domain, or Telegram bot credentials
kiki config
```

*(Note: `kiwi` is also supported as an alternate command name for `kiki`).*

### CLI Options

---

```text
Usage: kiki [command] [options]

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
| **Primary Phone** | Personal or direct mobile number |
| **Secondary Phone** | Office landline, toll-free, or alternate number |
| **Email** | Public business email address |
| **Website** | Official website link |
| **Street** | Street name, road, and building address |
| **City** | City or municipality |
| **State** | State, province, or emirate |
| **Country** | Country name |
| **Postal Code** | Postal or ZIP code |
| **Full Address** | Complete combined address |
| **Rating & Reviews** | Average star rating and total review count |
| **Opening Hours** | Operating schedule across the week |
| **Social Links** | Instagram, Facebook, LinkedIn, Twitter/X, YouTube |
| **Place ID & Coordinates** | Latitude, Longitude, and unique place identifier |

### Phone Classification and Address Separation

---

7strokes includes built-in intelligence for contact details:

1. **Phone Numbers**:
   - **Primary Phone**: Mobile and direct personal numbers are automatically detected and placed in the Primary Phone column.
   - **Secondary Phone**: Office numbers, landlines (such as Dubai `04`, Abu Dhabi `02`, toll-free `800`), and secondary lines are placed in the Secondary Phone column.
   - Numbers are deduplicated so the two columns never repeat the same number.

2. **Address Fields**:
   - Instead of combining everything into one messy line, exports provide separate columns for **Street**, **City**, **State**, **Country**, and **Postal Code**, alongside the full address.

### Telegram Bot (kiki bot)

---

You can control 7strokes directly from your Telegram app.

#### First-Time Setup:
Run:
```powershell
kiki bot
```

The setup wizard will ask you for:
1. **Bot Token**: Get a free token from [@BotFather](https://t.me/BotFather) on Telegram.
2. **Allowed Chat IDs**: Your Telegram account ID from [@userinfobot](https://t.me/userinfobot). Multiple IDs can be added separated by commas.

#### Telegram Remote Control Panel:
Send `/menu` or `/start` to your bot in Telegram to open the interactive control panel with tap-to-click inline buttons:
- **[Services Control]** — Manage backend, public link, frontend, and bridge services.
- **[Database & Backups]** — Download SQLite database file, create backups, or restore.
- **[Browse All Leads]** — View and flip through all saved leads page by page directly in chat with `[<< Prev]` and `[Next >>]` buttons.
- **[Search Jobs & Exports]** — Browse all historical searches with one-tap CSV download buttons for each job.
- **[Download All Leads CSV]** — Instant one-tap download of the complete CSV containing all leads in the database.
- **[Settings & Users]** — View configuration, ports, and allowed users.
- **[Start All]** / **[Stop All]** — Turn all services on or off with a single tap.
- **[Refresh Status]** — Update metrics and live service indicators.

#### Telegram Text Commands:
- `/menu` or `/start` — Open the interactive control panel with buttons.
- `/leads [page]` — Browse all saved leads in Telegram with pagination (e.g. `/leads 2`).
- `/export_all` — Download complete CSV export of all leads in the database.
- `/jobs [page]` — Browse all search jobs with pagination and one-tap export buttons.
- `/export <job_id>` — Download CSV file for a specific search job.
- `/status` — Live server metrics, memory, uptime, and total leads.
- `/start_all` | `/stop_all` | `/restart` — Start, stop, or restart all services remotely.
- `/start_backend` | `/stop_backend` — Start or stop backend.
- `/start_tunnel` | `/stop_tunnel` — Start or stop public link.
- `/start_frontend` | `/stop_frontend` — Start or stop frontend.
- `/link` — Get current live web dashboard link.
- `/get_db` — Download live `dashmin.sqlite` file to Telegram.
- `/get_config` — Download `.7strokes-config.json` configuration file.
- `/backup` — Create a database backup in `backups/`.
- `/search <target> [limit]` — Start lead search (e.g. `/search cafes in london 50`).
- `/config` — View current configuration.
- `/set_port <number>` — Change backend port.
- `/set_ngrok <token>` — Change ngrok authtoken.
- `/set_domain <domain>` — Change custom ngrok domain.
- `/set_tunnel <ngrok|cloudflared>` — Change tunnel provider.
- `/add_chat <id>` | `/remove_chat <id>` — Add or remove allowed Telegram users.
- `/help` — Show full command manual.

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

#### 1. View Database Stats (`kiki db view`)
```powershell
kiki db view
```
- **On Android / Termux**: Outputs a clean vertical list designed for mobile screens that will not wrap or break.
- **On Desktop**: Outputs wide tables with company breakdowns, manager counts, and recent searches.

#### 2. Backup Database (`kiki db backup`)
```powershell
kiki db backup
```
Saves a snapshot of your database in the `backups/` directory.

#### 3. Restore Database (`kiki db restore <file>`)
```powershell
kiki db restore backups/7strokes-backup-2026-10-07.sqlite
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
