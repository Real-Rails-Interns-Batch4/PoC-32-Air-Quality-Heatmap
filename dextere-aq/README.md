# DEXTERE Air Quality Intelligence Terminal
## PoC v1.0 — OpenAQ Data Platform

> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · FastAPI · Pandas · OpenAQ v3

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    DEXTERE Terminal                      │
│                                                         │
│  ┌──────────────────────────┐  ┌────────────────────┐  │
│  │   Main Stage (70%)       │  │  Intelligence      │  │
│  │   SVG World Map          │  │  Sidebar (30%)     │  │
│  │   Station Bubbles        │  │  ─ Title & Metric  │  │
│  │   Zoom / Pan / Click     │  │  ─ Why It Matters  │  │
│  │   Country Bar Chart      │  │  ─ Rail Control    │  │
│  └──────────────────────────┘  │  ─ Data Status     │  │
│                                └────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
   Next.js API Routes             Intelligence Panel
   /api/locations  ─────────┐
   /api/latest               │
   /api/countries            │
                             ▼
                    OpenAQ v3 REST API
                    api.openaq.org
                             │
                    (Optional FastAPI layer)
                    backend/main.py
                    Pandas risk scoring
```

---

## Quick Start

### Frontend (Next.js)

```bash
cd dextere-aq
npm install
npm run dev
# → http://localhost:3000
```

### Backend (FastAPI — Optional, for advanced pipeline)

```bash
cd dextere-aq/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# → http://localhost:8000/docs
```

---

## Environment Variables

No API key required for OpenAQ (open access).

```env
# .env.local (optional)
NEXT_PUBLIC_APP_NAME=DEXTERE AQ Terminal
```

---

## Key Features

| Feature | Implementation |
|---|---|
| Live station map | SVG dot map w/ pan/zoom |
| Risk scoring | Composite 0–100 score |
| AQI calculation | US EPA PM2.5 breakpoints |
| Data freshness | Live / Recent / Stale classification |
| Country ranking | Pandas groupby aggregation |
| CSV export | Full enriched dataset download |
| Filter system | Country, status, type filters |

---

## API Endpoints

### Next.js Proxy Routes
| Route | Description |
|---|---|
| `GET /api/locations` | Enriched station list |
| `GET /api/latest?locationId=` | Latest readings |
| `GET /api/countries` | Countries index |

### FastAPI Backend (port 8000)
| Route | Description |
|---|---|
| `GET /api/locations` | Pandas-enriched locations |
| `GET /api/country-stats` | Aggregated country metrics |
| `GET /api/export/csv` | Download enriched CSV |
| `GET /api/aqi-score?pm25=` | AQI calculator |
| `GET /api/latest/{id}` | Station latest readings |
| `GET /health` | Service health check |

---

## DEXTERE Brand Compliance

- ✅ Background: `#030712` (Obsidian Black)
- ✅ Surface: `#0B1117` (Deep Navy Grey)
- ✅ Accent Primary: `#38BDF8` (Electric Cyan)
- ✅ Accent Secondary: `#818CF8` (Indigo)
- ✅ Borders: `#1F2937` 1px
- ✅ Glassmorphism cards
- ✅ 0.5px cyan glow on active elements
- ✅ 70/30 split layout
- ✅ All 4 sidebar sections populated
- ✅ Download Sample Data CTA

---

## Data Source

All data is live from **OpenAQ v3** — a non-profit open air quality platform aggregating data from government agencies, research institutions, and citizen science networks globally.

License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
