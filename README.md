# Air Quality Intelligence Terminal

## PoC v1.0 - Global Air Quality Monitor Network

An intelligence dashboard for exploring global air-quality monitoring stations from OpenAQ v3.

The app uses a FastAPI-first architecture: the browser never calls OpenAQ directly for air-quality data. Next.js renders the dashboard, while FastAPI owns upstream data access, API-key injection, filtering, pagination, Pandas processing, risk scoring, and country aggregation.

## Live Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Visualization | Custom SVG world map, Recharts |
| Backend | Python FastAPI, Pandas |
| Data Source | OpenAQ v3 REST API |
| Styling | Obsidian / Cyan / Indigo design system |

## Architecture

```txt
Browser
  |
  |-- Next.js dashboard
  |     |-- /dashboard
  |     |-- map, filters, chart, sidebar
  |
  `-- FastAPI backend on port 8000
        |-- /api/bootstrap
        |-- /api/locations
        |-- /api/countries
        |-- /api/country-stats/master
        |
        `-- OpenAQ v3 API
```

The frontend depends on FastAPI APIs only for air-quality data. The only browser-side external fetch is the Natural Earth world map topology from jsDelivr, which is a visual map asset and not part of the OpenAQ data pipeline.

## Project Structure

```txt
POC/
|-- README.md
`-- air-quality-poc/
    |-- frontend/
    |   |-- app/
    |   |   |-- dashboard/page.tsx       # Main dashboard UI
    |   |   |-- globals.css              # Design tokens and global styles
    |   |   |-- layout.tsx               # Root layout
    |   |   `-- page.tsx                 # Redirects to /dashboard
    |   |-- components/
    |   |   |-- AQWorldMap.tsx           # SVG world map and station plotting
    |   |   |-- CountryChart.tsx         # Recharts country distribution chart
    |   |   |-- AppHeader.tsx            # Top navigation/status bar
    |   |   |-- FilterBar.tsx            # Search/filter/country controls
    |   |   `-- IntelligenceSidebar.tsx  # Intelligence panel
    |   |-- lib/
    |   |   `-- aqUtils.ts               # Shared frontend utilities
    |   |-- .env.example
    |   |-- package.json
    |   |-- next.config.js
    |   |-- tailwind.config.js
    |   `-- tsconfig.json
    |-- backend/
    |   |-- main.py                      # FastAPI service and Pandas pipeline
    |   `-- requirements.txt             # Python dependencies
    |-- .gitignore
    `-- README.md
```

## Docker Deployment (Production-Ready)

You can spin up the entire stack (Frontend + Backend) using Docker and Docker Compose. This is the recommended method for production-like environments.

### 1. Configure Environment

Create a `.env` file in the `air-quality-poc/` directory (or use the root `.env` if provided):

```env
OPENAQ_API_KEY=your_actual_api_key_here
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
ALLOWED_ORIGINS=http://localhost:3000
```

### 2. Build and Run

From the `air-quality-poc/` directory:

```bash
docker-compose up --build
```

The services will be available at:
- **Frontend:** `http://localhost:3000`
- **Backend:** `http://localhost:8000`

### Docker Architecture

- **Multi-Stage Frontend:** Uses a lightweight `node:20-alpine` image. Assets are built in the first stage and served in the second to minimize image size.
- **FastAPI Backend:** Uses `python:3.11-slim` with all dependencies pre-installed.
- **Orchestration:** `docker-compose.yml` manages service networking and environment variable injection.

## Prerequisites

| Tool | Recommended Version |
|---|---|
| Node.js | 18.x or 20.x |
| npm | 9+ |
| Python | 3.10, 3.11, or 3.12 |
| Git | Any current version |

Python 3.13+ may require extra care with scientific Python packages on Windows. Python 3.11 or 3.12 is the safest choice for Pandas wheels.

## 1. Clone

```bash
git clone https://github.com/Eternal66-6/POC.git
cd POC/air-quality-poc
```

## 2. Configure OpenAQ

OpenAQ v3 requires a free API key.

1. Register at https://explore.openaq.org/register
2. Copy your API key.
3. Create `frontend/.env.local`:

```env
OPENAQ_API_KEY=your_actual_api_key_here
```

Keep `.env.local` beside `frontend/package.json`.

## 3. Install Dependencies

Frontend:

```bash
cd frontend
npm install
```

Backend:

```bash
cd ..   # back to air-quality-poc/
python -m venv ../airenv
../airenv/Scripts/python.exe -m pip install -r backend/requirements.txt --prefer-binary
```

On macOS/Linux, use:

```bash
python -m venv ../airenv
../airenv/bin/python -m pip install -r backend/requirements.txt --prefer-binary
```

## 4. Run Locally

Start FastAPI first (from `air-quality-poc/`):

```bash
../airenv/Scripts/uvicorn.exe backend.main:app --reload --host 127.0.0.1 --port 8000
```

Then start Next.js in a second terminal (from `air-quality-poc/frontend/`):

```bash
cd frontend
npm run dev
```

Open:

```txt
http://localhost:3000/dashboard
```

If port `3000` is busy, Next.js may choose another port such as `3006`. The backend currently allows local frontend origins on `3000` and `3006`.

## Frontend Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run Next lint setup/checks |

Run these from the `frontend/` directory.

## FastAPI Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/bootstrap` | Startup payload for countries and chart metadata |
| GET | `/api/countries` | Country dropdown data |
| GET | `/api/country-stats/master` | Country stats endpoint |
| GET | `/api/locations` | Paginated, enriched station chunks |

Example:

```txt
http://127.0.0.1:8000/api/locations?limit=500&page=1
```

API docs:

```txt
http://127.0.0.1:8000/docs
```

## Data Flow

1. The dashboard calls FastAPI `/api/bootstrap` for startup data.
2. The dashboard calls FastAPI `/api/locations` for paginated station chunks.
3. FastAPI calls OpenAQ using the server-side `OPENAQ_API_KEY`.
4. FastAPI normalizes locations with Pandas, calculates staleness and risk score, filters/searches data, and returns UI-ready JSON.
5. The frontend renders the map, chart, filters, and intelligence sidebar from backend responses.

## Pagination And Performance

The app uses chunked loading instead of loading the full global station dataset at once.

| Setting | Value |
|---|---|
| Default dashboard chunk | 500 locations |
| Backend maximum chunk | 1000 locations |
| Loading model | Manual progressive pagination |
| UI control | `Fetch Next Chunk Layer` |

This is better for the current map-first UI than viewport-based loading because the primary view is global rather than a scrollable list. Chunks keep startup fast while still allowing the user to progressively load more stations.

OpenAQ may return fuzzy totals such as `>500` instead of exact global counts. When that happens, the UI shows loaded records and whether more chunks are available rather than inventing a total.

## Key Features

| Feature | How it works |
|---|---|
| World map | SVG equirectangular projection with Natural Earth topology |
| Station dots | Colored by freshness: live, recent, stale |
| Risk score | Backend composite 0-100 score |
| Country chart | Backend country aggregation from the loaded chunk |
| Filters | Backend search, live-only, monitor-only, country filter |
| Progressive loading | Backend pagination with append-on-load UI |
| CSV export | Frontend export of currently loaded enriched records |
| Sidebar | Intelligence, context, ownership, and data source status |

## Verification

After starting both servers, check:

| URL | Expected |
|---|---|
| `http://127.0.0.1:8000/docs` | FastAPI docs |
| `http://127.0.0.1:8000/api/bootstrap` | Country/startup JSON |
| `http://127.0.0.1:8000/api/locations?limit=500&page=1` | Enriched station chunk |
| `http://localhost:3000/dashboard` | Dashboard with map and chart |

## Common Errors

### `401` from OpenAQ

Your API key is missing or not loaded.

- Confirm `frontend/.env.local` exists.
- Confirm it contains `OPENAQ_API_KEY=...`.
- Restart the FastAPI backend after changing the file.

### Dashboard shows API pipeline disconnected

FastAPI is not running or the frontend cannot reach it.

- Start backend on `127.0.0.1:8000`.
- Check `http://127.0.0.1:8000/docs`.
- Restart the frontend after backend changes.

### Bar chart does not appear

The first `/api/locations` chunk did not load or returned no country aggregates.

- Check `http://127.0.0.1:8000/api/locations?limit=500&page=1`.
- Confirm the response has `results` and `countryStats`.

### Map shows dots but no land

The world map topology is loaded from jsDelivr:

```txt
https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json
```

Check browser/network access to that CDN.

### Pandas install error on Windows

Use Python 3.11 or 3.12 and install with binary wheels:

```bash
python -m pip install -r backend/requirements.txt --prefer-binary
```

## Design Tokens

| Token | Value |
|---|---|
| Background | `#030712` |
| Surface | `#0B1117` |
| Accent primary | `#38BDF8` |
| Accent secondary | `#818CF8` |
| Border | `#1F2937` |
| Layout | 70/30 main stage and intelligence sidebar |

## Data Source

Air-quality data comes from OpenAQ v3.

- OpenAQ: https://openaq.org
- API docs: https://docs.openaq.org
- License: https://creativecommons.org/licenses/by/4.0/
- Map topology: https://github.com/topojson/world-atlas
