# DEXTERE Air Quality Intelligence Terminal
### PoC v1.0 — Global Air Quality Monitor Network

> A high-end Fintech-style intelligence dashboard built on the **OpenAQ v3 API**, visualising global air quality monitoring stations in real time.
> Built under the **DEXTERE Brand DNA** and **Claude Protocol** standards.

---

## Live Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) · TypeScript · Tailwind CSS |
| Visualization | Custom SVG World Map · Recharts |
| Backend | Python FastAPI · Pandas |
| Data Source | OpenAQ v3 REST API (open, free) |
| Styling | DEXTERE Design System — Obsidian / Cyan / Indigo palette |

---

## Project Structure

```
POC/
└── dextere-aq/
    ├── app/
    │   ├── api/
    │   │   ├── countries/route.ts     # Proxy → OpenAQ /v3/countries
    │   │   ├── latest/route.ts        # Proxy → OpenAQ /v3/locations/:id/latest
    │   │   ├── locations/route.ts     # Proxy → OpenAQ /v3/locations
    │   │   └── debug/route.ts         # Dev: confirms env var is loaded
    │   ├── dashboard/
    │   │   └── page.tsx               # Main dashboard (70/30 layout)
    │   ├── globals.css                # DEXTERE design tokens + glassmorphism
    │   └── layout.tsx                 # Root layout + Inter font
    ├── backend/
    │   ├── main.py                    # FastAPI service (Pandas risk pipeline)
    │   └── requirements.txt           # Python dependencies
    ├── components/
    │   ├── AQWorldMap.tsx             # SVG world map + TopoJSON overlay
    │   ├── CountryChart.tsx           # Recharts bar chart
    │   ├── DextereHeader.tsx          # Top navigation bar
    │   ├── FilterBar.tsx              # Search / filter / country controls
    │   └── IntelligenceSidebar.tsx    # 30% sidebar (4 sections)
    ├── lib/
    │   └── aqUtils.ts                 # Risk scoring, AQI calc, CSV export
    ├── .env.local                     # Your API key (not committed)
    ├── next.config.js
    ├── package.json
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## Prerequisites

Before running anything, make sure you have:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18.x or 20.x | https://nodejs.org |
| npm | 9+ (bundled with Node) | — |
| Python | 3.10, 3.11, or 3.12 | https://python.org |
| pip | Latest | bundled with Python |
| Git | Any | https://git-scm.com |

> ⚠️ **Python 3.13 is not recommended** — pandas prebuilt wheels are not yet widely available for it on Windows. Use 3.11 or 3.12.

---

## 1. Clone the Repository

```bash
git clone https://github.com/Eternal66-6/POC.git
cd POC/dextere-aq
```

---

## 2. Get Your OpenAQ API Key

OpenAQ v3 requires a free API key.

1. Go to [https://explore.openaq.org/register](https://explore.openaq.org/register)
2. Sign up (free, instant, no payment needed)
3. Copy your API key from your account dashboard

---

## 3. Configure Environment

Create a file called `.env.local` in the `dextere-aq/` folder (same level as `package.json`):

```
OPENAQ_API_KEY=your_actual_api_key_here
```

> No quotes. No spaces around `=`. Just the key.

Verify the file is in the right place:
```
dextere-aq/
├── .env.local        ← HERE
├── package.json
├── next.config.js
└── ...
```

---

## 4. Run the Frontend (Next.js)

```bash
# From inside dextere-aq/
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Frontend npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint check |

### Frontend Dependencies

```json
{
  "next": "14.2.5",
  "react": "^18",
  "react-dom": "^18",
  "recharts": "^2.12.7",
  "lucide-react": "^0.383.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.4.0"
}
```

Dev dependencies: `typescript`, `tailwindcss`, `autoprefixer`, `postcss`, `eslint`, `@types/*`

---

## 5. Run the Backend (FastAPI) — Optional

The frontend has built-in Next.js API routes that proxy to OpenAQ directly. The FastAPI backend is an **optional advanced data pipeline** that adds Pandas-based risk scoring and CSV export streaming.

```bash
# From inside dextere-aq/backend/
pip install -r requirements.txt --prefer-binary
uvicorn main:app --reload --port 8000
```

API docs available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### Backend Dependencies (`requirements.txt`)

```
fastapi==0.111.0
uvicorn[standard]==0.30.1
httpx==0.27.0
pandas>=2.0.0
numpy>=1.24.0
python-dotenv==1.0.1
```

> Use `--prefer-binary` flag to avoid compiling pandas from source on Windows.

### Backend API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/health` | Service health check |
| GET | `/api/locations` | Enriched station list with risk scores |
| GET | `/api/country-stats` | Pandas groupby country aggregation |
| GET | `/api/export/csv` | Download enriched dataset as CSV |
| GET | `/api/aqi-score?pm25=` | Calculate US EPA AQI from PM2.5 value |
| GET | `/api/latest/{location_id}` | Latest readings for a specific station |

---

## 6. Verify Everything is Working

After `npm run dev`, visit these URLs to confirm:

| URL | Expected |
|---|---|
| `http://localhost:3000` | Dashboard with world map |
| `http://localhost:3000/api/debug` | `{"hasKey":true,"keyLength":64,...}` |
| `http://localhost:3000/api/locations` | JSON with station data |
| `http://localhost:3000/api/countries` | JSON with country list |

---

## Common Errors & Fixes

### `API error 401`
Your API key is missing or not loaded.
- Check `.env.local` exists in `dextere-aq/` (not in a subfolder)
- Confirm contents: `OPENAQ_API_KEY=your_key` (no quotes)
- **Restart** the dev server — Next.js only reads `.env.local` on cold start

```bash
# Stop server, then:
npm run dev
```

### `API error 422`
Invalid query parameters sent to OpenAQ.
- Already fixed in current codebase — delete `.next` cache and restart:
```bash
rmdir /s /q .next    # Windows
# or
rm -rf .next         # Mac/Linux
npm run dev
```

### `API error 404`
Stale Next.js build cache.
```bash
rmdir /s /q .next
npm run dev
```

### Pandas install error on Windows (`subprocess-exited-with-error`)
```bash
pip install pandas --prefer-binary
pip install -r requirements.txt --prefer-binary
```
Or switch to Python 3.11/3.12 which has prebuilt wheels.

### Map shows no land / just dots
The world map loads Natural Earth TopoJSON from jsDelivr CDN on first render. Check your internet connection — the browser needs access to `cdn.jsdelivr.net`.

---

## Architecture

```
Browser
  │
  ├── Next.js Frontend (port 3000)
  │     ├── /dashboard          → Main 70/30 split UI
  │     ├── /api/locations      → Server-side proxy to OpenAQ
  │     ├── /api/countries      → Server-side proxy to OpenAQ
  │     └── /api/latest         → Server-side proxy to OpenAQ
  │                                        │
  │                               OpenAQ v3 API
  │                           (api.openaq.org)
  │
  └── FastAPI Backend (port 8000) — optional
        ├── Pandas risk scoring pipeline
        ├── Country aggregation (groupby)
        └── CSV streaming export
```

The Next.js API routes act as a **server-side proxy** — your `OPENAQ_API_KEY` is injected server-side via `X-API-Key` header and never exposed to the browser.

---

## Key Features

| Feature | How it works |
|---|---|
| **World Map** | SVG equirectangular projection + Natural Earth 110m TopoJSON (fetched from CDN) |
| **Station Dots** | Cyan = Live (<1hr), Indigo = Recent (<24hr), Slate = Stale |
| **Risk Score** | Composite 0–100: param diversity (40%) + recency (30%) + monitor quality (30%) |
| **AQI Calculation** | US EPA PM2.5 linear interpolation across 6 breakpoints |
| **Country Ranking** | Pandas `groupby` aggregation (mirrored in TypeScript for frontend) |
| **CSV Export** | Full enriched dataset with risk labels, staleness, coordinates |
| **Zoom / Pan** | SVG viewBox manipulation — scroll to zoom, drag to pan |
| **Filter System** | Live-only, Reference Monitor, Country dropdown, text search |
| **4-Section Sidebar** | Intelligence Panel · Why This Matters · Who Controls the Rail · Data Status |

---

## DEXTERE Brand Compliance

| Token | Value |
|---|---|
| Background | `#030712` Obsidian Black |
| Surface / Cards | `#0B1117` Deep Navy Grey |
| Accent Primary | `#38BDF8` Electric Cyan |
| Accent Secondary | `#818CF8` Indigo |
| Borders | `#1F2937` 1px |
| Typography | Inter (tight letter-spacing `-0.03em`) |
| Cards | Glassmorphism `backdrop-filter: blur(12px)` |
| Layout | 70% Main Stage / 30% Intelligence Sidebar |

---

## Data Source

All data is live from **[OpenAQ](https://openaq.org)** — a non-profit open air quality platform aggregating real-time data from government monitoring agencies, research institutions, and citizen science networks worldwide.

- License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- API Docs: [https://docs.openaq.org](https://docs.openaq.org)
- World Map: Natural Earth 110m via [world-atlas@2](https://github.com/topojson/world-atlas) (jsDelivr CDN)

---

## Built With

- [DEXTERE Capital](https://dexteracapital.co) Brand DNA & Claude Protocol
- [Anthropic Claude](https://claude.ai) — AI-assisted full-stack generation
- [OpenAQ](https://openaq.org) — Open air quality data
- [Natural Earth](https://www.naturalearthdata.com) — Map data
