# 7strokes Changelog

All notable changes, version upgrades, and development milestones for 7strokes are documented in this file.

---

## [v2.7.0] — New Listings Tracking, Place Suggestions, Radius & Map-Pin Search (Current)

### Added
- **New listings** page (Leads → New listings) for Google Maps and 2GIS:
  - *First seen in a period*: businesses found in the chosen dates (presets or custom range) that none of your earlier searches had, filtered by source and search text, with a per-day chart, "previously known" count and CSV export.
  - *Compare two extractions* (e.g. July vs November): new listings, listings no longer found, and listings in both.
- **Place suggestions** in the location box, like the Google Maps search dropdown (Google Maps + OpenStreetMap). Picking one pins the search to that exact place.
- **Radius around location**: choose 100 m – 10 km or a custom distance in metres or km; only businesses within that distance of the point are kept.
- **Pin on the map**: drag a pin (or click the map) and search the keyword within the chosen radius. Map preview with the radius circle also shown for radius searches.
- 2GIS listings now record their map position.

### Fixed
- SQLite `RETURNING` rows were rebuilt from the parameter list off by one column, so newly created jobs/users came back with shifted fields; the stored row is now read back (respecting the requested columns).

---

## [v2.6.0] — Exact vs Extended Location Search

### Added
- **Search area option** on Find Leads (single and bulk): *Exact location* keeps only businesses inside the typed place; *Extended area* also includes the surroundings (about 3 km around a building or street, the whole city for a city). The choice is saved on each extraction and shown on its card.
- Precise place lookup: the typed location is pinned via Google Maps first, then OpenStreetMap, and classified as a country, city, neighbourhood or single building.

### Fixed
- Searching a building such as "Regal Tower, Dubai" no longer sweeps the whole of Dubai: the location used to be matched to the city because the text ended in "Dubai".
- In Exact mode every lead is checked against the place: its address must name the building/area, or (when the address does not) its map pin must be within ~80 m of the building or inside the neighbourhood.
- 2GIS no longer writes the searched district in as a business's address when the listing has none.

---

## [v2.5.0] — True Unlimited Extraction, Data Accuracy & Responsive Leads Workspace

### Changed
- **Unlimited now means unlimited**: Google Maps searches first query every named area, then sweep the whole city (or every city of a country) with an adaptive map grid. Any cell that fills all result pages is split into four smaller cells and searched again, down to ~0.5 km, until no new businesses appear.
- **Exact lead limits**: numeric limits (presets or a custom amount) now stop at exactly that number instead of overshooting with parallel workers.
- **2GIS**: keeps paging each district until results run out in Unlimited mode, uses the user's proxy, and the city picker now actually controls which city is searched (it previously always searched Abu Dhabi).

### Fixed (data accuracy)
- Phone numbers are read only from the real phone fields; random digit runs (IDs, coordinates, timestamps) are no longer saved as phones.
- The same number in local and international form (`04 123 4567` / `+971 4 123 4567`) is no longer stored as both primary and secondary phone.
- Addresses use Google's full formatted address and structured components (street, city, postal code, state, country) with a smarter fallback for US/UK formats.
- Google redirect links are unwrapped to the real business website.
- Leads are de-duplicated by place ID, so separate branches of the same chain are kept instead of collapsed into one.
- Location parsing no longer treats ordinary words as cities ("pizza hut" no longer geocodes "hut"; "in" no longer matches "Berlin").

### Added
- Paginated, server-side searchable leads table (no more 1,000-row ceiling), with phone/website coverage stats.
- Job cards with live status, lead count, progress and per-job Stop.
- Mobile card layout for leads, sidebar backdrop, and responsive header/admin views.
- Paginated admin "All Leads" view.

---

## [v2.4.0] — ERPNext-Style Android Mobile UI & Universal Crisp Icon System

### Added
- **ERPNext-Style Persistent Bottom Navigation Bar**:
  - Pinned bottom navigation bar for Android and mobile screens with touch-friendly 44px tap targets.
  - Context-aware tabs: Search, Saved Leads with badge counter, Role Switcher (Admin / Company), Support, and Profile in App mode.
  - Admin mode tabs: Stats Overview, Users with count badge, Leads Database with global count, Lead App switch, and Menu drawer.
  - Safe area inset padding (`safe-bottom`) and bottom content clearance to prevent floating navigation overlays from hiding actions.
- **ERPNext Mobile Card Views for Records**:
  - Replaces wide desktop tables with clean touch cards on mobile screens for User Management, Global Leads Database, and Search Lead Inspector.
  - Mobile User Cards: Avatar with initial, Name, username handle, role badges, company/manager details, proxy toggle, and one-tap action buttons (Reset Password, Edit, Delete).
  - Mobile Lead Cards: Business title, category tags, star rating badges, direct click-to-call phone buttons (`tel:`), website links, and addresses.
  - Touch-friendly action buttons with consistent 44px height for effortless mobile tapping.
- **Universal SVG Icon System**:
  - Added dedicated crisp SVG icons across sidebar navigation, top app bar, mobile bottom bar, and card actions.
  - Replaced text-only navigation and buttons with consistent icons: Search, Leads, Users, Stats Overview, Settings, Shield, Phone, Globe, MapPin, Key, Edit, Trash, Plus, Check, Download, Filter, Sun, Moon, Help, and Menu.
- **Mobile Touch Enhancements**:
  - Disabled default tap highlight flicker on Android browsers.
  - Added mobile "Back to Searches" button when inspecting saved searches on smaller screens.
  - Responsive padding adjustments on Contact & Help page for small mobile viewports.

---

## [v2.3.0] — Kiki CLI, Phone Classifier, Structured Address Columns & Bot Reliability

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
