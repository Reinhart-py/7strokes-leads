# 7strokes Changelog

All notable changes, version upgrades, and development milestones for 7strokes are documented in this file.

---

## [v2.3.0] — Kiki CLI, Phone Classifier, Structured Address Columns & Bot Reliability (Current)

### Added
- **Universal CLI Renamed to `kiki`**:
  - `kiki` is now the primary global command with an interactive numbered menu (`[0-7]`) when run without arguments.
  - `fk` is preserved as a backward-compatible alias.
  - Added native `kiki.ps1`, `kiki.bat`, and `kiki` bash launchers.
- **Intelligent Phone Classification**:
  - Automatically sorts extracted numbers into Primary Phone (mobile/personal lines) and Secondary Phone (landlines, office numbers, toll-free lines).
  - Handles international prefix patterns across UAE, Saudi Arabia, UK, US, and India.
- **Dedicated Address Columns**:
  - Exports in CSV, Excel, and JSON now feature separate columns for `Street`, `City`, `State`, `Country`, `Postal Code`, and `Full Address`.
  - Added database migration to persist the `street` column.
- **Full Database Leads Browser & Complete CSV Export**:
  - Interactive Lead Browser: browse through all saved leads directly in chat page by page with `[<< Prev]` and `[Next >>]` navigation buttons, displaying business names, categories, phones, and addresses.
  - Paginated Search History: view and navigate through all historical search jobs rather than being limited to just 5.
  - Complete Leads CSV Export: download every single lead across the entire database in a single CSV file with one tap (`[Download All Leads CSV]` or `/export_all`).
- **Telegram Bot Remote Service Management & Inline Buttons**:
  - Full remote management parity: start and stop the backend, frontend (Next.js), public tunnel, and Android DNS bridge directly from Telegram.
  - Interactive Inline Keyboard: one-tap buttons to start/stop all services, toggle individual services, view DB stats, trigger backups, and refresh status.
  - Remote Configuration: update port, ngrok authtoken, custom domain, tunnel provider, or add/remove allowed users directly from chat.
  - Automatic fallback to plain text if Telegram rejects markdown formatting.
  - Error details sent directly to Telegram chat if any command or scraping task fails.
  - Startup optimization: existing configuration is used immediately without prompting unless explicitly reconfigured.
- **Native Android Ngrok DNS Resolver**:
  - Automatically writes `~/.config/ngrok/ngrok.yml` with `dns_resolver_ips: [8.8.8.8, 1.1.1.1]` and `crl_noverify: true`.
  - Completely fixes the Go resolver failure on Android (`read: connection refused` on `[::1]:53`) natively without requiring PRoot, root access, or local proxy loops.
- **Automatic Global `kiki` Registration on Android (Termux)**:
  - Added `setup-termux.sh` for one-command installation, build, and global PATH registration.
  - Automatically places executable wrapper scripts into Termux `$PREFIX/bin/kiki` and `$PREFIX/bin/fk` on initial run, making `kiki` immediately available globally across any directory without manual PATH configuration.

---

## [v2.2.0] — Universal CLI, Android Termux Support & Telegram Bot

### Added
- **Global PowerShell CLI (`fk`)**:
  - Registered `fk` as a universal command across Windows PowerShell, Linux, and Android Termux.
  - Automatically linked via `npm link` and user `PATH` environment variables.
  - Added native `fk.ps1`, `fk.bat`, and Unix `fk` bash wrapper.
- **Android / Termux Compatibility**:
  - Implemented built-in native Node.js DNS Bridge on `127.0.0.1:8888` using Android's native Bionic libc resolver (`dns.lookup` and `net.connect`).
  - Solves the Go DNS lookup error (`failed to dial ngrok server on [::1]:53: connection refused`) on non-rooted Android devices without needing PRoot or system modifications.
- **Telegram Bot Integration (`fk bot`)**:
  - Interactive bot with long polling via native HTTPS.
  - Interactive first-run setup asking for Bot Token and comma-separated allowed Chat IDs.
  - Direct scraping control via `/search <engine> <target> [cap]`.
  - Live server monitoring via `/status` and `/tunnel`.
  - Database overview via `/db` and `/jobs`.
  - Instant CSV lead export sent directly into chat via `/export <job_id>`.
  - Automatic broadcast alerts on server startup and job completion.
- **Database Management CLI (`fk db`)**:
  - `fk db view`: Automatically formats cleanly on mobile / Termux screens and wide tables on desktop.
  - `fk db backup`: Timestamped SQLite backup saved to `backups/`.
  - `fk db restore <file>`: Safe database restore with rollback protection.
- **Repository Organization**:
  - Renamed core repository folder to `7strokes`.

---

## [v2.1.0] — 3-Role RBAC & Company Isolation

### Added
- **3-Role Multi-Tenant Access**:
  - `admin`: Global administrator with complete visibility across all companies, managers, users, and leads.
  - `manager`: Company manager scoped strictly to their assigned company and subordinates (`manager_id`).
  - `user`: Standard sales representative with access to personal searches and exports.
- **Data & Team Isolation**:
  - Managers can only view, manage, and reset passwords for team members under their direct management.
  - Leads table filtering by company and manager.
- **Dedicated Monochrome Contact & Help Page (`/contact` & `/help`)**:
  - Standalone full page replacing popup modals.
  - Clean black-and-white theme (`#000000` / `#ffffff`).
  - Emoji-free reason selector.
  - Direct redirection to verified channels: WhatsApp, Telegram (`@kiri0507`), and Email.
- **System Settings & Security**:
  - Administrative toggle for public registration with complete UI button hiding when disabled.
  - Safe backend honeypot page for unauthorized root URL requests.
  - Real-time frontend server disconnect warning banner.

---

## [v2.0.0] — Dual Engine Architecture & Glassmorphic Dashboard

### Added
- **Dual Scraping Engines**:
  - **Google Maps**: Direct concurrent HTTP scraping with geographic coordinate grid sweeping.
  - **2GIS Catalog**: Fast HTTP catalog pagination covering UAE and GCC regions.
- **Database Engine Resilience**:
  - Automatic fallback to local SQLite (`dashmin.sqlite`) when PostgreSQL is offline.
  - Automatic fallback to in-process execution queue when Redis is offline.
- **Export Formats**:
  - Support for Excel (`.xlsx`), CSV, JSON, and standalone dark-mode HTML reports.
- **Theme-Aware Branding**:
  - High-contrast green logo for light theme and neon green logo for dark theme.
- **Tunnel & Cloudflare Integration**:
  - Integrated `ngrok-skip-browser-warning` headers for seamless tunnel access.

---

## [v1.0.0] — Initial Prototype

### Added
- Core lead extraction prototypes for Google Maps and 2GIS.
- Basic Electron and Playwright desktop automation scripts.
- SQLite database schema for business names, phones, categories, and addresses.
