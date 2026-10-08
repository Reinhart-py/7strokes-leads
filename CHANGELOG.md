# 7strokes Changelog

All notable changes, version upgrades, and development milestones for 7strokes are documented in this file.

---

## [v2.3.0] — Kiki CLI, Phone Classifier, Structured Address Columns & Bot Reliability (Current)

### Added
- **Universal CLI (`kiki` & `kiwi`)**:
  - `kiki` and `kiwi` are now the primary global commands with an interactive numbered menu (`[0-7]`) when run without arguments.
  - Removed old `fk` launchers and replaced with native `kiki` and `kiwi` scripts.
  - Added native `kiki.ps1`, `kiki.bat`, `kiwi.ps1`, `kiwi.bat`, and bash launchers.
- **2GIS High-Speed HTTP Scraper & Sub-District Grid Partitioning**:
  - Automatically breaks large cities into district grids (e.g. 25 major commercial districts for Dubai, Abu Dhabi, Sharjah, Riyadh, and GCC regions).
  - Bypasses 2GIS's 5-page / 60-result catalog cap to harvest hundreds or thousands of leads per search.
  - High concurrency (16 simultaneous HTTP workers) collecting 200+ leads in ~40 seconds with 89%+ phone numbers.
  - Direct unmasked phone number extraction from embedded JSON values, tel links, and bdo elements.
- **Unique Leads Only Filter & Clone Prevention**:
  - Added "Unique Leads Only" toggle filter to Admin & Manager database views so clones are completely filtered out.
  - Added Category and City dropdown filters in Admin and Manager leads table.
  - Guaranteed deduplicated CSV export in Telegram bot (`/export_all` and `[Download All Leads CSV]`).
- **Telegram Bot Remote Restart & Service Management**:
  - Added `[Restart All]` inline button and `/restart` / `/restart_all` commands to restart backend, public link, and frontend with live status reporting.
- **Android / Mobile Screen Optimization for Admin & Management**:
  - Added horizontal scroll protection and minimum width constraints to Users table and Breakdown tables so they display cleanly on Android screens without clipping.
  - Added scrollable modal constraints to user creation and profile dialogs so form inputs and buttons are never cut off by mobile on-screen keyboards.
- **Native Android Ngrok DNS Resolver**:
  - Automatically writes `~/.config/ngrok/ngrok.yml` with `dns_resolver_ips: [8.8.8.8, 1.1.1.1]` and `crl_noverify: true`.
  - Completely fixes the Go resolver failure on Android (`read: connection refused` on `[::1]:53`) natively without requiring PRoot, root access, or local proxy loops.
- **Automatic Global `kiki` & `kiwi` Registration on Android (Termux)**:
  - Added `setup-termux.sh` for one-command installation, build, and global PATH registration.
  - Automatically places executable wrapper scripts into Termux `$PREFIX/bin/kiki` and `$PREFIX/bin/kiwi` on initial run, making `kiki` and `kiwi` immediately available globally across any directory without manual PATH configuration.

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
